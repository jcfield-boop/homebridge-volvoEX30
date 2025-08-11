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
    } catch (error) {
      this.logger.error('Failed to refresh tokens:', error);
      throw new Error('OAuth token refresh failed');
    }
  }

  async getValidAccessToken(refreshToken?: string): Promise<string> {
    if (!this.tokens && !refreshToken) {
      throw new Error('No tokens available. Please complete OAuth flow first.');
    }

    if (!this.tokens && refreshToken) {
      this.tokens = await this.refreshAccessToken(refreshToken);
    }

    if (this.tokens && this.isTokenExpired(this.tokens)) {
      if (!this.tokens.refreshToken && !refreshToken) {
        throw new Error('Token expired and no refresh token available');
      }
      this.tokens = await this.refreshAccessToken(this.tokens.refreshToken || refreshToken!);
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
    const buffer = 5 * 60 * 1000;
    return Date.now() >= (tokens.expiresAt - buffer);
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