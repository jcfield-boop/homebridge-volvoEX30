#!/usr/bin/env node

/**
 * Easy OAuth - All-in-One Token Generation
 * 
 * Step 1: Generates OAuth URL
 * Step 2: You complete OAuth flow
 * Step 3: Paste the full redirect URL and get your token
 * 
 * Usage: node scripts/easy-oauth.js
 */

const axios = require('axios');
const crypto = require('crypto');
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

// All Connected Vehicle scopes
const scopes = 'conve:fuel_status conve:brake_status conve:doors_status conve:trip_statistics conve:environment conve:odometer_status conve:honk_flash conve:command_accessibility conve:engine_status conve:commands conve:vehicle_relation conve:windows_status conve:navigation conve:tyre_status conve:connectivity_status conve:battery_charge_level conve:climatization_start_stop conve:engine_start_stop conve:lock openid conve:diagnostics_workshop conve:unlock conve:lock_status conve:diagnostics_engine_status conve:warnings';

// Generate PKCE parameters
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return hash.toString('base64url');
}

function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

function parseRedirectUrl(url) {
  try {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');
    const error = urlObj.searchParams.get('error');
    
    return { code, state, error };
  } catch (err) {
    return null;
  }
}

async function easyOAuth() {
  console.log('🚗 Easy OAuth - Volvo EX30 Token Generator');
  console.log('═'.repeat(60));
  console.log('');
  
  // Step 1: Generate OAuth URL
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  
  const authUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state
  })}`;
  
  console.log('🔗 STEP 1: Open this URL in your browser:');
  console.log('═'.repeat(60));
  console.log(authUrl);
  console.log('═'.repeat(60));
  console.log('');
  console.log('📋 Instructions:');
  console.log('1. Open the URL above in any browser');
  console.log('2. Sign in with your Volvo ID');
  console.log('3. Authorize the application');
  console.log('4. You\'ll be redirected to GitHub (shows 404 - that\'s normal)');
  console.log('5. Copy the ENTIRE redirect URL from your browser address bar');
  console.log('');
  console.log('Example redirect URL:');
  console.log(`${redirectUri}?code=ABC123&state=${state}`);
  console.log('');
  
  // Step 2: Get redirect URL from user
  const redirectUrl = await question('🔗 Paste the full redirect URL here: ');
  
  if (!redirectUrl.trim()) {
    console.error('❌ No URL provided');
    process.exit(1);
  }
  
  // Step 3: Parse the redirect URL
  const parsed = parseRedirectUrl(redirectUrl.trim());
  
  if (!parsed) {
    console.error('❌ Invalid URL format');
    console.error('Please paste the complete redirect URL starting with https://github.com/...');
    process.exit(1);
  }
  
  if (parsed.error) {
    console.error(`❌ OAuth error: ${parsed.error}`);
    process.exit(1);
  }
  
  if (!parsed.code) {
    console.error('❌ No authorization code found in URL');
    process.exit(1);
  }
  
  if (parsed.state !== state) {
    console.error('❌ State mismatch - security check failed');
    console.error(`Expected: ${state}`);
    console.error(`Received: ${parsed.state}`);
    process.exit(1);
  }
  
  console.log('✅ Redirect URL parsed successfully!');
  console.log(`   Code: ${parsed.code}`);
  console.log(`   State: ${parsed.state} ✓`);
  console.log('');
  
  // Step 4: Exchange code for tokens
  console.log('🔄 Exchanging authorization code for tokens...');
  
  try {
    const tokenResponse = await axios.post(
      'https://volvoid.eu.volvocars.com/as/token.oauth2',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: parsed.code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier
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
    
    // Step 5: Test API access
    console.log('🧪 Testing Connected Vehicle API access...');
    
    try {
      const apiResponse = await axios.get(
        'https://api.volvocars.com/connected-vehicle/v2/vehicles',
        {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'vcc-api-key': vccApiKey,
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );
      
      console.log('✅ Connected Vehicle API access SUCCESSFUL!');
      console.log(`📊 Found ${apiResponse.data.data?.length || 0} vehicle(s)`);
      
      if (apiResponse.data.data && apiResponse.data.data.length > 0) {
        console.log('');
        console.log('🚗 Your Vehicles:');
        apiResponse.data.data.forEach((vehicle, i) => {
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
    console.log('═'.repeat(60));
    console.log(tokens.refresh_token);
    console.log('═'.repeat(60));
    console.log('');
    
    console.log('🏠 Homebridge Configuration:');
    console.log('Add this to your config.json:');
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
      "pollingInterval": 5,
      "enableBattery": true,
      "enableClimate": true,
      "enableLocks": true,
      "enableDoors": true,
      "enableDiagnostics": true
    }, null, 2));
    console.log('```');
    console.log('');
    console.log('🎉 SUCCESS! Your Volvo EX30 plugin should now work perfectly.');
    console.log('   With v2.0.12, ALL API activity stops after first auth error - zero spam.');
    
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
    console.error('   • Code already used (generate new URL and try again)');
    console.error('   • Network connectivity issues');
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  easyOAuth().catch(console.error);
}