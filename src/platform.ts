import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';
import { VolvoEX30Config } from './types/config';
import { VolvoApiClient } from './api/volvo-api-client';
import { VolvoEX30Accessory } from './accessory';

export class VolvoEX30Platform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;
  public readonly accessories: PlatformAccessory[] = [];
  private apiClient!: VolvoApiClient;
  
  // SHARED POLLING: Single poller for all accessories to prevent OAuth spam
  private sharedPollingTimer?: NodeJS.Timeout;
  private lastVehicleData: any = null;
  private dataUpdateCallbacks: Set<() => void> = new Set();
  private initialDataFetched = false;
  private globalDataFailure = false;
  private dataFetchPromise: Promise<void> | null = null;

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

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      // SMART TOKEN MANAGEMENT: Initialize tokens before discovering devices
      this.initializeTokensSmartly().then(async () => {
        this.log.info('🔑 Tokens initialized successfully - starting device discovery');
        await this.discoverDevices();
        
        // SINGLE INITIAL DATA FETCH: Fetch data once for all accessories after device discovery
        try {
          await this.fetchInitialDataOnce();
          this.log.info('📡 Initial data fetch completed for all accessories');
        } catch (error) {
          this.log.error('❌ Failed to fetch initial data:', error);
        }
      }).catch(async (error) => {
        this.log.error('Failed to initialize tokens:', error);
        this.globalDataFailure = true;
        // Still try to discover devices with basic setup (they will show errors)
        await this.discoverDevices();
      });
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
        // CRITICAL: Remove legacy unified accessory to prevent OAuth spam
        this.removeLegacyUnifiedAccessory();
        this.createIndividualAccessories();
      } else {
        this.log.info('🎯 Using Unified Accessory Naming Strategy (Legacy Mode)');
        // CRITICAL: Remove individual accessories to prevent OAuth spam
        this.removeIndividualAccessories();
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
   * Remove legacy unified accessory when switching to individual mode
   */
  private removeLegacyUnifiedAccessory() {
    const unifiedUuid = this.api.hap.uuid.generate(this.config.vin);
    const unifiedAccessory = this.accessories.find(accessory => accessory.UUID === unifiedUuid);
    
    if (unifiedAccessory) {
      this.log.info('🧹 Removing legacy unified accessory to prevent OAuth conflicts');
      this.api.unregisterPlatformAccessories('homebridge-volvo-ex30', 'VolvoEX30', [unifiedAccessory]);
      const index = this.accessories.indexOf(unifiedAccessory);
      if (index > -1) {
        this.accessories.splice(index, 1);
      }
    }
  }

  /**
   * Remove individual accessories when switching to unified mode
   */
  private removeIndividualAccessories() {
    const individualTypes = ['battery', 'lock', 'climate', 'locate'];
    const accessoriesToRemove: PlatformAccessory[] = [];
    
    individualTypes.forEach(type => {
      const uuid = this.api.hap.uuid.generate(`${this.config.vin}-${type}`);
      const accessory = this.accessories.find(acc => acc.UUID === uuid);
      if (accessory) {
        accessoriesToRemove.push(accessory);
      }
    });
    
    if (accessoriesToRemove.length > 0) {
      this.log.info(`🧹 Removing ${accessoriesToRemove.length} individual accessories to prevent OAuth conflicts`);
      this.api.unregisterPlatformAccessories('homebridge-volvo-ex30', 'VolvoEX30', accessoriesToRemove);
      accessoriesToRemove.forEach(accessory => {
        const index = this.accessories.indexOf(accessory);
        if (index > -1) {
          this.accessories.splice(index, 1);
        }
      });
    }
  }

  /**
   * SHARED POLLING: Start single polling timer for all accessories
   */
  public startSharedPolling(): void {
    if (this.sharedPollingTimer) {
      return; // Already started
    }
    
    const pollingInterval = (this.config.pollingInterval || 5) * 60 * 1000;
    this.log.info(`📡 Starting shared polling (${this.config.pollingInterval || 5} min interval)`);
    
    this.sharedPollingTimer = setInterval(async () => {
      try {
        // Clear cache and fetch fresh data once for all accessories
        this.apiClient.clearCache();
        this.lastVehicleData = await this.apiClient.getUnifiedVehicleData(this.config.vin);
        
        // Notify all accessories of the data update
        this.dataUpdateCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            this.log.error('Error in data update callback:', error);
          }
        });
        
        this.log.debug('📊 Shared vehicle data updated for all accessories');
      } catch (error) {
        this.log.error('Failed to update shared vehicle data:', error);
      }
    }, pollingInterval);
  }
  
  /**
   * SHARED POLLING: Register callback for data updates
   */
  public registerDataUpdateCallback(callback: () => void): void {
    this.dataUpdateCallbacks.add(callback);
  }
  
  /**
   * SHARED POLLING: Unregister callback for data updates
   */
  public unregisterDataUpdateCallback(callback: () => void): void {
    this.dataUpdateCallbacks.delete(callback);
  }
  
  /**
   * SHARED POLLING: Get last fetched vehicle data
   */
  public getLastVehicleData(): any {
    return this.lastVehicleData;
  }

  /**
   * SINGLE DATA FETCH: Fetch initial data once for all accessories
   */
  public async fetchInitialDataOnce(): Promise<void> {
    // If already fetched or failed, return immediately
    if (this.initialDataFetched || this.globalDataFailure) {
      return;
    }

    // If fetch is in progress, wait for it
    if (this.dataFetchPromise) {
      this.log.debug('📡 Initial data fetch already in progress, waiting...');
      return await this.dataFetchPromise;
    }

    // Start single data fetch for all accessories
    this.dataFetchPromise = this.doFetchInitialData();
    
    try {
      await this.dataFetchPromise;
    } finally {
      this.dataFetchPromise = null;
    }
  }

  /**
   * SINGLE DATA FETCH: Perform the actual data fetch
   */
  private async doFetchInitialData(): Promise<void> {
    try {
      this.log.info('📡 Fetching initial vehicle data (single call for all accessories)');
      
      // EMERGENCY STOP: Check if OAuth has already failed globally
      if ((this.apiClient as any).oAuthHandler?.constructor?.isGlobalAuthFailure) {
        throw new Error('🔒 OAuth authentication has failed globally - aborting all API operations');
      }
      
      // Clear cache and fetch fresh data once
      this.apiClient.clearCache();
      this.lastVehicleData = await this.apiClient.getUnifiedVehicleData(this.config.vin);
      
      this.initialDataFetched = true;
      this.log.info('✅ Initial vehicle data loaded successfully');
      
      // Notify all accessories that data is ready
      this.dataUpdateCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          this.log.error('Error in initial data callback:', error);
        }
      });
      
    } catch (error) {
      this.globalDataFailure = true;
      
      // Check if this is an auth error and provide better messaging
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('already used and rotated') || errorMessage.includes('expired') || errorMessage.includes('invalid_grant')) {
        this.log.error('🔒 Authentication failed - generate a fresh token:');
        this.log.error('   1. Run: node scripts/easy-oauth.js');
        this.log.error('   2. Update config with new token');
        this.log.error('   3. Restart Homebridge');
        this.log.error('⛔ Plugin suspended until restart with valid token');
      } else {
        this.log.error('❌ Failed to fetch initial vehicle data:', error);
      }
      
      throw error;
    }
  }

  /**
   * Check if initial data fetch failed globally
   */
  public isGlobalDataFailure(): boolean {
    return this.globalDataFailure;
  }

  /**
   * SMART TOKEN MANAGEMENT: Initialize tokens with proper priority
   */
  private async initializeTokensSmartly(): Promise<void> {
    try {
      // Get OAuth handler from API client for token operations  
      const oAuthHandler = (this.apiClient as any).oAuthHandler;
      if (!oAuthHandler) {
        this.log.error('❌ OAuth handler not available');
        return;
      }

      // Check stored tokens first via token storage
      const tokenStorage = (oAuthHandler as any).tokenStorage;
      if (tokenStorage) {
        const bestToken = await tokenStorage.getBestRefreshToken(this.config.initialRefreshToken);
        
        if (bestToken) {
          this.log.info(`🔑 Using ${bestToken.source} token: ${bestToken.token.substring(0, 12)}... (length: ${bestToken.token.length})`);
          
          // Clear any existing tokens first
          this.apiClient.clearCache();
          
          // Set the best available token
          this.apiClient.setTokens({
            accessToken: '', // Will be refreshed automatically
            refreshToken: bestToken.token,
            expiresAt: Date.now(), // Force immediate refresh to validate token
          });
          
          // If using config token, mark it for clearing after first rotation
          if (bestToken.source === 'config') {
            this.log.info('✅ Config token set - will be marked as used after first successful rotation');
          } else {
            this.log.info('✅ Stored rotated token set - ready for use');
          }
          
          return;
        }
      }

      // No tokens available at all
      if (!this.config.initialRefreshToken) {
        this.log.error('❌ No tokens available (neither stored nor config)!');
        this.log.error('');
        this.log.error('🔑 QUICK SETUP - Generate your token with working OAuth scripts:');
        this.log.error('   1. Run: node scripts/working-oauth.js');
        this.log.error('   2. Open the generated URL in your browser');
        this.log.error('   3. Sign in with your Volvo ID and authorize');
        this.log.error('   4. Copy the code from the redirect URL');
        this.log.error('   5. Run: node scripts/token-exchange.js [AUTH_CODE]');
        this.log.error('   6. Copy the refresh token to your config initialRefreshToken');
        this.log.error('');
      } else {
        this.log.error('❌ Token initialization failed despite config token being available');
      }
      
    } catch (error) {
      this.log.error('❌ Failed to initialize tokens smartly:', error);
      // Fallback to basic config token setup
      if (this.config.initialRefreshToken) {
        this.log.warn('🔄 Falling back to basic config token setup');
        this.apiClient.setTokens({
          accessToken: '',
          refreshToken: this.config.initialRefreshToken,
          expiresAt: Date.now(),
        });
      }
    }
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