#!/usr/bin/env node

const readline = require('readline');
const axios = require('axios');
const crypto = require('crypto');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

class NewCredentialsOAuthHandler {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.codeVerifier = null;
    
    // Use discovery endpoint for OAuth URLs
    this.discoveryUrl = 'https://volvoid.eu.volvocars.com/.well-known/openid_configuration';
    this.endpoints = null;
    
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    });

    if (config.region === 'na') {
      this.discoveryUrl = 'https://volvoid.volvocars.com/.well-known/openid_configuration';
    }
  }

  async discoverEndpoints() {
    if (this.endpoints) {
      return this.endpoints;
    }

    try {
      const response = await this.httpClient.get(this.discoveryUrl);
      this.endpoints = {
        authorization_endpoint: response.data.authorization_endpoint,
        token_endpoint: response.data.token_endpoint,
        issuer: response.data.issuer
      };
      this.logger.info('✅ Discovered OAuth endpoints:', this.endpoints);
      return this.endpoints;
    } catch (error) {
      this.logger.error('❌ Failed to discover OAuth endpoints:', error.message);
      throw error;
    }
  }

  async getAuthorizationUrl(redirectUri, state) {
    // Discover endpoints first
    const endpoints = await this.discoverEndpoints();
    
    // Generate PKCE parameters
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
    
    // Use Connected Vehicle API scopes - matching your new application
    const scopes = [
      'openid',
      'conve:fuel_status',
      'conve:climatization_start_stop', 
      'conve:unlock',
      'conve:lock_status',
      'conve:lock',
      'conve:battery_charge_level',
      'conve:diagnostics_engine_status',
      'conve:warnings',
      'conve:doors_status',
      'conve:windows_status',
      'conve:odometer_status',
      'conve:statistics',
      'conve:engine_status',
      'conve:engine_diagnostics',
      'conve:brakes_status'
    ].join(' ');
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (state) {
      params.append('state', state);
    }

    const authUrl = `${endpoints.authorization_endpoint}?${params.toString()}`;
    this.logger.info('📱 Generated authorization URL with Connected Vehicle scopes');
    return authUrl;
  }

  async exchangeCodeForTokens(code, redirectUri) {
    try {
      if (!this.codeVerifier) {
        throw new Error('Code verifier not found. Please generate authorization URL first.');
      }
      
      const endpoints = await this.discoverEndpoints();
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        redirect_uri: redirectUri,
        code_verifier: this.codeVerifier,
      });

      const response = await this.httpClient.post(endpoints.token_endpoint, params);

      const tokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
      };

      this.codeVerifier = null; // Clear code verifier after successful exchange
      this.logger.info('✅ Successfully obtained OAuth tokens');
      
      return tokens;
    } catch (error) {
      this.logger.error('❌ Failed to exchange code for tokens:', error.response?.data || error.message);
      if (error.response?.data) {
        this.logger.error('Full error response:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error('OAuth token exchange failed');
    }
  }

  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(codeVerifier) {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return hash.toString('base64url');
  }
}

async function testNewCredentialsOAuth() {
  console.log('🚗 Testing New Connected Vehicle API Credentials\n');
  
  try {
    // Your new credentials from the previous conversation
    const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
    const clientSecret = '989jHbeioeEPJrusrlPtWn';
    const vccApiKey = 'e88ac699aef74ed4af934993ea612999';
    const region = 'eu'; // Assuming EU region
    
    console.log('Using credentials:');
    console.log(`Client ID: ${clientId}`);
    console.log(`VCC API Key: ${vccApiKey}`);
    console.log(`Region: ${region}\n`);
    
    const redirectUri = await question('Enter your OAuth Redirect URI [https://github.com/jcfield-boop/homebridge-volvoEX30]: ') || 'https://github.com/jcfield-boop/homebridge-volvoEX30';
    
    const oauthHandler = new NewCredentialsOAuthHandler(
      {
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

    console.log('\n🔄 Discovering OAuth endpoints...');
    await oauthHandler.discoverEndpoints();

    const authUrl = await oauthHandler.getAuthorizationUrl(redirectUri);
    
    console.log('\n📱 Authorization Required');
    console.log('Please open this URL in your browser and authorize the application:');
    console.log(`\n${authUrl}\n`);
    console.log('After authorization, you will be redirected to your configured redirect URI.');
    console.log('The redirect will show an error page (this is normal).');
    console.log('Copy the "code" parameter from the redirected URL.');
    console.log(`Example: ${redirectUri}?code=ABC123&state=xyz`);
    console.log('Copy "ABC123" from the code parameter.\n');
    
    const authCode = await question('Enter the authorization code from the redirect URL: ');
    
    if (!authCode) {
      console.error('❌ Authorization code is required');
      process.exit(1);
    }

    console.log('\n🔄 Exchanging code for tokens...');
    
    const tokens = await oauthHandler.exchangeCodeForTokens(authCode, redirectUri);
    
    console.log('\n✅ OAuth setup complete!');
    console.log('\nYour new refresh token:');
    console.log('\n```');
    console.log(tokens.refreshToken);
    console.log('```\n');
    
    console.log('Add this to your Homebridge config:');
    console.log('\n```json');
    console.log(JSON.stringify({
      name: "Volvo EX30",
      vin: "YOUR_VIN_HERE",
      clientId: clientId,
      clientSecret: clientSecret,
      vccApiKey: vccApiKey,
      initialRefreshToken: tokens.refreshToken,
      region: region,
      apiPreference: "connected-first",
      enableBattery: true,
      enableClimate: true,
      enableLocks: true,
      enableDoors: true,
      enableDiagnostics: true
    }, null, 2));
    console.log('```\n');
    
    console.log('🧪 Testing API access with new tokens...');
    
    // Test API access
    const apiClient = axios.create({
      baseURL: 'https://api.volvocars.com/connected-vehicle/v2',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'vcc-api-key': vccApiKey,
        'Accept': 'application/json'
      }
    });
    
    try {
      const vehiclesResponse = await apiClient.get('/vehicles');
      console.log('✅ API test successful! Found', vehiclesResponse.data.data?.length || 0, 'vehicles');
      if (vehiclesResponse.data.data?.length > 0) {
        console.log('Vehicles:', vehiclesResponse.data.data.map(v => `${v.vin} (${v.modelYear} ${v.model})`));
      }
    } catch (apiError) {
      console.log('⚠️ API test failed:', apiError.response?.data || apiError.message);
      console.log('This might be normal if you don\'t have vehicles in your account yet.');
    }
    
  } catch (error) {
    console.error('\n❌ OAuth setup failed:', error.message);
    if (error.response?.data) {
      console.error('Full error details:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  testNewCredentialsOAuth().catch(console.error);
}

module.exports = { testNewCredentialsOAuth };