/**
 * Shared OAuth setup functionality for both CLI and Custom UI
 * Extracted from oauth-setup.js to ensure consistency
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  region?: 'eu' | 'na';
}

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthorizationResult {
  authUrl: string;
  codeVerifier: string;
  state: string;
}

export class SharedOAuthHandler {
  private httpClient: AxiosInstance;
  private codeVerifier: string | null = null;

  constructor(private config: OAuthConfig) {
    const baseURL = (config.region === 'na') 
      ? 'https://volvoid.volvocars.com'
      : 'https://volvoid.eu.volvocars.com';

    this.httpClient = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    });
  }

  /**
   * Generate authorization URL with PKCE parameters
   */
  generateAuthorizationUrl(redirectUri: string, state?: string): AuthorizationResult {
    // Generate PKCE parameters
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
    const generatedState = state || crypto.randomBytes(16).toString('hex');
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid conve:battery_charge_level conve:diagnostics_engine_status conve:warnings conve:doors_status conve:windows_status conve:commands',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: generatedState,
    });

    const authUrl = `${this.httpClient.defaults.baseURL}/as/authorization.oauth2?${params.toString()}`;
    
    return {
      authUrl,
      codeVerifier: this.codeVerifier,
      state: generatedState,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    codeVerifier?: string,
  ): Promise<OAuthTokens> {
    const verifier = codeVerifier || this.codeVerifier;
    
    if (!verifier) {
      throw new Error('Code verifier not found. Please generate authorization URL first.');
    }

    if (!this.config.clientSecret) {
      throw new Error('Client secret is required for token exchange.');
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    });

    try {
      const response = await this.httpClient.post('/as/token.oauth2', params);
      
      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
      };
    } catch (error: any) {
      if (error.response) {
        const errorData = error.response.data;
        if (errorData?.error === 'invalid_grant') {
          throw new Error('Invalid or expired authorization code. Please try the authorization process again.');
        } else if (errorData?.error === 'invalid_client') {
          throw new Error('Invalid client credentials. Check your Client ID and Client Secret.');
        }
        throw new Error(`OAuth error: ${errorData?.error_description || errorData?.error || 'Unknown error'}`);
      }
      throw new Error(`Network error during token exchange: ${error.message}`);
    }
  }

  /**
   * Discover Volvo OpenID endpoints
   */
  async discoverEndpoints(): Promise<{ authorization_endpoint: string; token_endpoint: string; issuer: string }> {
    try {
      const response = await this.httpClient.get('/.well-known/openid_configuration');
      return {
        authorization_endpoint: response.data.authorization_endpoint,
        token_endpoint: response.data.token_endpoint,
        issuer: response.data.issuer,
      };
    } catch (error: any) {
      // Fallback to default endpoints if discovery fails
      const baseURL = this.httpClient.defaults.baseURL || 'https://volvoid.eu.volvocars.com';
      return {
        authorization_endpoint: `${baseURL}/as/authorization.oauth2`,
        token_endpoint: `${baseURL}/as/token.oauth2`,
        issuer: baseURL,
      };
    }
  }

  private generateCodeVerifier(): string {
    // Generate 128 bytes of random data, base64url encode
    // This follows RFC 7636 specification for PKCE
    return crypto.randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private generateCodeChallenge(codeVerifier: string): string {
    // SHA256 hash of code verifier, base64url encoded
    // This follows RFC 7636 specification for PKCE
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return hash.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }
}