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
    this.log.info('Initializing VolvoEX30 platform...');

    if (!this.config.vin || !this.config.clientId || !this.config.clientSecret || !this.config.vccApiKey) {
      this.log.error('Missing required configuration: vin, clientId, clientSecret, or vccApiKey');
      this.log.error('Please check your Homebridge configuration and ensure all required fields are provided.');
      return;
    }

    if (!this.config.refreshToken) {
      this.log.error('❌ Missing refreshToken in configuration!');
      this.log.error('');
      this.log.error('🔧 To get your refresh token, run the OAuth setup:');
      this.log.error('   1. SSH into your Raspberry Pi');
      this.log.error('   2. cd /usr/local/lib/node_modules/homebridge-volvo-ex30');
      this.log.error('   3. npm run oauth-setup');
      this.log.error('   4. Follow the prompts to get your refresh token');
      this.log.error('   5. Add the refresh token to your Homebridge config');
      this.log.error('');
      this.log.error('📖 For detailed setup instructions, see:');
      this.log.error('   https://github.com/jcfield-boop/homebridge-volvoEX30#setup');
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

    // Set the refresh token if provided
    if (this.config.refreshToken) {
      this.apiClient.setTokens({
        accessToken: '', // Will be refreshed automatically
        refreshToken: this.config.refreshToken,
        expiresAt: Date.now(), // Force immediate refresh
      });
    }

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