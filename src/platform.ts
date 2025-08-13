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

    if (!this.config.initialRefreshToken) {
      this.log.error('❌ Missing initialRefreshToken in configuration!');
      this.log.error('');
      this.log.error('🔑 QUICK SETUP - Get your initial refresh token with Postman:');
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
        refreshToken: this.config.initialRefreshToken,
      },
      this.config.vccApiKey,
      this.log,
      this.config.vin, // Pass VIN for token storage
      this.api.user.storagePath(), // Pass Homebridge storage directory
    );

    // Set the initial refresh token if provided
    if (this.config.initialRefreshToken) {
      this.log.info(`🔑 Setting initial refresh token: ${this.config.initialRefreshToken.substring(0, 12)}... (length: ${this.config.initialRefreshToken.length})`);
      
      // Clear any existing tokens first
      this.apiClient.clearCache();
      
      // Set the fresh token from config
      this.apiClient.setTokens({
        accessToken: '', // Will be refreshed automatically
        refreshToken: this.config.initialRefreshToken,
        expiresAt: Date.now(), // Force immediate refresh
      });
      
      this.log.info('✅ Fresh tokens set from config');
      
      // Log token storage info for debugging
      this.logTokenStorageInfo();
    } else {
      this.log.error('❌ No initial refresh token found in config!');
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
        
        // Force HomeKit to recognize this as a battery device
        existingAccessory.category = this.api.hap.Categories.OTHER;
        this.log.info('🔋 Set accessory category to OTHER for battery display');
        
        new VolvoEX30Accessory(this, existingAccessory);
      } else {
        this.log.info('Adding new accessory:', this.config.name);
        const accessory = new this.api.platformAccessory(this.config.name, uuid, this.api.hap.Categories.OTHER);
        
        // Set proper accessory context
        accessory.context.device = {
          vin: this.config.vin,
          name: this.config.name,
        };

        // Set default room to Garage for new accessories
        try {
          accessory.context.defaultRoom = 'Garage';
          this.log.debug('✅ Set default room to Garage for new accessory');
        } catch (error) {
          this.log.debug('Note: Could not set default room (this is normal)');
        }
        
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

  /**
   * Log token storage information for debugging
   */
  private async logTokenStorageInfo(): Promise<void> {
    try {
      // Get OAuth handler from API client to check storage
      const oAuthHandler = (this.apiClient as any).oAuthHandler;
      if (oAuthHandler && typeof oAuthHandler.getTokenStorageInfo === 'function') {
        const storageInfo = await oAuthHandler.getTokenStorageInfo();
        
        if (storageInfo.exists) {
          this.log.info(`💾 Stored token found: VIN ${storageInfo.vin?.substring(0, 8)}..., updated ${storageInfo.updatedAt}`);
        } else if (storageInfo.storage === 'not_available') {
          this.log.debug('💾 Token storage not available (no VIN provided)');
        } else {
          this.log.debug('💾 No stored token found - will use config token');
        }
      }
    } catch (error) {
      this.log.debug('💾 Unable to check token storage:', error);
    }
  }
}