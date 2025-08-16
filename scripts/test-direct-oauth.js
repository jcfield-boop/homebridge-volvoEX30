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

class DirectOAuthHandler {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.codeVerifier = null;
    
    // Use direct endpoints based on working oauth-setup.js
    this.authEndpoint = 'https://volvoid.eu.volvocars.com/as/authorization.oauth2';
    this.tokenEndpoint = 'https://volvoid.eu.volvocars.com/as/token.oauth2';
    
    this.httpClient = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    });

    if (config.region === 'na') {
      this.authEndpoint = 'https://volvoid.volvocars.com/as/authorization.oauth2';
      this.tokenEndpoint = 'https://volvoid.volvocars.com/as/token.oauth2';
    }
  }

  getAuthorizationUrl(redirectUri, state) {
    // Generate PKCE parameters
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
    
    // Use the EXACT same scopes as your working oauth-setup.js but with Connected Vehicle focus
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
      'conve:brakes_status',
      'conve:tyres_status'
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

    const authUrl = `${this.authEndpoint}?${params.toString()}`;
    this.logger.info('📱 Generated authorization URL with Connected Vehicle scopes');
    this.logger.info('🔧 Using scopes:', scopes.split(' ').length, 'scopes');
    return authUrl;
  }

  async exchangeCodeForTokens(code, redirectUri) {
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

      this.logger.info('🔄 Attempting token exchange...');
      this.logger.info('Token endpoint:', this.tokenEndpoint);

      const response = await this.httpClient.post(this.tokenEndpoint, params);

      const tokens = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: Date.now() + (response.data.expires_in * 1000),
      };

      this.codeVerifier = null; // Clear code verifier after successful exchange
      this.logger.info('✅ Successfully obtained OAuth tokens');
      
      return tokens;
    } catch (error) {
      this.logger.error('❌ Token exchange failed');
      this.logger.error('Status:', error.response?.status);
      this.logger.error('Response data:', JSON.stringify(error.response?.data, null, 2));
      this.logger.error('Error message:', error.message);
      throw new Error(`OAuth token exchange failed: ${error.response?.data?.error_description || error.message}`);
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

async function testDirectOAuth() {
  console.log('🚗 Testing Direct OAuth Endpoints with New Credentials\n');
  
  try {
    // Your new Connected Vehicle API credentials
    const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
    const clientSecret = '989jHbeioeEPJrusrlPtWn'; 
    const vccApiKey = 'e88ac699aef74ed4af934993ea612999';
    const region = 'eu';
    
    console.log('🔧 Using credentials:');
    console.log(`Client ID: ${clientId}`);
    console.log(`VCC API Key: ${vccApiKey}`);
    console.log(`Region: ${region}\n`);
    
    const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
    
    const oauthHandler = new DirectOAuthHandler(
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

    console.log('📱 Generating authorization URL...');
    const authUrl = oauthHandler.getAuthorizationUrl(redirectUri);
    
    console.log('\n🔗 Authorization URL:');
    console.log(`${authUrl}\n`);
    
    console.log('📋 Manual Steps:');
    console.log('1. Open the URL above in your browser');
    console.log('2. Sign in with your Volvo ID');
    console.log('3. Authorize the application');
    console.log('4. You\'ll be redirected to the GitHub page (this shows an error - that\'s normal)');
    console.log('5. Look at the browser address bar for the code parameter');
    console.log(`6. Example URL: ${redirectUri}?code=ABC123XYZ&state=...`);
    console.log('7. Copy just the code value (ABC123XYZ in the example)\n');
    
    const authCode = await question('📝 Enter the authorization code from the redirect URL: ');
    
    if (!authCode) {
      console.error('❌ Authorization code is required');
      process.exit(1);
    }

    console.log('\n🔄 Exchanging authorization code for tokens...');
    
    const tokens = await oauthHandler.exchangeCodeForTokens(authCode, redirectUri);
    
    console.log('\n✅ OAuth flow completed successfully!');
    console.log('\n🎫 Your new refresh token:');
    console.log('━'.repeat(60));
    console.log(tokens.refreshToken);
    console.log('━'.repeat(60));
    
    console.log('\n📋 Homebridge Configuration:');
    console.log('Add this to your config.json platforms array:');
    console.log('\n```json');
    console.log(JSON.stringify({
      "platform": "VolvoEX30",
      "name": "Volvo EX30",
      "vin": "YOUR_VIN_HERE",
      "clientId": clientId,
      "clientSecret": clientSecret,
      "vccApiKey": vccApiKey,
      "initialRefreshToken": tokens.refreshToken,
      "region": region,
      "apiPreference": "connected-first",
      "pollingInterval": 5,
      "enableBattery": true,
      "enableClimate": true,
      "enableLocks": true,
      "enableDoors": true,
      "enableDiagnostics": true
    }, null, 2));
    console.log('```\n');
    
    console.log('🧪 Testing Connected Vehicle API access...');
    
    // Test Connected Vehicle API access
    const apiClient = axios.create({
      baseURL: 'https://api.volvocars.com/connected-vehicle/v2',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'vcc-api-key': vccApiKey,
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    try {
      console.log('🔍 Fetching vehicle list...');
      const vehiclesResponse = await apiClient.get('/vehicles');
      console.log('✅ Connected Vehicle API test successful!');
      
      if (vehiclesResponse.data.data && vehiclesResponse.data.data.length > 0) {
        console.log(`📊 Found ${vehiclesResponse.data.data.length} vehicle(s):`);
        vehiclesResponse.data.data.forEach(vehicle => {
          console.log(`   • ${vehicle.vin} - ${vehicle.modelYear} ${vehicle.model}`);
        });
      } else {
        console.log('📊 No vehicles found in your account.');
      }
      
    } catch (apiError) {
      console.log('⚠️ Connected Vehicle API test failed:');
      console.log('Status:', apiError.response?.status);
      console.log('Error:', apiError.response?.data || apiError.message);
      console.log('\nThis might be normal if:');
      console.log('• Your VCC API Key doesn\'t have Connected Vehicle API access');
      console.log('• Your OAuth scopes don\'t include vehicle access');
      console.log('• Your Volvo ID account doesn\'t have vehicles registered');
    }
    
    console.log('\n🎉 OAuth setup complete! Use the refresh token in your Homebridge configuration.');
    
  } catch (error) {
    console.error('\n❌ OAuth setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  testDirectOAuth().catch(console.error);
}

module.exports = { testDirectOAuth };