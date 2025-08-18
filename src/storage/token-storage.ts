import { Logger } from 'homebridge';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import package.json to get current version
const packageJson = require('../../package.json');

/**
 * Token storage entry with version tracking
 */
interface TokenEntry {
  vin: string;
  refreshToken: string;
  updatedAt: string;
  source: 'stored' | 'config';
  pluginVersion: string;
  configTokenCleared?: boolean; // Track if config token was cleared after rotation
}

/**
 * Persistent token storage for Volvo refresh tokens
 * Uses simple JSON file to avoid node-persist conflicts with other plugins
 * Stores tokens in ~/.homebridge/volvo-ex30-tokens.json
 * Survives plugin updates and Homebridge restarts
 * Includes version tracking for smart token management
 */
export class TokenStorage {
  private readonly tokenFilePath: string;
  private initialized = false;
  private readonly currentVersion: string;

  constructor(
    private readonly logger: Logger,
    private readonly vin: string,
    homebridgeStorageDir?: string,
  ) {
    // Use simple JSON file in homebridge directory to avoid persist conflicts
    const homebridgeDir = homebridgeStorageDir || path.join(os.homedir(), '.homebridge');
    this.tokenFilePath = path.join(homebridgeDir, 'volvo-ex30-tokens.json');
    this.currentVersion = packageJson.version;
    
    this.logger.debug(`💾 Token storage file: ${this.tokenFilePath}`);
    this.logger.debug(`📦 Plugin version: ${this.currentVersion}`);
  }

  /**
   * Initialize the storage system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Ensure the parent directory exists
      const parentDir = path.dirname(this.tokenFilePath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      // Create empty token file if it doesn't exist
      if (!fs.existsSync(this.tokenFilePath)) {
        fs.writeFileSync(this.tokenFilePath, '{}', 'utf8');
      }

      this.initialized = true;
      this.logger.debug('✅ Token storage initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize token storage:', error);
      throw new Error(`Token storage initialization failed: ${error}`);
    }
  }

  /**
   * Store refresh token for the current VIN
   */
  async storeRefreshToken(refreshToken: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const tokens = this.readTokenFile();
      const tokenKey = this.getTokenKey();
      
      // Get existing entry to preserve configTokenCleared flag
      const existingEntry = tokens[tokenKey];
      
      tokens[tokenKey] = {
        refreshToken,
        vin: this.vin,
        updatedAt: new Date().toISOString(),
        source: 'stored',
        pluginVersion: this.currentVersion,
        configTokenCleared: existingEntry?.configTokenCleared || false,
      } as TokenEntry;

      fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokens, null, 2), 'utf8');
      this.logger.debug(`💾 Stored refresh token for VIN ${this.vin.substring(0, 8)}... (${refreshToken.substring(0, 12)}...)`);
    } catch (error) {
      this.logger.error('❌ Failed to store refresh token:', error);
      // Don't throw - storage failure shouldn't break the plugin
    }
  }

  /**
   * Retrieve stored refresh token for the current VIN
   */
  async getStoredRefreshToken(): Promise<string | null> {
    await this.ensureInitialized();

    try {
      const tokens = this.readTokenFile();
      const tokenKey = this.getTokenKey();
      const tokenData = tokens[tokenKey];

      if (tokenData && tokenData.refreshToken) {
        this.logger.debug(`💾 Retrieved stored refresh token for VIN ${this.vin.substring(0, 8)}... (updated: ${tokenData.updatedAt})`);
        return tokenData.refreshToken;
      }

      this.logger.debug(`💾 No stored refresh token found for VIN ${this.vin.substring(0, 8)}...`);
      return null;
    } catch (error) {
      this.logger.error('❌ Failed to retrieve stored refresh token:', error);
      return null;
    }
  }

  /**
   * Get token storage info for debugging
   */
  async getTokenInfo(): Promise<any> {
    await this.ensureInitialized();

    try {
      const tokens = this.readTokenFile();
      const tokenKey = this.getTokenKey();
      const tokenData = tokens[tokenKey];

      if (tokenData) {
        return {
          exists: true,
          vin: tokenData.vin,
          updatedAt: tokenData.updatedAt,
          source: tokenData.source,
          tokenLength: tokenData.refreshToken?.length || 0,
          tokenPreview: tokenData.refreshToken?.substring(0, 12) + '...',
        };
      }

      return { exists: false };
    } catch (error) {
      this.logger.error('❌ Failed to get token info:', error);
      return { exists: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Clear stored token for the current VIN
   */
  async clearStoredToken(): Promise<void> {
    await this.ensureInitialized();

    try {
      const tokens = this.readTokenFile();
      const tokenKey = this.getTokenKey();
      delete tokens[tokenKey];
      
      fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokens, null, 2), 'utf8');
      this.logger.debug(`💾 Cleared stored refresh token for VIN ${this.vin.substring(0, 8)}...`);
    } catch (error) {
      this.logger.error('❌ Failed to clear stored token:', error);
    }
  }

  /**
   * Check if plugin version has changed and handle token migration
   */
  async checkVersionChanges(): Promise<{ versionChanged: boolean; shouldClearTokens: boolean; previousVersion?: string }> {
    await this.ensureInitialized();

    try {
      const tokens = this.readTokenFile();
      const tokenKey = this.getTokenKey();
      const tokenEntry = tokens[tokenKey];

      if (!tokenEntry || !tokenEntry.pluginVersion) {
        return { versionChanged: true, shouldClearTokens: false }; // First time with version tracking
      }

      const previousVersion = tokenEntry.pluginVersion;
      const versionChanged = previousVersion !== this.currentVersion;

      if (versionChanged) {
        this.logger.info(`📦 Plugin version changed: ${previousVersion} → ${this.currentVersion}`);
        
        // Check if it's a major version change (x.y.z where x or y changes)
        const shouldClearTokens = this.isMajorVersionChange(previousVersion, this.currentVersion);
        
        if (shouldClearTokens) {
          this.logger.warn('🔄 Major version change detected - tokens may need regeneration');
        }

        return { versionChanged, shouldClearTokens, previousVersion };
      }

      return { versionChanged: false, shouldClearTokens: false };
    } catch (error) {
      this.logger.error('❌ Failed to check version changes:', error);
      return { versionChanged: false, shouldClearTokens: false };
    }
  }

  /**
   * Check if version change is major (x.y.z where x or y changes)
   */
  private isMajorVersionChange(oldVersion: string, newVersion: string): boolean {
    try {
      const oldParts = oldVersion.split('.').map(x => parseInt(x));
      const newParts = newVersion.split('.').map(x => parseInt(x));
      
      // Major version change: x.y.z where x or y changes
      return oldParts[0] !== newParts[0] || oldParts[1] !== newParts[1];
    } catch (error) {
      // If we can't parse versions, assume it's major
      return true;
    }
  }

  /**
   * Mark config token as cleared to avoid reuse
   */
  async markConfigTokenCleared(): Promise<void> {
    await this.ensureInitialized();

    try {
      const tokens = this.readTokenFile();
      const tokenKey = this.getTokenKey();
      const tokenEntry = tokens[tokenKey];

      if (tokenEntry) {
        tokenEntry.configTokenCleared = true;
        fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokens, null, 2), 'utf8');
        this.logger.debug('✅ Marked config token as cleared to prevent reuse');
      }
    } catch (error) {
      this.logger.error('❌ Failed to mark config token as cleared:', error);
    }
  }

  /**
   * Get the best available refresh token with smart config token handling
   */
  async getBestRefreshToken(configToken?: string): Promise<{ token: string; source: 'stored' | 'config' } | null> {
    this.logger.debug('🔍 Token storage debug - Starting getBestRefreshToken');
    this.logger.debug(`🔍 Token file path: ${this.tokenFilePath}`);
    this.logger.debug(`🔍 File exists: ${require('fs').existsSync(this.tokenFilePath)}`);
    this.logger.debug(`🔍 Config token provided: ${!!configToken} (length: ${configToken?.length || 0})`);
    
    // Check for version changes first
    const versionCheck = await this.checkVersionChanges();
    
    if (versionCheck.shouldClearTokens) {
      this.logger.warn('🔄 Major version change - clearing stored tokens to force fresh authentication');
      await this.clearStoredToken();
    }

    // Always prefer stored (rotated) tokens over config tokens
    const storedToken = await this.getStoredRefreshTokenSilently();
    this.logger.debug(`🔍 Stored token found: ${!!storedToken} (length: ${storedToken?.length || 0})`);
    
    if (storedToken) {
      // Check if config token was already used and cleared
      const tokens = this.readTokenFile();
      const tokenKey = this.getTokenKey();
      const tokenEntry = tokens[tokenKey];
      
      this.logger.debug(`🔍 Token entry exists: ${!!tokenEntry}`);
      this.logger.debug(`🔍 Config token cleared flag: ${tokenEntry?.configTokenCleared}`);
      this.logger.debug(`🔍 Tokens match: ${configToken === storedToken}`);
      
      if (configToken && !tokenEntry?.configTokenCleared && configToken !== storedToken) {
        // Fresh config token provided and not yet used - clear stored token to use fresh one
        this.logger.info('💾 Fresh config token provided - will use instead of stored token');
        await this.clearStoredToken();
        return { token: configToken, source: 'config' };
      }
      
      // Use stored rotated token (most current)
      this.logger.info('💾 Using stored rotated token (most current)');
      return { token: storedToken, source: 'stored' };
    }
    
    // No stored token - use config token for initial authentication only
    if (configToken) {
      this.logger.info('💾 No stored token found - will use config token for initial authentication');
      return { token: configToken, source: 'config' };
    }

    // No token available
    this.logger.warn('❌ No refresh token available (neither stored nor config)');
    return null;
  }

  /**
   * Generate storage key for the current VIN
   */
  private getTokenKey(): string {
    return `refresh_token_${this.vin}`;
  }

  /**
   * Read token file safely
   */
  private readTokenFile(): Record<string, TokenEntry> {
    try {
      if (!fs.existsSync(this.tokenFilePath)) {
        return {};
      }
      const data = fs.readFileSync(this.tokenFilePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      this.logger.warn('⚠️ Failed to read token file, returning empty object:', error);
      return {};
    }
  }

  /**
   * Silent version of getStoredRefreshToken for internal use (no debug logging)
   */
  private async getStoredRefreshTokenSilently(): Promise<string | null> {
    await this.ensureInitialized();

    try {
      const tokens = this.readTokenFile();
      const tokenKey = this.getTokenKey();
      const tokenData = tokens[tokenKey];

      if (tokenData && tokenData.refreshToken) {
        return tokenData.refreshToken;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Silent version of clearStoredToken for internal use (no debug logging)
   */
  private async clearStoredTokenSilently(): Promise<void> {
    await this.ensureInitialized();

    try {
      const tokens = this.readTokenFile();
      const tokenKey = this.getTokenKey();
      delete tokens[tokenKey];
      
      fs.writeFileSync(this.tokenFilePath, JSON.stringify(tokens, null, 2), 'utf8');
    } catch (error) {
      // Silent operation - no logging
    }
  }

  /**
   * Ensure storage is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}