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

// Your exact application credentials and scopes
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const clientSecret = '989jHbeioeEPJrusrlPtWn';
const vccApiKey = 'e88ac699aef74ed4af934993ea612999';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

// Exact scopes from your published application
const scopes = 'conve:fuel_status conve:brake_status conve:doors_status conve:trip_statistics conve:environment conve:odometer_status conve:honk_flash conve:command_accessibility conve:engine_status conve:commands conve:vehicle_relation conve:windows_status conve:navigation conve:tyre_status conve:connectivity_status conve:battery_charge_level conve:climatization_start_stop conve:engine_start_stop conve:lock openid conve:diagnostics_workshop conve:unlock conve:lock_status conve:diagnostics_engine_status conve:warnings';

// Generate PKCE parameters
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return hash.toString('base64url');
}

async function testCompleteOAuth() {
  console.log('🚗 Complete OAuth Test for New Connected Vehicle API Application');
  console.log('═'.repeat(70));
  console.log('');
  
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  
  // Build authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  const authUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${params.toString()}`;
  
  console.log('📋 Application Details:');
  console.log(`   Client ID: ${clientId}`);
  console.log(`   VCC API Key: ${vccApiKey}`);
  console.log(`   Redirect URI: ${redirectUri}`);
  console.log(`   Scopes: ${scopes.split(' ').length} scopes`);
  console.log('');
  
  console.log('🔗 Authorization URL:');
  console.log('─'.repeat(70));
  console.log(authUrl);
  console.log('─'.repeat(70));
  console.log('');
  
  console.log('📱 STEP 1: Open the URL above in your browser');
  console.log('📱 STEP 2: Sign in with your Volvo ID');
  console.log('📱 STEP 3: Authorize the application (approve all scopes)');
  console.log('📱 STEP 4: You\'ll be redirected to GitHub (shows error - that\'s normal)');
  console.log('📱 STEP 5: Copy the "code" parameter from the browser address bar');
  console.log('');
  console.log('Example redirect URL:');
  console.log(`${redirectUri}?code=ABC123XYZ456&state=...`);
  console.log('Copy just: ABC123XYZ456');
  console.log('');
  
  const authCode = await question('🔑 Enter the authorization code: ');
  
  if (!authCode.trim()) {
    console.error('❌ Authorization code is required');
    process.exit(1);
  }

  console.log('');
  console.log('🔄 Exchanging authorization code for tokens...');
  
  try {
    // Token exchange
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: authCode.trim(),
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const tokenResponse = await axios.post(
      'https://volvoid.eu.volvocars.com/as/token.oauth2',
      tokenParams,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 30000
      }
    );

    const tokens = {
      accessToken: tokenResponse.data.access_token,
      refreshToken: tokenResponse.data.refresh_token,
      expiresAt: Date.now() + (tokenResponse.data.expires_in * 1000),
    };

    console.log('✅ Token exchange successful!');
    console.log('');
    
    // Test Connected Vehicle API
    console.log('🧪 Testing Connected Vehicle API access...');
    
    const apiClient = axios.create({
      baseURL: 'https://api.volvocars.com/connected-vehicle/v2',
      headers: {
        'Authorization': `Bearer ${tokens.accessToken}`,
        'vcc-api-key': vccApiKey,
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    try {
      console.log('🔍 Fetching vehicle list...');
      const vehiclesResponse = await apiClient.get('/vehicles');
      
      console.log('✅ Connected Vehicle API test SUCCESSFUL!');
      console.log(`📊 Found ${vehiclesResponse.data.data?.length || 0} vehicle(s)`);
      
      if (vehiclesResponse.data.data && vehiclesResponse.data.data.length > 0) {
        vehiclesResponse.data.data.forEach((vehicle, i) => {
          console.log(`   ${i + 1}. ${vehicle.vin} - ${vehicle.modelYear} ${vehicle.model}`);
        });
      }
      
    } catch (apiError) {
      console.log('❌ Connected Vehicle API test failed:');
      console.log(`   Status: ${apiError.response?.status}`);
      console.log(`   Error: ${JSON.stringify(apiError.response?.data, null, 2)}`);
    }
    
    console.log('');
    console.log('🎫 YOUR REFRESH TOKEN:');
    console.log('═'.repeat(70));
    console.log(tokens.refreshToken);
    console.log('═'.repeat(70));
    console.log('');
    
    console.log('🏠 Homebridge Configuration:');
    console.log('Add this to your config.json platforms array:');
    console.log('');
    console.log('```json');
    console.log(JSON.stringify({
      "platform": "VolvoEX30",
      "name": "Volvo EX30",
      "vin": "YOUR_EX30_VIN_HERE",
      "clientId": clientId,
      "clientSecret": clientSecret,
      "vccApiKey": vccApiKey,
      "initialRefreshToken": tokens.refreshToken,
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
    console.log('🎉 OAuth setup complete! Your plugin should now work with the new credentials.');
    
  } catch (error) {
    console.error('❌ Token exchange failed:');
    console.error(`   Status: ${error.response?.status}`);
    console.error(`   Response: ${JSON.stringify(error.response?.data, null, 2)}`);
    console.error(`   Message: ${error.message}`);
    
    if (error.response?.data?.error === 'invalid_grant') {
      console.error('');
      console.error('💡 This usually means:');
      console.error('   • Authorization code already used (try getting a new one)');
      console.error('   • Authorization code expired (get a fresh one)');
      console.error('   • Code/redirect URI mismatch');
    }
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  testCompleteOAuth().catch(console.error);
}

module.exports = { testCompleteOAuth };