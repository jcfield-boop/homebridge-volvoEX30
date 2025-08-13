import { Logger } from 'homebridge';
import { OAuthTokens } from '../types/config';
import storage from 'node-persist';
import * as path from 'path';
import * as os from 'os';

/**
 * Persistent token storage for Volvo refresh tokens
 * Stores tokens in ~/.homebridge/persist/volvo-ex30/ directory
 * Survives plugin updates and Homebridge restarts
 */
export class TokenStorage {
  private readonly storageDir: string;
  private localStorage: any;
  private initialized = false;

  constructor(
    private readonly logger: Logger,
    private readonly vin: string,
    homebridgeStorageDir?: string,
  ) {
    // Use provided storage directory or default Homebridge location
    const homebridgeDir = homebridgeStorageDir || path.join(os.homedir(), '.homebridge');
    this.storageDir = path.join(homebridgeDir, 'persist', 'volvo-ex30');
    
    this.logger.debug(`💾 Token storage directory: ${this.storageDir}`);
  }

  /**
   * Initialize the storage system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create a local storage instance
      this.localStorage = storage.create({
        dir: this.storageDir,
        stringify: JSON.stringify,
        parse: JSON.parse,
        encoding: 'utf8',
        forgiveParseErrors: true,
        expiredInterval: 0, // No automatic expiration
      });

      await this.localStorage.init();

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
      const tokenKey = this.getTokenKey();
      const tokenData = {
        refreshToken,
        vin: this.vin,
        updatedAt: new Date().toISOString(),
        source: 'volvo-oauth-rotation',
      };

      await this.localStorage.setItem(tokenKey, tokenData);
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
      const tokenKey = this.getTokenKey();
      const tokenData = await this.localStorage.getItem(tokenKey);

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
      const tokenKey = this.getTokenKey();
      const tokenData = await this.localStorage.getItem(tokenKey);

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
      const tokenKey = this.getTokenKey();
      await this.localStorage.removeItem(tokenKey);
      this.logger.debug(`💾 Cleared stored refresh token for VIN ${this.vin.substring(0, 8)}...`);
    } catch (error) {
      this.logger.error('❌ Failed to clear stored token:', error);
    }
  }

  /**
   * Get the best available refresh token (stored > config fallback)
   */
  async getBestRefreshToken(configToken?: string): Promise<{ token: string; source: 'stored' | 'config' } | null> {
    // Try stored token first
    const storedToken = await this.getStoredRefreshToken();
    if (storedToken) {
      return { token: storedToken, source: 'stored' };
    }

    // Fallback to config token
    if (configToken) {
      this.logger.debug('💾 Using fallback token from config.json');
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
   * Ensure storage is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}