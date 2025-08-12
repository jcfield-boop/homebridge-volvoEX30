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
      this.log.error('🔑 QUICK SETUP - Get your refresh token with Postman:');
      this.log.error('   1. Download Postman (https://www.postman.com/downloads/)');
      this.log.error('   2. Create new request → Authorization tab → OAuth 2.0');
      this.log.error('   3. Configure: Grant Type "Authorization Code (With PKCE)"');
      this.log.error('   4. Auth URL: https://volvoid.eu.volvocars.com/as/authorization.oauth2');
      this.log.error('   5. Access Token URL: https://volvoid.eu.volvocars.com/as/token.oauth2');
      this.log.error('   6. Client ID: dc-s68ezw2gmvo5nmrmfre3j4c28');
      this.log.error('   7. Client Secret: AAZIK89F1JF1BKCiJ3yuaW');
      this.log.error('   8. Callback URL: https://oauth.pstmn.io/v1/callback');
      this.log.error('   9. Scope: openid');
      this.log.error('  10. Click "Get New Access Token" → Login → Copy refresh_token');
      this.log.error('');
      this.log.error('📖 For complete setup guide with screenshots, see:');
      this.log.error('   https://github.com/jcfield-boop/homebridge-volvoEX30#method-3-manual-token-approach-recommended-for-personal-use');
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