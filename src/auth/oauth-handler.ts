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
  
  // TRUE SERIALIZATION: Queue all token access to prevent Volvo's token rotation conflicts
  private tokenAccessQueue: Promise<string> | null = null;
  
  // OAuth CSRF protection: Store state parameter for verification
  private pendingState: string | null = null;
  
  // EMERGENCY: Global authentication failure flag - blocks ALL OAuth operations
  private static globalAuthFailure: boolean = false;
  private static authErrorLogged: boolean = false;
  
  // Public getter for global auth failure state
  public static get isGlobalAuthFailure(): boolean {
    return OAuthHandler.globalAuthFailure;
  }

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
    
    // Generate state parameter for CSRF protection if not provided
    const stateParam = state || this.generateState();
    this.pendingState = stateParam; // Store for later verification
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid conve:battery_charge_level conve:diagnostics_engine_status conve:warnings conve:doors_status conve:windows_status conve:commands',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: stateParam,
    });

    return `${this.httpClient.defaults.baseURL}/as/authorization.oauth2?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string, receivedState?: string): Promise<OAuthTokens> {
    try {
      if (!this.codeVerifier) {
        throw new Error('Code verifier not found. Please generate authorization URL first.');
      }
      
      // Verify state parameter for CSRF protection
      if (this.pendingState && receivedState !== this.pendingState) {
        this.logger.error('❌ OAuth state verification failed - possible CSRF attack detected');
        throw new Error('State parameter verification failed. Please restart the OAuth flow.');
      }
      
      // Clear stored state after successful verification
      this.pendingState = null;
      
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
    // EMERGENCY FAIL-FAST: Block all refresh attempts if auth failed
    if (OAuthHandler.globalAuthFailure) {
      throw new Error('🔒 Authentication failed - plugin suspended until restart');
    }
    
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
        
        // Mark config token as used if this was a config token refresh
        if (this.tokenStorage) {
          try {
            await this.tokenStorage.markConfigTokenCleared();
          } catch (error) {
            this.logger.debug('❌ Failed to mark config token as cleared:', error);
          }
        }
      }
      
      this.logger.debug('✅ Successfully refreshed OAuth tokens');
      
      return tokens;
    } catch (error: any) {
      // EMERGENCY: Handle authentication failure at the source
      this.handleAuthFailure(error);
      
      // Log minimal error information to avoid spam
      if (error.response) {
        this.logger.debug('OAuth refresh failed with HTTP error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          refreshTokenLength: refreshToken?.length || 0,
          refreshTokenPrefix: refreshToken?.substring(0, 8) + '...',
        });

        // Handle specific OAuth error cases
        if (error.response.status === 400) {
          const errorData = error.response.data;
          if (errorData?.error === 'invalid_grant') {
            // Check if this was a config token that failed
            const tokenAge = this.getTokenAge(refreshToken);
            if (tokenAge && tokenAge < 60) { // Less than 1 minute old
              throw new Error(`🔒 Config token was already used and rotated. Using stored rotated token instead.
This is normal when restarting shortly after token generation.`);
            } else {
              throw new Error(`🔒 Refresh token has expired (7-day limit or already used). Please generate a new token:
1. Run: node scripts/easy-oauth.js
2. Update your Homebridge config with the new initialRefreshToken
This happens when Homebridge is offline for 7+ consecutive days or when old tokens are reused.`);
            }
          } else if (errorData?.error === 'invalid_client') {
            throw new Error('🔒 Invalid client credentials. Check your Client ID and Client Secret in your Homebridge config.');
          }
        } else if (error.response.status === 401) {
          throw new Error(`🔒 Authentication failed - refresh token has expired or is invalid.
Generate a new token:
1. Run: node scripts/working-oauth.js  
2. Run: node scripts/token-exchange.js [AUTH_CODE]
3. Update your Homebridge config with the new initialRefreshToken`);
        }
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error('Unable to connect to Volvo OAuth server. Check your internet connection.');
      } else {
        this.logger.debug('OAuth refresh failed with network error:', error.message);
      }
      
      throw new Error(`OAuth token refresh failed: ${error.message || 'Unknown error'}`);
    }
  }

  async getValidAccessToken(refreshToken?: string): Promise<string> {
    // TRUE SERIALIZATION: Queue ALL token access to prevent concurrent conflicts
    if (this.tokenAccessQueue) {
      this.logger.debug('🔄 Token access already in progress, waiting for completion...');
      return await this.tokenAccessQueue;
    }

    // Create token access promise to serialize ALL concurrent requests
    this.tokenAccessQueue = this.doGetValidAccessToken(refreshToken);
    
    try {
      const result = await this.tokenAccessQueue;
      return result;
    } finally {
      // Clear the queue when done (success or failure)
      this.tokenAccessQueue = null;
    }
  }

  private async doGetValidAccessToken(refreshToken?: string): Promise<string> {
    // EMERGENCY FAIL-FAST: Block ALL OAuth operations if authentication has failed
    if (OAuthHandler.globalAuthFailure) {
      throw new Error('🔒 Authentication failed - plugin suspended until restart');
    }
    
    // Get the best available refresh token (stored > config)
    const bestToken = await this.getBestRefreshToken(refreshToken);
    
    if (!this.tokens && !bestToken) {
      throw new Error(`🔑 No initialRefreshToken found in configuration. Please generate a token:
1. Run: node scripts/working-oauth.js
2. Run: node scripts/token-exchange.js [AUTH_CODE]  
3. Add the initialRefreshToken to your Homebridge config`);
    }

    if (!this.tokens && bestToken) {
      this.logger.info(`🔄 Using ${bestToken.source} refresh token for initial authentication`);
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
          // Use the best available token (stored rotated token preferred over config)
          const tokenToUse = bestToken?.token || this.tokens.refreshToken;
          if (bestToken?.source === 'config') {
            this.logger.debug('🔄 Using config token for refresh (no stored token available)');
          } else if (bestToken?.source === 'stored') {
            this.logger.debug('🔄 Using stored rotated token for refresh');
          }
          this.tokens = await this.refreshAccessToken(tokenToUse);
          // Only log once per refresh, not per waiting request
        } catch (error) {
          this.handleAuthFailure(error);
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
    
    // Only log if token actually expired to reduce verbose output
    if (isExpired) {
      this.logger.debug('🔍 Token expired - will refresh');
    }
    
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

  private generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get approximate age of a token in seconds (for error analysis)
   */
  private getTokenAge(token: string): number | null {
    try {
      // Estimate based on current tokens if available
      if (this.tokens && this.tokens.refreshToken === token) {
        return (Date.now() - this.tokens.expiresAt) / 1000;
      }
      return null;
    } catch {
      return null;
    }
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
   * Get the best available refresh token (config > stored when config provided)
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
   * EMERGENCY AUTH FAILURE HANDLER - Sets global failure flag at OAuth level
   */
  private handleAuthFailure(error: any): void {
    if (this.isAuthenticationError(error)) {
      if (!OAuthHandler.globalAuthFailure) {
        // FIRST AUTH ERROR - Log once and shut down ALL OAuth operations
        OAuthHandler.globalAuthFailure = true;
        
        if (!OAuthHandler.authErrorLogged) {
          this.logger.error('🔒 Authentication failed - token expired');
          this.logger.error('   Generate new token: node scripts/easy-oauth.js');
          this.logger.error('⛔ Plugin suspended until restart');
          OAuthHandler.authErrorLogged = true;
        }
      }
    }
  }
  
  /**
   * Detect authentication/OAuth errors
   */
  private isAuthenticationError(error: any): boolean {
    const errorMessage = error?.message || error?.toString() || '';
    
    return errorMessage.includes('refresh token has expired') ||
           errorMessage.includes('Authentication failed') ||
           errorMessage.includes('invalid_grant') ||
           errorMessage.includes('7-day limit') ||
           errorMessage.includes('401') ||
           errorMessage.includes('403') ||
           (error?.response?.status === 401) ||
           (error?.response?.status === 403) ||
           (error?.code === 'invalid_grant');
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