import axios, { AxiosInstance } from 'axios';
import { Logger } from 'homebridge';
import { OAuthTokens, VolvoApiConfig } from '../types/config';

export class OAuthHandler {
  private readonly httpClient: AxiosInstance;
  private tokens: OAuthTokens | null = null;

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
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: 'openid profile care:read vehicle:read energy:read connected_vehicle:read extended_vehicle:read',
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.httpClient.defaults.baseURL}/as/authorization.oauth2?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: redirectUri,
      });

      const response = await this.httpClient.post('/as/token.oauth2', params);

      const tokens: OAuthTokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
      };

      this.tokens = tokens;
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
}