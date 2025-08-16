import axios, { AxiosInstance } from 'axios';
import { Logger } from 'homebridge';
import { OAuthTokens, VolvoApiConfig } from '../types/config';
import { TokenStorage } from '../storage/token-storage';
import * as crypto from 'crypto';

export class OAuthHandler {
  private readonly httpClient: AxiosInstance;
  private tokens: OAuthTokens | null = null;
  private codeVerifier: string | null = null;
  private refreshPromise: Promise<OAuthTokens> | null = null;
  private tokenStorage: TokenStorage | null = null;

  constructor(
    private readonly config: VolvoApiConfig,
    private readonly logger: Logger,
    private readonly vin?: string,
    private readonly homebridgeStorageDir?: string,
  ) {
    this.httpClient = axios.create({
      baseURL: 'https://volvoid.eu.volvocars.com',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    });

    if (config.region === 'na') {
      this.httpClient.defaults.baseURL = 'https://volvoid.volvocars.com';
    }

    // Initialize token storage if VIN is provided
    if (vin) {
      this.tokenStorage = new TokenStorage(logger, vin, homebridgeStorageDir);
      this.initializeTokenStorage();
    }
  }

  /**
   * Initialize token storage and load existing tokens
   */
  private async initializeTokenStorage(): Promise<void> {
    if (!this.tokenStorage) {
      return;
    }

    try {
      await this.tokenStorage.initialize();
      this.logger.debug('💾 Token storage initialized for OAuth handler');
    } catch (error) {
      this.logger.error('❌ Failed to initialize token storage:', error);
      // Continue without storage - fallback to config-only mode
      this.tokenStorage = null;
    }
  }

  getAuthorizationUrl(redirectUri: string, state?: string): string {
    // Generate PKCE parameters
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid conve:battery_charge_level conve:diagnostics_engine_status conve:warnings conve:doors_status conve:windows_status conve:commands',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.httpClient.defaults.baseURL}/as/authorization.oauth2?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    try {
      if (!this.codeVerifier) {
        throw new Error('Code verifier not found. Please generate authorization URL first.');
      }
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: this.codeVerifier,
      });

      const response = await this.httpClient.post('/as/token.oauth2', params);

      const tokens: OAuthTokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
      };

      this.tokens = tokens;
      this.codeVerifier = null; // Clear code verifier after successful exchange
      this.logger.info('Successfully obtained OAuth tokens');
      
      return tokens;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error);
      throw new Error('OAuth token exchange failed');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    // Prevent concurrent refresh attempts - Volvo tokens are single-use!
    if (this.refreshPromise) {
      this.logger.debug('🔄 Token refresh already in progress, waiting for completion...');
      return await this.refreshPromise;
    }

    // Create a refresh promise to serialize all concurrent requests
    this.refreshPromise = this.doTokenRefresh(refreshToken);
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      // Clear the promise when done (success or failure)
      this.refreshPromise = null;
    }
  }

  private async doTokenRefresh(refreshToken: string): Promise<OAuthTokens> {
    try {
      this.logger.debug('🔄 Starting token refresh request...');
      
      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
      });

      const response = await this.httpClient.post('/as/token.oauth2', params);

      const tokens: OAuthTokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token || refreshToken,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
      };

      this.logger.debug(`🔄 Token refresh successful - expires_in: ${response.data.expires_in}s, new expiresAt: ${new Date(tokens.expiresAt).toISOString()}`);

      this.tokens = tokens;
      
      // Store the new refresh token persistently (if rotated)
      if (response.data.refresh_token && response.data.refresh_token !== refreshToken) {
        this.logger.debug('🔄 Token rotated by Volvo - storing new refresh token');
        await this.storeRefreshToken(response.data.refresh_token);
      }
      
      this.logger.debug('✅ Successfully refreshed OAuth tokens');
      
      return tokens;
    } catch (error: any) {
      // Log detailed error information for debugging
      if (error.response) {
        this.logger.error('OAuth refresh failed with HTTP error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          refreshTokenLength: refreshToken?.length || 0,
          refreshTokenPrefix: refreshToken?.substring(0, 8) + '...'
        });

        // Handle specific OAuth error cases
        if (error.response.status === 400) {
          const errorData = error.response.data;
          if (errorData?.error === 'invalid_grant') {
            throw new Error(`🔒 Refresh token has expired (7-day limit reached). Please generate a new token:
1. Run: node scripts/working-oauth.js
2. Run: node scripts/token-exchange.js [AUTH_CODE]
3. Update your Homebridge config with the new initialRefreshToken
This happens when Homebridge is offline for 7+ consecutive days.`);
          } else if (errorData?.error === 'invalid_client') {
            throw new Error('Invalid client credentials. Check your Client ID and Client Secret in your Homebridge config.');
          }
        } else if (error.response.status === 401) {
          throw new Error(`🔒 Authentication failed - refresh token has likely expired after 7 days of inactivity. 
Generate a new token:
1. Run: node scripts/working-oauth.js
2. Run: node scripts/token-exchange.js [AUTH_CODE]
3. Update your Homebridge config with the new initialRefreshToken`);
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Unable to connect to Volvo OAuth server. Check your internet connection.');
      } else {
        this.logger.error('OAuth refresh failed with network error:', error.message);
      }
      
      throw new Error(`OAuth token refresh failed: ${error.message || 'Unknown error'}`);
    }
  }

  async getValidAccessToken(refreshToken?: string): Promise<string> {
    // Get the best available refresh token (stored > config)
    const bestToken = await this.getBestRefreshToken(refreshToken);
    
    if (!this.tokens && !bestToken) {
      throw new Error(`🔑 No initialRefreshToken found in configuration. Please generate a token:
1. Run: node scripts/working-oauth.js
2. Run: node scripts/token-exchange.js [AUTH_CODE]  
3. Add the initialRefreshToken to your Homebridge config`);
    }

    if (!this.tokens && bestToken) {
      this.logger.debug(`🔄 Initial token refresh with ${bestToken.source} refresh token`);
      this.tokens = await this.refreshAccessToken(bestToken.token);
      return this.tokens.accessToken;
    }

    if (this.tokens) {
      // Check if token is expired or should be proactively refreshed
      const isExpired = this.isTokenExpired(this.tokens);
      const shouldRefresh = this.shouldProactivelyRefresh(this.tokens);
      
      if (isExpired || shouldRefresh) {
        const reason = isExpired ? 'expired' : 'proactive refresh (Volvo tokens are short-lived)';
        this.logger.debug(`🔄 Refreshing token - reason: ${reason}`);
        
        if (!this.tokens.refreshToken && !bestToken) {
          throw new Error('Token expired and no refresh token available');
        }
        
        try {
          // Use the current token's refresh token, or fall back to best available
          const tokenToUse = this.tokens.refreshToken || bestToken!.token;
          this.tokens = await this.refreshAccessToken(tokenToUse);
          this.logger.debug('✅ Token refreshed successfully');
        } catch (error) {
          this.logger.error(`❌ Token refresh failed: ${error}`);
          
          // If refresh token is invalid, clear tokens to force re-auth
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('invalid_grant') || errorMessage.includes('invalid or expired')) {
            this.logger.warn('🔄 Refresh token appears invalid - clearing cached tokens');
            this.tokens = null;
          }
          
          throw error;
        }
      }
    }

    return this.tokens!.accessToken;
  }

  getTokens(): OAuthTokens | null {
    return this.tokens;
  }

  setTokens(tokens: OAuthTokens): void {
    this.tokens = tokens;
  }

  private isTokenExpired(tokens: OAuthTokens): boolean {
    // Volvo tokens expire much faster than reported - use aggressive refresh
    const buffer = 15 * 60 * 1000; // 15 minutes buffer instead of 5
    const now = Date.now();
    const expiryWithBuffer = tokens.expiresAt - buffer;
    const isExpired = now >= expiryWithBuffer;
    
    this.logger.debug(`🔍 Token expiry check - now: ${new Date(now).toISOString()}, expiresAt: ${new Date(tokens.expiresAt).toISOString()}, buffer: ${buffer/1000}s, isExpired: ${isExpired}`);
    
    return isExpired;
  }

  private shouldProactivelyRefresh(tokens: OAuthTokens): boolean {
    // Refresh if token will expire in the next 3 minutes (very aggressive for Volvo)
    const proactiveRefreshWindow = 3 * 60 * 1000; // 3 minutes before expiry
    const timeUntilExpiry = tokens.expiresAt - Date.now();
    return timeUntilExpiry <= proactiveRefreshWindow;
  }

  isAuthenticated(): boolean {
    return this.tokens !== null && !this.isTokenExpired(this.tokens);
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(codeVerifier: string): string {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return hash.toString('base64url');
  }

  /**
   * Store refresh token persistently
   */
  private async storeRefreshToken(refreshToken: string): Promise<void> {
    if (this.tokenStorage) {
      try {
        await this.tokenStorage.storeRefreshToken(refreshToken);
      } catch (error) {
        this.logger.error('❌ Failed to store refresh token:', error);
        // Don't throw - storage failure shouldn't break OAuth flow
      }
    }
  }

  /**
   * Get the best available refresh token (stored > config)
   */
  private async getBestRefreshToken(configToken?: string): Promise<{ token: string; source: 'stored' | 'config' } | null> {
    if (this.tokenStorage) {
      try {
        return await this.tokenStorage.getBestRefreshToken(configToken);
      } catch (error) {
        this.logger.error('❌ Failed to get best refresh token:', error);
        // Fallback to config token only
      }
    }

    // No storage available - use config token if provided
    if (configToken) {
      return { token: configToken, source: 'config' };
    }

    return null;
  }

  /**
   * Get token storage info for debugging
   */
  async getTokenStorageInfo(): Promise<any> {
    if (this.tokenStorage) {
      try {
        return await this.tokenStorage.getTokenInfo();
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    }
    return { storage: 'not_available' };
  }
}