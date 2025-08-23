/**
 * OAuth Handler Tests
 * Tests for OAuth token management and PKCE flow
 */

import axios from 'axios';
import { OAuthHandler } from '../src/auth/oauth-handler';
import { TokenStorage } from '../src/storage/token-storage';
import { mockLogger, testUtils, createMockAxiosResponse } from './setup';

// Mock dependencies
jest.mock('../src/storage/token-storage');
jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedTokenStorage = TokenStorage as jest.MockedClass<typeof TokenStorage>;

describe('OAuthHandler', () => {
  let oauthHandler: OAuthHandler;
  let mockTokenStorage: jest.Mocked<TokenStorage>;
  const mockConfig = testUtils.mockConfig;

  beforeEach(() => {
    // Reset static properties
    (OAuthHandler as any).globalAuthFailure = false;
    (OAuthHandler as any).authErrorLogged = false;
    
    // Setup mocks
    mockTokenStorage = new MockedTokenStorage() as jest.Mocked<TokenStorage>;
    MockedTokenStorage.mockImplementation(() => mockTokenStorage);
    
    const mockHttpClient = {
      post: jest.fn(),
      defaults: { baseURL: 'https://volvoid.eu.volvocars.com' },
    };
    mockedAxios.create = jest.fn().mockReturnValue(mockHttpClient as any);

    oauthHandler = new OAuthHandler(mockConfig, mockLogger);
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://volvoid.eu.volvocars.com',
        timeout: 15000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
      });
    });

    it('should create token storage instance', () => {
      expect(MockedTokenStorage).toHaveBeenCalledWith(mockConfig, mockLogger);
    });
  });

  describe('PKCE Generation', () => {
    it('should generate authorization URL with PKCE', () => {
      const authUrl = oauthHandler.generateAuthorizationUrl();
      
      expect(authUrl).toContain('https://volvoid.eu.volvocars.com/as/authorization.oauth2');
      expect(authUrl).toContain('response_type=code');
      expect(authUrl).toContain(`client_id=${mockConfig.clientId}`);
      expect(authUrl).toContain('code_challenge=');
      expect(authUrl).toContain('code_challenge_method=S256');
      expect(authUrl).toContain('state=');
    });

    it('should generate unique PKCE parameters for each request', () => {
      const url1 = oauthHandler.generateAuthorizationUrl();
      const url2 = oauthHandler.generateAuthorizationUrl();
      
      expect(url1).not.toBe(url2);
    });

    it('should include all required scopes', () => {
      const authUrl = oauthHandler.generateAuthorizationUrl();
      
      expect(authUrl).toContain('scope=');
      expect(authUrl).toContain('conve%3Abattery_charge_level');
      expect(authUrl).toContain('conve%3Alocks');
      expect(authUrl).toContain('openid');
    });
  });

  describe('Token Management', () => {
    it('should load tokens from storage on initialization', async () => {
      const mockTokens = testUtils.mockTokens;
      mockTokenStorage.loadTokens.mockResolvedValue(mockTokens);
      
      await oauthHandler.initialize();
      
      expect(mockTokenStorage.loadTokens).toHaveBeenCalled();
    });

    it('should refresh tokens when expired', async () => {
      const oldTokens = { ...testUtils.mockTokens, expires_in: -1 };
      const newTokens = testUtils.mockTokens;
      
      mockTokenStorage.loadTokens.mockResolvedValue(oldTokens);
      
      const mockHttpClient = mockedAxios.create() as any;
      mockHttpClient.post.mockResolvedValue(createMockAxiosResponse(newTokens));

      const accessToken = await oauthHandler.getValidAccessToken();
      
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/as/token.oauth2',
        expect.any(URLSearchParams),
      );
      expect(accessToken).toBe(newTokens.access_token);
    });

    it('should save refreshed tokens to storage', async () => {
      const oldTokens = { ...testUtils.mockTokens, expires_in: -1 };
      const newTokens = testUtils.mockTokens;
      
      mockTokenStorage.loadTokens.mockResolvedValue(oldTokens);
      mockTokenStorage.saveTokens.mockResolvedValue();
      
      const mockHttpClient = mockedAxios.create() as any;
      mockHttpClient.post.mockResolvedValue(createMockAxiosResponse(newTokens));

      await oauthHandler.getValidAccessToken();
      
      expect(mockTokenStorage.saveTokens).toHaveBeenCalledWith(newTokens);
    });
  });

  describe('Authorization Code Exchange', () => {
    it('should exchange authorization code for tokens', async () => {
      const authCode = 'test-auth-code';
      const codeVerifier = 'test-code-verifier';
      const expectedTokens = testUtils.mockTokens;
      
      const mockHttpClient = mockedAxios.create() as any;
      mockHttpClient.post.mockResolvedValue(createMockAxiosResponse(expectedTokens));

      const result = await oauthHandler.exchangeCodeForTokens(authCode, codeVerifier);
      
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/as/token.oauth2',
        expect.any(URLSearchParams)
      );
      expect(result).toEqual(expectedTokens);
    });

    it('should handle invalid authorization code', async () => {
      const authCode = 'invalid-code';
      const codeVerifier = 'test-verifier';
      
      const mockHttpClient = mockedAxios.create() as any;
      const error = new Error('Invalid code') as any;
      error.response = { 
        status: 400, 
        data: { error: 'invalid_grant', error_description: 'Invalid authorization code' }
      };
      mockHttpClient.post.mockRejectedValue(error);

      await expect(oauthHandler.exchangeCodeForTokens(authCode, codeVerifier))
        .rejects.toThrow('Invalid code');
    });

    it('should validate PKCE code verifier', async () => {
      const authCode = 'test-code';
      const invalidVerifier = 'wrong-verifier';
      
      const mockHttpClient = mockedAxios.create() as any;
      const error = new Error('PKCE validation failed') as any;
      error.response = { 
        status: 400, 
        data: { error: 'invalid_grant', error_description: 'PKCE validation failed' }
      };
      mockHttpClient.post.mockRejectedValue(error);

      await expect(oauthHandler.exchangeCodeForTokens(authCode, invalidVerifier))
        .rejects.toThrow('PKCE validation failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockTokenStorage.loadTokens.mockResolvedValue(testUtils.mockTokens);
      
      const mockHttpClient = mockedAxios.create() as any;
      const networkError = new Error('Network error') as any;
      networkError.code = 'ENOTFOUND';
      mockHttpClient.post.mockRejectedValue(networkError);

      await expect(oauthHandler.getValidAccessToken()).rejects.toThrow('Network error');
    });

    it('should set global auth failure flag on authentication errors', async () => {
      mockTokenStorage.loadTokens.mockResolvedValue(testUtils.mockTokens);
      
      const mockHttpClient = mockedAxios.create() as any;
      const authError = new Error('Authentication failed') as any;
      authError.response = { status: 401, data: { error: 'invalid_grant' } };
      mockHttpClient.post.mockRejectedValue(authError);

      await expect(oauthHandler.getValidAccessToken()).rejects.toThrow();
      
      expect(OAuthHandler.isGlobalAuthFailure).toBe(true);
    });

    it('should log authentication errors only once', async () => {
      mockTokenStorage.loadTokens.mockResolvedValue(testUtils.mockTokens);
      
      const mockHttpClient = mockedAxios.create() as any;
      const authError = new Error('Token expired') as any;
      authError.response = { status: 401, data: { error: 'invalid_grant' } };
      mockHttpClient.post.mockRejectedValue(authError);

      // First error should log
      await expect(oauthHandler.getValidAccessToken()).rejects.toThrow();
      
      // Second error should not log again
      await expect(oauthHandler.getValidAccessToken()).rejects.toThrow();
      
      // Only one error message should be logged
      expect(mockLogger.error).toHaveBeenCalledTimes(2); // One for failure, one for instructions
    });
  });

  describe('Token Validation', () => {
    it('should validate token expiry', async () => {
      const expiredTokens = {
        ...testUtils.mockTokens,
        expires_in: -3600, // Expired 1 hour ago
      };
      
      mockTokenStorage.loadTokens.mockResolvedValue(expiredTokens);
      
      const mockHttpClient = mockedAxios.create() as any;
      mockHttpClient.post.mockResolvedValue(createMockAxiosResponse(testUtils.mockTokens));

      const accessToken = await oauthHandler.getValidAccessToken();
      
      expect(mockHttpClient.post).toHaveBeenCalled(); // Should refresh
      expect(accessToken).toBe(testUtils.mockTokens.access_token);
    });

    it('should return existing valid tokens', async () => {
      const validTokens = {
        ...testUtils.mockTokens,
        expires_in: 3600, // Valid for 1 hour
      };
      
      mockTokenStorage.loadTokens.mockResolvedValue(validTokens);
      
      const mockHttpClient = mockedAxios.create() as any;

      const accessToken = await oauthHandler.getValidAccessToken();
      
      expect(mockHttpClient.post).not.toHaveBeenCalled(); // Should not refresh
      expect(accessToken).toBe(validTokens.access_token);
    });
  });

  describe('State Management', () => {
    it('should validate OAuth state parameter', () => {
      const authUrl = oauthHandler.generateAuthorizationUrl();
      const urlParams = new URLSearchParams(authUrl.split('?')[1]);
      const state = urlParams.get('state');
      
      expect(state).toBeTruthy();
      expect(state?.length).toBeGreaterThan(16); // Should be reasonably long
    });

    it('should maintain state consistency', () => {
      const authUrl = oauthHandler.generateAuthorizationUrl();
      const urlParams = new URLSearchParams(authUrl.split('?')[1]);
      const state = urlParams.get('state');
      
      // State should be stored internally for validation
      expect(state).toBeTruthy();
    });
  });
});