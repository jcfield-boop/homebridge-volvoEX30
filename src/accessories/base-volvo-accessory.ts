import { Logger, PlatformAccessory, Service } from 'homebridge';
import { VolvoEX30Platform } from '../platform';
import { ConnectedVehicleState } from '../types/connected-vehicle-api';

/**
 * Base Volvo Accessory
 * 
 * Provides common functionality for all Volvo accessories including
 * data updates, error handling, and platform integration.
 */
export abstract class BaseVolvoAccessory {
  protected services: Service[] = [];
  protected updateCallbackRegistered = false;

  constructor(
    protected readonly platform: VolvoEX30Platform,
    protected readonly accessory: PlatformAccessory,
    protected readonly logger: Logger,
    protected readonly accessoryName: string,
  ) {
    // Set accessory information
    this.setupAccessoryInformation();
    
    // Setup the specific services for this accessory
    this.setupServices();
    
    // Register for vehicle data updates
    this.registerForDataUpdates();
  }

  /**
   * Setup accessory information service
   */
  private setupAccessoryInformation(): void {
    const informationService = this.accessory.getService(this.platform.Service.AccessoryInformation) ||
      this.accessory.addService(this.platform.Service.AccessoryInformation);

    informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Volvo')
      .setCharacteristic(this.platform.Characteristic.Model, 'EX30')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.getVin() || 'Unknown')
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, '3.0.0')
      .setCharacteristic(this.platform.Characteristic.Name, this.accessoryName);
  }

  /**
   * Get VIN from platform configuration
   */
  protected getVin(): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.platform as any).config.vin;
  }

  /**
   * Get API client from platform
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getApiClient(): any {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.platform as any).apiClient;
  }

  /**
   * Register for vehicle data updates from the platform
   */
  private registerForDataUpdates(): void {
    if (!this.updateCallbackRegistered) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.platform as any).registerDataUpdateCallback(() => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const vehicleData = (this.platform as any).getLastVehicleData();
          if (vehicleData) {
            this.updateServices(vehicleData);
          }
        } catch (error) {
          this.logger.error(`${this.accessoryName}: Failed to update from vehicle data:`, error);
        }
      });
      this.updateCallbackRegistered = true;
      this.logger.debug(`${this.accessoryName}: Registered for data updates`);
    }
  }

  /**
   * Setup services - must be implemented by each accessory
   */
  protected abstract setupServices(): void;

  /**
   * Update services with new vehicle data - must be implemented by each accessory
   */
  protected abstract updateServices(vehicleData: ConnectedVehicleState): void;

  /**
   * Get all services for this accessory
   */
  getServices(): Service[] {
    return this.services;
  }

  /**
   * Handle authentication failures gracefully
   */
  protected isAuthenticationFailed(): boolean {
    const OAuthHandler = require('../auth/oauth-handler').OAuthHandler;
    return OAuthHandler.isGlobalAuthFailure;
  }

  /**
   * Safe API call wrapper with authentication check
   */
  protected async safeApiCall<T>(apiCall: () => Promise<T>, defaultValue: T, operationName: string): Promise<T> {
    if (this.isAuthenticationFailed()) {
      this.logger.debug(`${this.accessoryName}: Skipping ${operationName} - authentication failed`);
      return defaultValue;
    }

    try {
      return await apiCall();
    } catch (error) {
      this.logger.error(`${this.accessoryName}: ${operationName} failed:`, error);
      return defaultValue;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.logger.debug(`${this.accessoryName}: Disposing accessory`);
  }
}