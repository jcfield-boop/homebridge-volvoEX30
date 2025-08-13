import axios, { AxiosInstance } from 'axios';
import { Logger } from 'homebridge';
import { OAuthTokens, VolvoApiConfig } from '../types/config';
import * as crypto from 'crypto';

export class OAuthHandler {
  private readonly httpClient: AxiosInstance;
  private tokens: OAuthTokens | null = null;
  private codeVerifier: string | null = null;

  constructor(
    private readonly config: VolvoApiConfig,
    private readonly logger: Logger,
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
  }

  getAuthorizationUrl(redirectUri: string, state?: string): string {
    // Generate PKCE parameters
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid energy:state:read energy:capability:read conve:battery_charge_level conve:diagnostics_engine_status conve:warnings',
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
    try {
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

      this.tokens = tokens;
      this.logger.debug('Successfully refreshed OAuth tokens');
      
      return tokens;
    } catch (error: any) {
      // Log detailed error information for debugging
      if (error.response) {
        this.logger.error('OAuth refresh failed with HTTP error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          refreshTokenLength: refreshToken?.length || 0
        });

        // Handle specific OAuth error cases
        if (error.response.status === 400) {
          const errorData = error.response.data;
          if (errorData?.error === 'invalid_grant') {
            throw new Error('Refresh token is invalid or expired. Please re-authorize the application.');
          } else if (errorData?.error === 'invalid_client') {
            throw new Error('Invalid client credentials. Check your Client ID and Client Secret.');
          }
        } else if (error.response.status === 401) {
          throw new Error('Authentication failed. Your refresh token may be expired.');
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
    if (!this.tokens && !refreshToken) {
      throw new Error('No tokens available. Please complete OAuth flow first.');
    }

    if (!this.tokens && refreshToken) {
      this.logger.debug('🔄 Initial token refresh with provided refresh token');
      this.tokens = await this.refreshAccessToken(refreshToken);
    }

    if (this.tokens) {
      // Check if token is expired or should be proactively refreshed
      const isExpired = this.isTokenExpired(this.tokens);
      const shouldRefresh = this.shouldProactivelyRefresh(this.tokens);
      
      if (isExpired || shouldRefresh) {
        const reason = isExpired ? 'expired' : 'proactive refresh (Volvo tokens are short-lived)';
        this.logger.debug(`🔄 Refreshing token - reason: ${reason}`);
        
        if (!this.tokens.refreshToken && !refreshToken) {
          throw new Error('Token expired and no refresh token available');
        }
        
        try {
          this.tokens = await this.refreshAccessToken(this.tokens.refreshToken || refreshToken!);
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
    return Date.now() >= (tokens.expiresAt - buffer);
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
}