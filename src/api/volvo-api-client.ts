import axios, { AxiosInstance, AxiosError } from 'axios';
import { Logger } from 'homebridge';
import NodeCache from 'node-cache';
import { VolvoApiConfig, OAuthTokens } from '../types/config';
import { EnergyState, Capabilities, ErrorResponse, DetailedErrorResponse } from '../types/energy-api';
import { ConnectedVehicleState } from '../types/connected-vehicle-api';
import { OAuthHandler } from '../auth/oauth-handler';
import { ConnectedVehicleClient } from './connected-vehicle-client';

// Unified vehicle data interface
export interface UnifiedVehicleData {
  // Energy/Battery information
  batteryLevel?: number;
  batteryStatus?: 'OK' | 'WARNING' | 'ERROR';
  chargingState?: 'CHARGING' | 'NOT_CHARGING' | 'FAULT';
  electricRange?: number;
  estimatedChargingTime?: number;
  
  // Door and Lock status
  centralLockStatus?: 'LOCKED' | 'UNLOCKED' | 'UNKNOWN';
  frontLeftDoor?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  frontRightDoor?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  rearLeftDoor?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  rearRightDoor?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  hood?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  tailgate?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  
  // Window status
  frontLeftWindow?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  frontRightWindow?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  rearLeftWindow?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  rearRightWindow?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  sunroof?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  
  // Vehicle information
  odometer?: number;
  
  // Command capabilities
  canLock?: boolean;
  canUnlock?: boolean;
  canStartClimatization?: boolean;
  canStopClimatization?: boolean;
  
  // Diagnostics
  serviceWarning?: 'NO_WARNING' | 'WARNING' | 'UNKNOWN';
  distanceToService?: number;
  timeToService?: number;
  
  // Last update timestamp
  lastUpdated?: string;
  dataSource?: 'energy-api' | 'connected-vehicle-api' | 'hybrid';
}

export class VolvoApiClient {
  private readonly httpClient: AxiosInstance;
  private readonly oAuthHandler: OAuthHandler;
  private readonly cache: NodeCache;
  private readonly rateLimiter: Map<string, number> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 100;
  
  // Connected Vehicle API client
  private readonly connectedVehicleClient: ConnectedVehicleClient;
  
  // API preference: 'energy-first', 'connected-first', 'energy-only', 'connected-only'
  private apiPreference: 'energy-first' | 'connected-first' | 'energy-only' | 'connected-only' = 'connected-first';

  constructor(
    private readonly config: VolvoApiConfig,
    private readonly vccApiKey: string,
    private readonly logger: Logger,
    private readonly vin?: string,
    private readonly homebridgeStorageDir?: string,
  ) {
    this.httpClient = axios.create({
      baseURL: 'https://api.volvocars.com/energy/v2',
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'vcc-api-key': vccApiKey,
      },
    });

    this.oAuthHandler = new OAuthHandler(config, logger, vin, homebridgeStorageDir);
    this.cache = new NodeCache({ stdTTL: 300 });
    
    // Initialize Connected Vehicle API client
    this.connectedVehicleClient = new ConnectedVehicleClient(
      config,
      vccApiKey,
      logger,
      vin,
      homebridgeStorageDir
    );
    
    // Set API preference based on configuration or environment
    this.determineApiPreference();

    this.setupRequestInterceptors();
    this.setupResponseInterceptors();
  }
  
  private determineApiPreference(): void {
    // Use configuration setting if provided, otherwise default to connected-first
    this.apiPreference = this.config.apiPreference || 'connected-first';
    this.logger.debug(`API preference set to: ${this.apiPreference}`);
    
    if (this.apiPreference === 'connected-first' || this.apiPreference === 'connected-only') {
      this.logger.info('🔗 Using Connected Vehicle API for richer vehicle data');
    } else if (this.apiPreference === 'energy-first' || this.apiPreference === 'energy-only') {
      this.logger.info('⚡ Using Energy API v2 for vehicle data');
    }
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
          
          // Provide helpful error message for OAuth issues
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('invalid or expired')) {
            this.logger.error('');
            this.logger.error('🔑 Your refresh token appears to be invalid or expired.');
            this.logger.error('   Please use the Homebridge UI to re-authorize or generate a new token.');
            this.logger.error('   Alternatively, use the production-oauth-setup.js script to get a fresh token.');
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
      // Use Energy API v2 endpoint for capabilities
      const response = await this.httpClient.get<Capabilities>(`/vehicles/${vin}/capabilities`);
      
      this.cache.set(cacheKey, response.data, 3600);
      return response.data;
    } catch (error) {
      // Fallback: assume basic capabilities are available
      this.logger.warn('Failed to get capabilities, assuming basic support:', error);
      const basicCapabilities: Capabilities = {
        getEnergyState: {
          isSupported: true,
          batteryChargeLevel: { isSupported: true },
          electricRange: { isSupported: true },
          chargerConnectionStatus: { isSupported: true },
          chargingSystemStatus: { isSupported: true },
          chargingType: { isSupported: true },
          chargerPowerStatus: { isSupported: true },
          estimatedChargingTimeToTargetBatteryChargeLevel: { isSupported: true },
          targetBatteryChargeLevel: { isSupported: true },
          chargingCurrentLimit: { isSupported: true },
          chargingPower: { isSupported: true },
        },
      };
      this.cache.set(cacheKey, basicCapabilities, 3600);
      return basicCapabilities;
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
      // Use Energy API v2 endpoint to get complete energy state
      const response = await this.httpClient.get<EnergyState>(`/vehicles/${vin}/state`);
      
      this.logger.debug('Energy API response:', JSON.stringify(response.data, null, 2));
      
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
    this.connectedVehicleClient.clearCache();
  }
  
  // Unified data retrieval method
  async getUnifiedVehicleData(vin: string): Promise<UnifiedVehicleData> {
    const cacheKey = `unified_data_${vin}`;
    const cached = this.cache.get<UnifiedVehicleData>(cacheKey);
    
    if (cached) {
      this.logger.debug('Returning cached unified vehicle data');
      return cached;
    }
    
    let unifiedData: UnifiedVehicleData = {
      lastUpdated: new Date().toISOString()
    };
    
    if (this.apiPreference === 'connected-first' || this.apiPreference === 'connected-only') {
      try {
        const connectedData = await this.connectedVehicleClient.getCompleteVehicleState(vin);
        unifiedData = this.mapConnectedVehicleData(connectedData);
        unifiedData.dataSource = 'connected-vehicle-api';
        
        // Cache unified data for 60 seconds
        this.cache.set(cacheKey, unifiedData, 60);
        return unifiedData;
      } catch (error) {
        this.logger.warn('Connected Vehicle API failed, trying Energy API fallback:', error);
        
        if (this.apiPreference === 'connected-only') {
          throw error;
        }
      }
    }
    
    if (this.apiPreference === 'energy-first' || this.apiPreference === 'connected-first') {
      try {
        const energyState = await this.getEnergyState(vin);
        const energyData = this.mapEnergyApiData(energyState);
        
        // If we have both sources, merge them
        if (unifiedData.dataSource === 'connected-vehicle-api') {
          unifiedData = { ...unifiedData, ...energyData };
          unifiedData.dataSource = 'hybrid';
        } else {
          unifiedData = { ...unifiedData, ...energyData };
          unifiedData.dataSource = 'energy-api';
        }
        
        this.cache.set(cacheKey, unifiedData, 60);
        return unifiedData;
      } catch (error) {
        this.logger.error('Both APIs failed to retrieve vehicle data:', error);
        
        if (unifiedData.dataSource) {
          // Return partial data if we have some from Connected Vehicle API
          return unifiedData;
        }
        
        throw error;
      }
    }
    
    // This should not happen with current logic, but safety fallback
    throw new Error('No valid API preference configured');
  }
  
  private mapConnectedVehicleData(cvData: ConnectedVehicleState): UnifiedVehicleData {
    const data: UnifiedVehicleData = {
      lastUpdated: cvData.lastUpdated
    };
    
    // Battery information from fuel endpoint
    if (cvData.fuel?.batteryChargeLevel) {
      data.batteryLevel = cvData.fuel.batteryChargeLevel.value;
      data.batteryStatus = 'OK';
      // Connected Vehicle API doesn't directly provide charging status
      // This would need to be inferred from other data or commands
      data.chargingState = 'NOT_CHARGING';
    }
    
    // Door and lock status
    if (cvData.doors) {
      data.centralLockStatus = cvData.doors.centralLock?.value as 'LOCKED' | 'UNLOCKED' | 'UNKNOWN';
      data.frontLeftDoor = cvData.doors.frontLeftDoor?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
      data.frontRightDoor = cvData.doors.frontRightDoor?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
      data.rearLeftDoor = cvData.doors.rearLeftDoor?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
      data.rearRightDoor = cvData.doors.rearRightDoor?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
      data.hood = cvData.doors.hood?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
      data.tailgate = cvData.doors.tailgate?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
    }
    
    // Window status
    if (cvData.windows) {
      data.frontLeftWindow = cvData.windows.frontLeftWindow?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
      data.frontRightWindow = cvData.windows.frontRightWindow?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
      data.rearLeftWindow = cvData.windows.rearLeftWindow?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
      data.rearRightWindow = cvData.windows.rearRightWindow?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
      data.sunroof = cvData.windows.sunroof?.value as 'OPEN' | 'CLOSED' | 'UNKNOWN';
    }
    
    // Odometer
    if (cvData.odometer?.odometer) {
      data.odometer = cvData.odometer.odometer.value;
    }
    
    // Command capabilities
    if (cvData.availableCommands) {
      data.canLock = cvData.availableCommands.some(cmd => cmd.command === 'LOCK');
      data.canUnlock = cvData.availableCommands.some(cmd => cmd.command === 'UNLOCK');
      data.canStartClimatization = cvData.availableCommands.some(cmd => cmd.command === 'CLIMATIZATION_START');
      data.canStopClimatization = cvData.availableCommands.some(cmd => cmd.command === 'CLIMATIZATION_STOP');
    }
    
    // Diagnostics
    if (cvData.diagnostics) {
      data.serviceWarning = cvData.diagnostics.serviceWarning?.value as 'NO_WARNING' | 'WARNING' | 'UNKNOWN';
      data.distanceToService = cvData.diagnostics.distanceToService?.value;
      data.timeToService = cvData.diagnostics.timeToService?.value;
    }
    
    // Statistics for range
    if (cvData.statistics?.distanceToEmptyBattery) {
      data.electricRange = cvData.statistics.distanceToEmptyBattery.value;
    }
    
    return data;
  }
  
  private mapEnergyApiData(energyState: EnergyState): UnifiedVehicleData {
    const data: UnifiedVehicleData = {};
    
    // Battery information
    if (energyState.batteryChargeLevel?.status === 'OK') {
      data.batteryLevel = energyState.batteryChargeLevel.value;
      data.batteryStatus = 'OK';
    }
    
    // Charging state
    if (energyState.chargingStatus?.status === 'OK') {
      const chargingStatus = energyState.chargingStatus.value;
      data.chargingState = chargingStatus === 'CHARGING' ? 'CHARGING' : 'NOT_CHARGING';
    }
    
    // Electric range
    if (energyState.electricRange?.status === 'OK') {
      data.electricRange = energyState.electricRange.value;
    }
    
    // Estimated charging time
    if (energyState.estimatedChargingTimeToTargetBatteryChargeLevel?.status === 'OK') {
      data.estimatedChargingTime = energyState.estimatedChargingTimeToTargetBatteryChargeLevel.value;
    }
    
    return data;
  }
  
  // Connected Vehicle API methods passthrough
  async lockVehicle(vin: string) {
    return this.connectedVehicleClient.lockVehicle(vin);
  }
  
  async unlockVehicle(vin: string) {
    return this.connectedVehicleClient.unlockVehicle(vin);
  }
  
  async startClimatization(vin: string) {
    return this.connectedVehicleClient.startClimatization(vin);
  }
  
  async stopClimatization(vin: string) {
    return this.connectedVehicleClient.stopClimatization(vin);
  }
  
  async getConnectedVehicleState(vin: string): Promise<ConnectedVehicleState> {
    return this.connectedVehicleClient.getCompleteVehicleState(vin);
  }
  
  // Getter for Connected Vehicle client (for direct access if needed)
  getConnectedVehicleClient(): ConnectedVehicleClient {
    return this.connectedVehicleClient;
  }
}