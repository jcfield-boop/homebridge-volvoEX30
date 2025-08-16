#!/usr/bin/env node

/**
 * Token Exchange - Complete OAuth Flow
 * 
 * Exchange authorization code for access/refresh tokens
 * Using official Volvo pattern with PKCE verification
 */

const axios = require('axios');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Your credentials
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const clientSecret = '989jHbeioeEPJrusrlPtWn';
const vccApiKey = 'e88ac699aef74ed4af934993ea612999';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

async function exchangeCodeForTokens() {
  console.log('🔄 OAuth Token Exchange');
  console.log('═'.repeat(50));
  console.log('');
  
  try {
    const authCode = await question('🔑 Enter authorization code from redirect URL: ');
    const codeVerifier = await question('🔐 Enter code verifier from working-oauth.js: ');
    const state = await question('📊 Enter state from working-oauth.js: ');
    
    if (!authCode.trim() || !codeVerifier.trim() || !state.trim()) {
      console.error('❌ All parameters are required');
      process.exit(1);
    }
    
    console.log('');
    console.log('🔄 Exchanging authorization code for tokens...');
    
    // Token exchange following OAuth2 specification
    const tokenResponse = await axios.post(
      'https://volvoid.eu.volvocars.com/as/token.oauth2',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: authCode.trim(),
        redirect_uri: redirectUri,
        code_verifier: codeVerifier.trim()
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Token exchange successful!');
    console.log('');
    
    const tokens = tokenResponse.data;
    
    console.log('🎫 Token Details:');
    console.log(`   Access token: ${tokens.access_token.substring(0, 30)}...`);
    console.log(`   Refresh token: ${tokens.refresh_token.substring(0, 30)}...`);
    console.log(`   Expires in: ${tokens.expires_in} seconds (${Math.round(tokens.expires_in / 60)} minutes)`);
    console.log(`   Token type: ${tokens.token_type}`);
    console.log(`   Scope: ${tokens.scope || 'Not provided'}`);
    console.log('');
    
    // Test Connected Vehicle API access
    console.log('🧪 Testing Connected Vehicle API access...');
    
    const apiClient = axios.create({
      baseURL: 'https://api.volvocars.com/connected-vehicle/v2',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'vcc-api-key': vccApiKey,
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    try {
      const vehiclesResponse = await apiClient.get('/vehicles');
      
      console.log('✅ Connected Vehicle API access SUCCESSFUL!');
      console.log(`📊 Found ${vehiclesResponse.data.data?.length || 0} vehicle(s)`);
      
      if (vehiclesResponse.data.data && vehiclesResponse.data.data.length > 0) {
        console.log('');
        console.log('🚗 Your Vehicles:');
        vehiclesResponse.data.data.forEach((vehicle, i) => {
          console.log(`   ${i + 1}. ${vehicle.vin} - ${vehicle.modelYear} ${vehicle.model}`);
        });
      }
      
    } catch (apiError) {
      console.log('❌ Connected Vehicle API test failed:');
      console.log(`   Status: ${apiError.response?.status}`);
      console.log(`   Error: ${JSON.stringify(apiError.response?.data, null, 2)}`);
      console.log('');
      console.log('💡 This might indicate:');
      console.log('   • VCC API Key doesn\\'t have Connected Vehicle API access');
      console.log('   • OAuth scopes don\\'t include required permissions');
      console.log('   • No vehicles registered to your Volvo ID account');
    }
    
    console.log('');
    console.log('🎫 YOUR REFRESH TOKEN:');
    console.log('═'.repeat(50));
    console.log(tokens.refresh_token);
    console.log('═'.repeat(50));
    console.log('');
    
    console.log('🏠 Homebridge Configuration:');
    console.log('Update your config.json with these values:');
    console.log('');
    console.log('```json');
    console.log(JSON.stringify({
      "platform": "VolvoEX30",
      "name": "Volvo EX30",
      "vin": "YOUR_EX30_VIN_HERE",
      "clientId": clientId,
      "clientSecret": clientSecret,
      "vccApiKey": vccApiKey,
      "initialRefreshToken": tokens.refresh_token,
      "region": "eu",
      "apiPreference": "connected-first",
      "pollingInterval": 5,
      "enableBattery": true,
      "enableClimate": true,
      "enableLocks": true,
      "enableDoors": true,
      "enableDiagnostics": true
    }, null, 2));
    console.log('```');
    console.log('');
    console.log('🎉 SUCCESS! OAuth flow completed.');
    console.log('   Your plugin should now work with Connected Vehicle API v2.');
    
  } catch (error) {
    console.error('❌ Token exchange failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    console.error('');
    console.error('🔧 Common Issues:');
    console.error('   • Authorization code expired (try again quickly)');
    console.error('   • Code verifier doesn\\'t match code challenge');
    console.error('   • Authorization code already used');
    console.error('   • Client credentials incorrect');
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  exchangeCodeForTokens().catch(console.error);
}