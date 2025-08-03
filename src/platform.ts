import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { VolvoEX30Config } from './types/config';
import { VolvoApiClient } from './api/volvo-api-client';
import { VolvoEX30Accessory } from './accessory';

export class VolvoEX30Platform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  private apiClient!: VolvoApiClient;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig & VolvoEX30Config,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    if (!this.config.vin || !this.config.clientId || !this.config.clientSecret || !this.config.vccApiKey) {
      this.log.error('Missing required configuration: vin, clientId, clientSecret, or vccApiKey');
      return;
    }

    this.apiClient = new VolvoApiClient(
      {
        baseUrl: 'https://api.volvocars.com',
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
        region: this.config.region || 'eu',
      },
      this.config.vccApiKey,
      this.log,
    );

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  async discoverDevices() {
    try {
      const capabilities = await this.apiClient.getCapabilities(this.config.vin);
      
      if (!capabilities.getEnergyState.isSupported) {
        this.log.error('Energy API not supported for this vehicle');
        return;
      }

      const uuid = this.api.hap.uuid.generate(this.config.vin);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new VolvoEX30Accessory(this, existingAccessory);
      } else {
        this.log.info('Adding new accessory:', this.config.name);
        const accessory = new this.api.platformAccessory(this.config.name, uuid);
        accessory.context.device = {
          vin: this.config.vin,
          name: this.config.name,
        };
        
        new VolvoEX30Accessory(this, accessory);
        this.api.registerPlatformAccessories('homebridge-volvo-ex30', 'VolvoEX30', [accessory]);
      }
    } catch (error) {
      this.log.error('Failed to discover devices:', error);
    }
  }

  getApiClient(): VolvoApiClient {
    return this.apiClient;
  }
}