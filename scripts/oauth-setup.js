#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

class OAuthHandler {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    
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

  getAuthorizationUrl(redirectUri, state) {
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

  async exchangeCodeForTokens(code, redirectUri) {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: redirectUri,
      });

      const response = await this.httpClient.post('/as/token.oauth2', params);

      const tokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
      };

      this.logger.info('Successfully obtained OAuth tokens');
      
      return tokens;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);
      throw new Error('OAuth token exchange failed');
    }
  }
}

async function setupOAuth() {
  console.log('🚗 Volvo EX30 Homebridge Plugin OAuth Setup\n');
  
  try {
    const clientId = await question('Enter your Volvo API Client ID: ');
    const clientSecret = await question('Enter your Volvo API Client Secret: ');
    const region = await question('Enter your region (eu/na) [eu]: ') || 'eu';
    
    if (!clientId || !clientSecret) {
      console.error('❌ Client ID and Client Secret are required');
      process.exit(1);
    }

    if (!['eu', 'na'].includes(region)) {
      console.error('❌ Region must be either "eu" or "na"');
      process.exit(1);
    }

    const redirectUri = 'http://localhost:3000/callback';
    
    const oauthHandler = new OAuthHandler(
      {
        baseUrl: 'https://api.volvocars.com',
        clientId,
        clientSecret,
        region: region,
      },
      {
        debug: console.log,
        info: console.log,
        warn: console.warn,
        error: console.error,
      },
    );

    const authUrl = oauthHandler.getAuthorizationUrl(redirectUri);
    
    console.log('\n📱 Authorization Required');
    console.log('Please open this URL in your browser and authorize the application:');
    console.log(`\n${authUrl}\n`);
    console.log('After authorization, you will be redirected to a localhost URL.');
    console.log('Copy the "code" parameter from the redirected URL.');
    console.log('Example: http://localhost:3000/callback?code=ABC123&state=xyz');
    console.log('Copy "ABC123" from the code parameter.\n');
    
    const authCode = await question('Enter the authorization code from the redirect URL: ');
    
    if (!authCode) {
      console.error('❌ Authorization code is required');
      process.exit(1);
    }

    console.log('\n🔄 Exchanging code for tokens...');
    
    const tokens = await oauthHandler.exchangeCodeForTokens(authCode, redirectUri);
    
    console.log('\n✅ OAuth setup complete!');
    console.log('\nAdd this to your Homebridge config:');
    console.log('\n```json');
    console.log(JSON.stringify({
      refreshToken: tokens.refreshToken,
    }, null, 2));
    console.log('```\n');
    
    console.log('Your refresh token will be valid until you revoke access in your Volvo ID account.');
    console.log('Keep this token secure and do not share it.');
    
  } catch (error) {
    console.error('\n❌ OAuth setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  setupOAuth().catch(console.error);
}

module.exports = { setupOAuth };