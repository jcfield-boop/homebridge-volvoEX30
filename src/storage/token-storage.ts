import { Logger } from 'homebridge';
import { OAuthTokens } from '../types/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Persistent token storage for Volvo refresh tokens
 * Uses simple JSON file to avoid node-persist conflicts with other plugins
 * Stores tokens in ~/.homebridge/volvo-ex30-tokens.json
 * Survives plugin updates and Homebridge restarts
 */
export class TokenStorage {
  private readonly tokenFilePath: string;
  private initialized = false;

  constructor(
    private readonly logger: Logger,
    private readonly vin: string,
    homebridgeStorageDir?: string,
  ) {
    // Use simple JSON file in homebridge directory to avoid persist conflicts
    const homebridgeDir = homebridgeStorageDir || path.join(os.homedir(), '.homebridge');
    this.tokenFilePath = path.join(homebridgeDir, 'volvo-ex30-tokens.json');
    
    this.logger.debug(`💾 Token storage file: ${this.tokenFilePath}`);
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
      
      tokens[tokenKey] = {
        refreshToken,
        vin: this.vin,
        updatedAt: new Date().toISOString(),
        source: 'volvo-oauth-rotation',
      };

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
   * Get the best available refresh token (config > stored when config provided)
   */
  async getBestRefreshToken(configToken?: string): Promise<{ token: string; source: 'stored' | 'config' } | null> {
    // If config token provided, prioritize it over stored token
    // This allows users to provide fresh tokens that override potentially expired stored ones
    if (configToken) {
      this.logger.debug('💾 Using fresh token from config.json (prioritized over stored)');
      
      // Clear any old stored token when fresh config token provided
      try {
        const storedToken = await this.getStoredRefreshToken();
        if (storedToken && storedToken !== configToken) {
          this.logger.debug('💾 Clearing old stored token - using fresh config token');
          await this.clearStoredToken();
        }
      } catch (error) {
        this.logger.debug('💾 Could not clear old stored token:', error);
      }
      
      return { token: configToken, source: 'config' };
    }

    // No config token - try stored token
    const storedToken = await this.getStoredRefreshToken();
    if (storedToken) {
      return { token: storedToken, source: 'stored' };
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
  private readTokenFile(): any {
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
   * Ensure storage is initialized before use
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }
}