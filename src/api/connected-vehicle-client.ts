import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from 'homebridge';
import NodeCache from 'node-cache';
import { VolvoApiConfig } from '../types/config';
import { OAuthHandler } from '../auth/oauth-handler';
import {
  VehicleListResponse,
  VehicleDetails,
  DoorsResponse,
  WindowsResponse,
  OdometerResponse,
  DiagnosticsResponse,
  StatisticsResponse,
  TyrePressureResponse,
  WarningsResponse,
  EngineStatusResponse,
  EngineDiagnosticsResponse,
  FuelResponse,
  BrakeStatusResponse,
  CommandListResponse,
  CommandAccessibilityResponse,
  CommandInvokeResponse,
  UnlockCommandResponse,
  ConnectedVehicleState,
  CVApiErrorResponse,
  CommandType,
  EngineStartRequest,
  ClimatizationRequest,
  LockUnlockRequest,
  HonkFlashRequest
} from '../types/connected-vehicle-api';

export class ConnectedVehicleClient {
  private readonly httpClient: AxiosInstance;
  private readonly oAuthHandler: OAuthHandler;
  private readonly cache: NodeCache;
  private readonly rateLimiter: Map<string, number> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 100;
  private readonly COMMAND_RATE_LIMIT = 10; // Commands are more limited

  constructor(
    private readonly config: VolvoApiConfig,
    private readonly vccApiKey: string,
    private readonly logger: Logger,
    private readonly vin?: string,
    private readonly homebridgeStorageDir?: string,
  ) {
    this.httpClient = axios.create({
      baseURL: 'https://api.volvocars.com/connected-vehicle/v2',
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'vcc-api-key': vccApiKey,
      },
    });

    this.oAuthHandler = new OAuthHandler(config, logger, vin, homebridgeStorageDir);
    this.cache = new NodeCache({ 
      stdTTL: 300, // 5 minutes default cache
      checkperiod: 60 // Check for expired keys every minute
    });

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
          const accessToken = await this.oAuthHandler.getValidAccessToken(this.config.refreshToken);
          config.headers.Authorization = `Bearer ${accessToken}`;
        } catch (error) {
          this.logger.error('Failed to get valid access token:', error);
          
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('invalid or expired')) {
            this.logger.error('');
            this.logger.error('🔑 Your refresh token appears to be invalid or expired.');
            this.logger.error('   Please use the Homebridge UI to re-authorize or generate a new token.');
            this.logger.error('');
          }
          
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

        this.handleApiError(error as AxiosError<CVApiErrorResponse>);
        return Promise.reject(error);
      },
    );
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old entries
    for (const [timestamp] of this.rateLimiter.entries()) {
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

  private handleApiError(error: AxiosError<CVApiErrorResponse>): void {
    const status = error.response?.status;
    const errorData = error.response?.data;

    if (status === 429) {
      this.logger.warn('Rate limit exceeded. The plugin will automatically retry after the limit resets.');
    } else if (status === 403) {
      this.logger.error('Access forbidden. Check your VCC API Key and OAuth scopes.');
    } else if (status === 404) {
      this.logger.warn('Endpoint not found or vehicle not accessible.');
    } else if (errorData?.error) {
      this.logger.error(`API Error: ${errorData.error.message}`);
      if (errorData.error.description) {
        this.logger.error(`Description: ${errorData.error.description}`);
      }
    } else {
      this.logger.error(`Unexpected API error: ${error.message}`);
    }
  }

  // Cache management
  clearCache(): void {
    this.cache.flushAll();
    this.logger.debug('Cleared Connected Vehicle API cache');
  }

  private getCacheKey(endpoint: string, vin?: string): string {
    return `cv_api_${endpoint}_${vin || 'global'}`;
  }

  // Vehicle Information Methods
  async getVehicleList(): Promise<VehicleListResponse> {
    const cacheKey = this.getCacheKey('vehicles');
    const cached = this.cache.get<VehicleListResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached vehicle list');
      return cached;
    }

    try {
      const response = await this.httpClient.get<VehicleListResponse>('/vehicles');
      this.cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get vehicle list:', error);
      throw error;
    }
  }

  async getVehicleDetails(vin: string): Promise<VehicleDetails> {
    const cacheKey = this.getCacheKey('details', vin);
    const cached = this.cache.get<VehicleDetails>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached vehicle details');
      return cached;
    }

    try {
      const response = await this.httpClient.get<VehicleDetails>(`/vehicles/${vin}`);
      this.cache.set(cacheKey, response.data, 3600); // Cache for 1 hour (vehicle details don't change often)
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get vehicle details for ${vin}:`, error);
      throw error;
    }
  }

  // Status Methods
  async getDoorsStatus(vin: string): Promise<DoorsResponse> {
    const cacheKey = this.getCacheKey('doors', vin);
    const cached = this.cache.get<DoorsResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached doors status');
      return cached;
    }

    try {
      const response = await this.httpClient.get<DoorsResponse>(`/vehicles/${vin}/doors`);
      this.cache.set(cacheKey, response.data, 60); // Cache for 1 minute (doors change frequently)
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get doors status for ${vin}:`, error);
      throw error;
    }
  }

  async getWindowsStatus(vin: string): Promise<WindowsResponse> {
    const cacheKey = this.getCacheKey('windows', vin);
    const cached = this.cache.get<WindowsResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached windows status');
      return cached;
    }

    try {
      const response = await this.httpClient.get<WindowsResponse>(`/vehicles/${vin}/windows`);
      this.cache.set(cacheKey, response.data, 60); // Cache for 1 minute
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get windows status for ${vin}:`, error);
      throw error;
    }
  }

  async getOdometer(vin: string): Promise<OdometerResponse> {
    const cacheKey = this.getCacheKey('odometer', vin);
    const cached = this.cache.get<OdometerResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached odometer reading');
      return cached;
    }

    try {
      const response = await this.httpClient.get<OdometerResponse>(`/vehicles/${vin}/odometer`);
      this.cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get odometer for ${vin}:`, error);
      throw error;
    }
  }

  async getDiagnostics(vin: string): Promise<DiagnosticsResponse> {
    const cacheKey = this.getCacheKey('diagnostics', vin);
    const cached = this.cache.get<DiagnosticsResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached diagnostics');
      return cached;
    }

    try {
      const response = await this.httpClient.get<DiagnosticsResponse>(`/vehicles/${vin}/diagnostics`);
      this.cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get diagnostics for ${vin}:`, error);
      throw error;
    }
  }

  async getStatistics(vin: string): Promise<StatisticsResponse> {
    const cacheKey = this.getCacheKey('statistics', vin);
    const cached = this.cache.get<StatisticsResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached statistics');
      return cached;
    }

    try {
      const response = await this.httpClient.get<StatisticsResponse>(`/vehicles/${vin}/statistics`);
      this.cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get statistics for ${vin}:`, error);
      throw error;
    }
  }

  async getTyrePressure(vin: string): Promise<TyrePressureResponse> {
    const cacheKey = this.getCacheKey('tyres', vin);
    const cached = this.cache.get<TyrePressureResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached tyre pressure');
      return cached;
    }

    try {
      const response = await this.httpClient.get<TyrePressureResponse>(`/vehicles/${vin}/tyres`);
      this.cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get tyre pressure for ${vin}:`, error);
      throw error;
    }
  }

  async getWarnings(vin: string): Promise<WarningsResponse> {
    const cacheKey = this.getCacheKey('warnings', vin);
    const cached = this.cache.get<WarningsResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached warnings');
      return cached;
    }

    try {
      const response = await this.httpClient.get<WarningsResponse>(`/vehicles/${vin}/warnings`);
      this.cache.set(cacheKey, response.data, 180); // Cache for 3 minutes (warnings can change)
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get warnings for ${vin}:`, error);
      throw error;
    }
  }

  async getEngineStatus(vin: string): Promise<EngineStatusResponse> {
    const cacheKey = this.getCacheKey('engine_status', vin);
    const cached = this.cache.get<EngineStatusResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached engine status');
      return cached;
    }

    try {
      const response = await this.httpClient.get<EngineStatusResponse>(`/vehicles/${vin}/engine-status`);
      this.cache.set(cacheKey, response.data, 60); // Cache for 1 minute
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get engine status for ${vin}:`, error);
      throw error;
    }
  }

  async getEngineDiagnostics(vin: string): Promise<EngineDiagnosticsResponse> {
    const cacheKey = this.getCacheKey('engine_diagnostics', vin);
    const cached = this.cache.get<EngineDiagnosticsResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached engine diagnostics');
      return cached;
    }

    try {
      const response = await this.httpClient.get<EngineDiagnosticsResponse>(`/vehicles/${vin}/engine`);
      this.cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get engine diagnostics for ${vin}:`, error);
      throw error;
    }
  }

  async getFuelStatus(vin: string): Promise<FuelResponse> {
    const cacheKey = this.getCacheKey('fuel', vin);
    const cached = this.cache.get<FuelResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached fuel status');
      return cached;
    }

    try {
      const response = await this.httpClient.get<FuelResponse>(`/vehicles/${vin}/fuel`);
      this.cache.set(cacheKey, response.data, 60); // Cache for 1 minute (battery level changes frequently)
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get fuel status for ${vin}:`, error);
      throw error;
    }
  }

  async getBrakeStatus(vin: string): Promise<BrakeStatusResponse> {
    const cacheKey = this.getCacheKey('brakes', vin);
    const cached = this.cache.get<BrakeStatusResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached brake status');
      return cached;
    }

    try {
      const response = await this.httpClient.get<BrakeStatusResponse>(`/vehicles/${vin}/brakes`);
      this.cache.set(cacheKey, response.data, 300); // Cache for 5 minutes
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get brake status for ${vin}:`, error);
      throw error;
    }
  }

  // Command Methods
  async getAvailableCommands(vin: string): Promise<CommandListResponse> {
    const cacheKey = this.getCacheKey('commands', vin);
    const cached = this.cache.get<CommandListResponse>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached available commands');
      return cached;
    }

    try {
      const response = await this.httpClient.get<CommandListResponse>(`/vehicles/${vin}/commands`);
      this.cache.set(cacheKey, response.data, 3600); // Cache for 1 hour (available commands don't change often)
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get available commands for ${vin}:`, error);
      throw error;
    }
  }

  async getCommandAccessibility(vin: string): Promise<CommandAccessibilityResponse> {
    try {
      const response = await this.httpClient.get<CommandAccessibilityResponse>(`/vehicles/${vin}/command-accessibility`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get command accessibility for ${vin}:`, error);
      throw error;
    }
  }

  // Vehicle Command Execution
  private checkCommandRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Clean old entries and count command requests
    let commandCount = 0;
    for (const [timestamp, value] of this.rateLimiter.entries()) {
      if (parseInt(timestamp) < oneMinuteAgo) {
        this.rateLimiter.delete(timestamp);
      } else if (value === 2) { // Commands are marked with value 2
        commandCount++;
      }
    }

    return commandCount < this.COMMAND_RATE_LIMIT;
  }

  private updateCommandRateLimit(): void {
    this.rateLimiter.set(Date.now().toString(), 2); // Commands marked with value 2
  }

  async lockVehicle(vin: string): Promise<CommandInvokeResponse> {
    if (!this.checkCommandRateLimit()) {
      throw new Error('Command rate limit exceeded. Please wait before sending more commands.');
    }

    try {
      const response = await this.httpClient.post<CommandInvokeResponse>(
        `/vehicles/${vin}/commands/lock`, 
        {} as LockUnlockRequest
      );
      this.updateCommandRateLimit();
      this.logger.info(`Lock command sent for vehicle ${vin}. Status: ${response.data.invokeStatus}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to lock vehicle ${vin}:`, error);
      throw error;
    }
  }

  async unlockVehicle(vin: string): Promise<UnlockCommandResponse> {
    if (!this.checkCommandRateLimit()) {
      throw new Error('Command rate limit exceeded. Please wait before sending more commands.');
    }

    try {
      const response = await this.httpClient.post<UnlockCommandResponse>(
        `/vehicles/${vin}/commands/unlock`, 
        {} as LockUnlockRequest
      );
      this.updateCommandRateLimit();
      this.logger.info(`Unlock command sent for vehicle ${vin}. Status: ${response.data.invokeStatus}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to unlock vehicle ${vin}:`, error);
      throw error;
    }
  }

  async startClimatization(vin: string): Promise<CommandInvokeResponse> {
    if (!this.checkCommandRateLimit()) {
      throw new Error('Command rate limit exceeded. Please wait before sending more commands.');
    }

    try {
      const response = await this.httpClient.post<CommandInvokeResponse>(
        `/vehicles/${vin}/commands/climatization-start`, 
        {} as ClimatizationRequest
      );
      this.updateCommandRateLimit();
      this.logger.info(`Climatization start command sent for vehicle ${vin}. Status: ${response.data.invokeStatus}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to start climatization for vehicle ${vin}:`, error);
      throw error;
    }
  }

  async stopClimatization(vin: string): Promise<CommandInvokeResponse> {
    if (!this.checkCommandRateLimit()) {
      throw new Error('Command rate limit exceeded. Please wait before sending more commands.');
    }

    try {
      const response = await this.httpClient.post<CommandInvokeResponse>(
        `/vehicles/${vin}/commands/climatization-stop`, 
        {} as ClimatizationRequest
      );
      this.updateCommandRateLimit();
      this.logger.info(`Climatization stop command sent for vehicle ${vin}. Status: ${response.data.invokeStatus}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to stop climatization for vehicle ${vin}:`, error);
      throw error;
    }
  }

  // Comprehensive state retrieval
  async getCompleteVehicleState(vin: string): Promise<ConnectedVehicleState> {
    this.logger.debug(`Fetching complete vehicle state for ${vin}`);
    
    const state: ConnectedVehicleState = {
      lastUpdated: new Date().toISOString()
    };

    // Fetch all data in parallel for better performance
    const promises = [
      this.getVehicleDetails(vin).then(data => state.vehicleDetails = data.data).catch(err => this.logger.debug('Vehicle details failed:', err.message)),
      this.getDoorsStatus(vin).then(data => state.doors = data.data).catch(err => this.logger.debug('Doors status failed:', err.message)),
      this.getWindowsStatus(vin).then(data => state.windows = data.data).catch(err => this.logger.debug('Windows status failed:', err.message)),
      this.getOdometer(vin).then(data => state.odometer = data.data).catch(err => this.logger.debug('Odometer failed:', err.message)),
      this.getDiagnostics(vin).then(data => state.diagnostics = data.data).catch(err => this.logger.debug('Diagnostics failed:', err.message)),
      this.getStatistics(vin).then(data => state.statistics = data.data).catch(err => this.logger.debug('Statistics failed:', err.message)),
      this.getTyrePressure(vin).then(data => state.tyrePressure = data.data).catch(err => this.logger.debug('Tyre pressure failed:', err.message)),
      this.getWarnings(vin).then(data => state.warnings = data.data).catch(err => this.logger.debug('Warnings failed:', err.message)),
      this.getEngineStatus(vin).then(data => state.engineStatus = data.data).catch(err => this.logger.debug('Engine status failed:', err.message)),
      this.getEngineDiagnostics(vin).then(data => state.engineDiagnostics = data.data).catch(err => this.logger.debug('Engine diagnostics failed:', err.message)),
      this.getFuelStatus(vin).then(data => state.fuel = data.data).catch(err => this.logger.debug('Fuel status failed:', err.message)),
      this.getBrakeStatus(vin).then(data => state.brakeStatus = data.data).catch(err => this.logger.debug('Brake status failed:', err.message)),
      this.getCommandAccessibility(vin).then(data => state.commandAccessibility = data.data).catch(err => this.logger.debug('Command accessibility failed:', err.message)),
      this.getAvailableCommands(vin).then(data => state.availableCommands = data.data).catch(err => this.logger.debug('Available commands failed:', err.message))
    ];

    await Promise.allSettled(promises);

    this.logger.debug(`Retrieved complete vehicle state for ${vin}`);
    return state;
  }
}