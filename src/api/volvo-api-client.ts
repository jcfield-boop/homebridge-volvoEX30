import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from 'homebridge';
import NodeCache from 'node-cache';
import { VolvoApiConfig, OAuthTokens } from '../types/config';
import { EnergyState, Capabilities, ErrorResponse, DetailedErrorResponse } from '../types/energy-api';
import { OAuthHandler } from '../auth/oauth-handler';

export class VolvoApiClient {
  private readonly httpClient: AxiosInstance;
  private readonly oAuthHandler: OAuthHandler;
  private readonly cache: NodeCache;
  private readonly rateLimiter: Map<string, number> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 100;

  constructor(
    private readonly config: VolvoApiConfig,
    private readonly vccApiKey: string,
    private readonly logger: Logger,
  ) {
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'vcc-api-key': vccApiKey,
      },
    });

    this.oAuthHandler = new OAuthHandler(config, logger);
    this.cache = new NodeCache({ stdTTL: 300 });

    this.setupRequestInterceptors();
    this.setupResponseInterceptors();
  }

  private setupRequestInterceptors(): void {
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (!this.checkRateLimit()) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }

        try {
          const accessToken = await this.oAuthHandler.getValidAccessToken();
          config.headers.Authorization = `Bearer ${accessToken}`;
        } catch (error) {
          this.logger.error('Failed to get valid access token:', error);
          throw error;
        }

        const operationId = this.generateOperationId();
        config.headers['vcc-api-operationid'] = operationId;

        this.updateRateLimit();

        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );
  }

  private setupResponseInterceptors(): void {
    this.httpClient.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.logger.warn('Received 401, attempting to refresh token');
          try {
            const tokens = this.oAuthHandler.getTokens();
            if (tokens?.refreshToken) {
              await this.oAuthHandler.refreshAccessToken(tokens.refreshToken);
              return this.httpClient.request(error.config!);
            }
          } catch (refreshError) {
            this.logger.error('Token refresh failed:', refreshError);
          }
        }

        this.handleApiError(error);
        return Promise.reject(error);
      },
    );
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    for (const [timestamp] of this.rateLimiter) {
      if (parseInt(timestamp) < oneMinuteAgo) {
        this.rateLimiter.delete(timestamp);
      }
    }

    return this.rateLimiter.size < this.MAX_REQUESTS_PER_MINUTE;
  }

  private updateRateLimit(): void {
    this.rateLimiter.set(Date.now().toString(), 1);
  }

  private generateOperationId(): string {
    return `homebridge-volvo-ex30-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private handleApiError(error: AxiosError): void {
    if (error.response?.data) {
      const errorData = error.response.data as ErrorResponse | DetailedErrorResponse;
      this.logger.error(`Volvo API Error [${error.response.status}]:`, errorData.error.message);
      
      if ('details' in errorData.error && errorData.error.details) {
        for (const detail of errorData.error.details) {
          this.logger.error(`  - ${detail.code}: ${detail.message}`);
        }
      }
    } else {
      this.logger.error('Network or unknown error:', error.message);
    }
  }

  async getCapabilities(vin: string): Promise<Capabilities> {
    const cacheKey = `capabilities_${vin}`;
    const cached = this.cache.get<Capabilities>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached capabilities');
      return cached;
    }

    try {
      this.logger.debug(`Getting capabilities for VIN: ${vin}`);
      const response = await this.httpClient.get<Capabilities>(`/energy/v2/vehicles/${vin}/capabilities`);
      
      this.cache.set(cacheKey, response.data, 3600);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get capabilities:', error);
      throw error;
    }
  }

  async getEnergyState(vin: string): Promise<EnergyState> {
    const cacheKey = `energy_state_${vin}`;
    const cached = this.cache.get<EnergyState>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached energy state');
      return cached;
    }

    try {
      this.logger.debug(`Getting energy state for VIN: ${vin}`);
      const response = await this.httpClient.get<EnergyState>(`/energy/v2/vehicles/${vin}/state`);
      
      this.cache.set(cacheKey, response.data, 60);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get energy state:', error);
      throw error;
    }
  }

  getOAuthHandler(): OAuthHandler {
    return this.oAuthHandler;
  }

  setTokens(tokens: OAuthTokens): void {
    this.oAuthHandler.setTokens(tokens);
  }

  isAuthenticated(): boolean {
    return this.oAuthHandler.isAuthenticated();
  }

  clearCache(): void {
    this.cache.flushAll();
  }
}