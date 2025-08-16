#!/usr/bin/env node

/**
 * Official Volvo OAuth2 Pattern Implementation
 * Based on: https://github.com/volvo-cars/developer-portal-api-samples/tree/main/oauth2-code-flow-sample
 */

const readline = require('readline');
const client = require('openid-client');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// Your new Connected Vehicle API credentials
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const clientSecret = '989jHbeioeEPJrusrlPtWn';
const vccApiKey = 'e88ac699aef74ed4af934993ea612999';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

// Your application's exact approved scopes (25 scopes)
const scopes = 'conve:fuel_status conve:brake_status conve:doors_status conve:trip_statistics conve:environment conve:odometer_status conve:honk_flash conve:command_accessibility conve:engine_status conve:commands conve:vehicle_relation conve:windows_status conve:navigation conve:tyre_status conve:connectivity_status conve:battery_charge_level conve:climatization_start_stop conve:engine_start_stop conve:lock openid conve:diagnostics_workshop conve:unlock conve:lock_status conve:diagnostics_engine_status conve:warnings';

async function officialPatternOAuth() {
  console.log('🚗 Official Volvo OAuth2 Pattern - Connected Vehicle API');
  console.log('═'.repeat(65));
  console.log('');
  console.log('Following the gold standard implementation from:');
  console.log('https://github.com/volvo-cars/developer-portal-api-samples');
  console.log('');
  
  try {
    console.log('🔍 Step 1: Discovering OAuth endpoints...');
    
    // Discovery using official Volvo pattern
    const config = await client.discovery(
      new URL("https://volvoid.eu.volvocars.com"),
      clientId,
      clientSecret
    );
    
    console.log('✅ Discovery successful!');
    console.log(`   Issuer: ${config.issuer}`);
    console.log(`   Authorization endpoint: ${config.authorization_endpoint}`);
    console.log(`   Token endpoint: ${config.token_endpoint}`);
    console.log('');
    
    console.log('🔐 Step 2: Generating PKCE parameters...');
    
    // PKCE using official Volvo pattern
    const code_verifier = client.randomPKCECodeVerifier();
    const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
    
    console.log('✅ PKCE parameters generated');
    console.log(`   Code verifier: ${code_verifier.substring(0, 20)}...`);
    console.log(`   Code challenge: ${code_challenge.substring(0, 20)}...`);
    console.log('');
    
    console.log('🔗 Step 3: Building authorization URL...');
    
    // Authorization URL using official Volvo pattern
    const parameters = {
      redirect_uri: redirectUri,
      scope: scopes,
      code_challenge,
      code_challenge_method: "S256",
    };

    const loginUrl = client.buildAuthorizationUrl(config, parameters);
    
    console.log('✅ Authorization URL built');
    console.log('');
    console.log('📋 Application Configuration:');
    console.log(`   Client ID: ${clientId}`);
    console.log(`   VCC API Key: ${vccApiKey}`);
    console.log(`   Redirect URI: ${redirectUri}`);
    console.log(`   Scopes: ${scopes.split(' ').length} scopes`);
    console.log('');
    
    console.log('🔗 Authorization URL:');
    console.log('─'.repeat(65));
    console.log(loginUrl.href);
    console.log('─'.repeat(65));
    console.log('');
    
    console.log('📱 Instructions:');
    console.log('1. Open the URL above in your browser');
    console.log('2. Sign in with your Volvo ID');
    console.log('3. Authorize the application (approve all scopes)');
    console.log('4. You\'ll be redirected to GitHub (shows error - that\'s normal)');
    console.log('5. Copy the "code" parameter from the browser address bar');
    console.log('');
    console.log('Example redirect URL:');
    console.log(`${redirectUri}?code=ABC123XYZ&state=...`);
    console.log('Copy just: ABC123XYZ');
    console.log('');
    
    const authCode = await question('🔑 Enter the authorization code: ');
    
    if (!authCode.trim()) {
      console.error('❌ Authorization code is required');
      process.exit(1);
    }

    console.log('');
    console.log('🔄 Step 4: Exchanging code for tokens using official pattern...');
    
    // Token exchange using official Volvo pattern
    const currentURL = `${redirectUri}?code=${authCode.trim()}`;
    
    const tokenSet = await client.authorizationCodeGrant(
      config,
      new URL(currentURL),
      {
        pkceCodeVerifier: code_verifier,
        idTokenExpected: true
      }
    );
    
    console.log('✅ Token exchange successful!');
    console.log('');
    console.log('🎫 Token Details:');
    console.log(`   Access token: ${tokenSet.access_token.substring(0, 30)}...`);
    console.log(`   Refresh token: ${tokenSet.refresh_token.substring(0, 30)}...`);
    console.log(`   Expires in: ${tokenSet.expires_in} seconds`);
    console.log(`   Token type: ${tokenSet.token_type}`);
    console.log('');
    
    // Test Connected Vehicle API access
    console.log('🧪 Step 5: Testing Connected Vehicle API access...');
    
    const axios = require('axios');
    const apiClient = axios.create({
      baseURL: 'https://api.volvocars.com/connected-vehicle/v2',
      headers: {
        'Authorization': `Bearer ${tokenSet.access_token}`,
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
      console.log('   • VCC API Key doesn\'t have Connected Vehicle API access');
      console.log('   • OAuth scopes don\'t include required permissions');
      console.log('   • No vehicles registered to your Volvo ID account');
    }
    
    console.log('');
    console.log('🎫 YOUR REFRESH TOKEN:');
    console.log('═'.repeat(65));
    console.log(tokenSet.refresh_token);
    console.log('═'.repeat(65));
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
      "initialRefreshToken": tokenSet.refresh_token,
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
    console.log('🎉 SUCCESS! OAuth completed using official Volvo pattern.');
    console.log('   Your plugin should now work with the new Connected Vehicle API credentials.');
    
  } catch (error) {
    console.error('❌ OAuth flow failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.error) {
      console.error(`   OAuth Error: ${error.error}`);
      console.error(`   Description: ${error.error_description || 'No description'}`);
    }
    
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('   • Verify your Client ID and Client Secret are correct');
    console.error('   • Ensure your Volvo application is published (not draft)');
    console.error('   • Check that all required scopes are approved in your application');
    console.error('   • Confirm the redirect URI matches your application settings exactly');
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  officialPatternOAuth().catch(console.error);
}

module.exports = { officialPatternOAuth };