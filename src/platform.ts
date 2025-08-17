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
      this.log.error('🔑 QUICK SETUP - Generate your token with working OAuth scripts:');
      this.log.error('   1. Run: node scripts/working-oauth.js');
      this.log.error('   2. Open the generated URL in your browser');
      this.log.error('   3. Sign in with your Volvo ID and authorize');
      this.log.error('   4. Copy the code from the redirect URL');
      this.log.error('   5. Run: node scripts/token-exchange.js [AUTH_CODE]');
      this.log.error('   6. Copy the refresh token to your config initialRefreshToken');
      this.log.error('');
      this.log.error('📖 For troubleshooting, try the minimal OAuth script:');
      this.log.error('   node scripts/minimal-oauth.js');
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
      // Connected Vehicle API provides comprehensive vehicle data - no capability check needed
      this.log.debug('🔍 Discovering EX30 device using Connected Vehicle API...');

      // Check if we should use individual accessories or unified approach
      const useIndividualAccessories = this.config.accessoryNaming === 'individual' || 
                                       this.config.accessoryNaming === undefined; // Default to individual

      if (useIndividualAccessories) {
        this.log.info('🎯 Using Individual Accessory Naming Strategy');
        this.createIndividualAccessories();
      } else {
        this.log.info('🎯 Using Unified Accessory Naming Strategy (Legacy Mode)');
        this.createUnifiedAccessory();
      }
    } catch (error) {
      this.log.error('Failed to discover devices:', error);
    }
  }

  private createUnifiedAccessory() {
    const uuid = this.api.hap.uuid.generate(this.config.vin);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

    if (existingAccessory) {
      this.log.info('Restoring existing unified accessory from cache:', existingAccessory.displayName);
      
      // Set as SENSOR category with humidity sensor as primary display
      existingAccessory.category = this.api.hap.Categories.SENSOR;
      this.log.debug('📊 Set accessory category to SENSOR for humidity sensor display');
      
      new VolvoEX30Accessory(this, existingAccessory);
    } else {
      this.log.info('Adding new unified accessory:', this.config.name);
      const accessory = new this.api.platformAccessory(this.config.name, uuid, this.api.hap.Categories.SENSOR);
      
      // Set proper accessory context
      accessory.context.device = {
        vin: this.config.vin,
        name: this.config.name,
        type: 'unified',
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
  }

  private createIndividualAccessories() {
    const accessories = [
      { name: 'EX30 Battery', type: 'battery', category: this.api.hap.Categories.SENSOR },
      { name: 'EX30 Lock', type: 'lock', category: this.api.hap.Categories.SECURITY_SYSTEM },
      { name: 'EX30 Climate', type: 'climate', category: this.api.hap.Categories.THERMOSTAT },
    ];

    // Add locate accessory if enabled
    if (this.config.enableHonkFlash !== false) {
      accessories.push({ name: 'EX30 Locate', type: 'locate', category: this.api.hap.Categories.SWITCH });
    }

    accessories.forEach(accessoryConfig => {
      const uuid = this.api.hap.uuid.generate(`${this.config.vin}-${accessoryConfig.type}`);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        existingAccessory.category = accessoryConfig.category;
        
        // Update context with type for proper service setup
        existingAccessory.context.device = {
          vin: this.config.vin,
          name: accessoryConfig.name,
          type: accessoryConfig.type,
        };
        
        new VolvoEX30Accessory(this, existingAccessory);
      } else {
        this.log.info('Adding new individual accessory:', accessoryConfig.name);
        const accessory = new this.api.platformAccessory(accessoryConfig.name, uuid, accessoryConfig.category);
        
        // Set proper accessory context
        accessory.context.device = {
          vin: this.config.vin,
          name: accessoryConfig.name,
          type: accessoryConfig.type,
        };

        // Set default room to Garage for new accessories
        try {
          accessory.context.defaultRoom = 'Garage';
          this.log.debug(`✅ Set default room to Garage for ${accessoryConfig.name}`);
        } catch (error) {
          this.log.debug('Note: Could not set default room (this is normal)');
        }
        
        new VolvoEX30Accessory(this, accessory);
        this.api.registerPlatformAccessories('homebridge-volvo-ex30', 'VolvoEX30', [accessory]);
      }
    });
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