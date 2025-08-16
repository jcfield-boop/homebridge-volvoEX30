#!/usr/bin/env node

/**
 * Test Fresh Token Immediately
 * 
 * This script generates a fresh token and tests it immediately to see
 * if we can reproduce the "7-day limit reached" error on fresh tokens.
 * 
 * Usage: node scripts/test-fresh-token-immediate.js
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

// Credentials
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const clientSecret = '989jHbeioeEPJrusrlPtWn';
const vccApiKey = 'e88ac699aef74ed4af934993ea612999';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

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

async function testFreshTokenImmediate() {
  console.log('🧪 Fresh Token Immediate Test');
  console.log('═'.repeat(50));
  console.log('');
  console.log('This test will:');
  console.log('1. Generate OAuth URL');
  console.log('2. You complete OAuth flow');
  console.log('3. Exchange code for fresh token');
  console.log('4. IMMEDIATELY test refresh with same token');
  console.log('5. Attempt Connected Vehicle API access');
  console.log('');
  
  // Step 1: Generate OAuth URL
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  
  const authUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid conve:battery_charge_level conve:diagnostics_engine_status conve:warnings',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state
  })}`;
  
  console.log('🔗 STEP 1: Open this URL in your browser:');
  console.log(authUrl);
  console.log('');
  
  // Step 2: Get redirect URL from user
  const redirectUrl = await question('🔗 Paste the full redirect URL here: ');
  
  if (!redirectUrl.trim()) {
    console.error('❌ No URL provided');
    process.exit(1);
  }
  
  // Step 3: Parse the redirect URL
  const parsed = parseRedirectUrl(redirectUrl.trim());
  
  if (!parsed || !parsed.code) {
    console.error('❌ Invalid URL or no authorization code found');
    process.exit(1);
  }
  
  console.log('✅ Authorization code received');
  console.log('');
  
  try {
    // Step 4: Exchange code for tokens
    console.log('🔄 STEP 2: Exchanging authorization code for fresh tokens...');
    const tokenStartTime = Date.now();
    
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
    
    const tokenExchangeTime = Date.now() - tokenStartTime;
    console.log(`✅ Fresh tokens received in ${tokenExchangeTime}ms`);
    console.log(`   Access token expires in: ${tokenResponse.data.expires_in} seconds`);
    console.log('');
    
    // Step 5: IMMEDIATELY test refresh (this is the key test)
    console.log('🧪 STEP 3: IMMEDIATE refresh test (within seconds of generation)...');
    const refreshStartTime = Date.now();
    
    try {
      const refreshResponse = await axios.post(
        'https://volvoid.eu.volvocars.com/as/token.oauth2',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokenResponse.data.refresh_token,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          timeout: 15000
        }
      );
      
      const refreshTime = Date.now() - refreshStartTime;
      console.log(`✅ IMMEDIATE refresh SUCCESSFUL in ${refreshTime}ms`);
      console.log(`   New access token expires in: ${refreshResponse.data.expires_in} seconds`);
      
      if (refreshResponse.data.refresh_token && refreshResponse.data.refresh_token !== tokenResponse.data.refresh_token) {
        console.log('   🔄 Refresh token was rotated by Volvo');
      } else {
        console.log('   ♻️  Same refresh token can be reused');
      }
      console.log('');
      
      // Step 6: Test API access with refreshed token
      console.log('🌐 STEP 4: Testing Connected Vehicle API access...');
      const apiStartTime = Date.now();
      
      try {
        const apiResponse = await axios.get(
          'https://api.volvocars.com/connected-vehicle/v2/vehicles',
          {
            headers: {
              'Authorization': `Bearer ${refreshResponse.data.access_token}`,
              'vcc-api-key': vccApiKey,
              'Accept': 'application/json'
            },
            timeout: 15000
          }
        );
        
        const apiTime = Date.now() - apiStartTime;
        console.log(`✅ API access SUCCESSFUL in ${apiTime}ms`);
        console.log(`   Found ${apiResponse.data.data?.length || 0} vehicle(s)`);
        
        if (apiResponse.data.data && apiResponse.data.data.length > 0) {
          console.log('   Vehicles:');
          apiResponse.data.data.forEach((vehicle, i) => {
            console.log(`     ${i + 1}. ${vehicle.vin} - ${vehicle.modelYear} ${vehicle.model}`);
          });
        }
        console.log('');
        
        // SUCCESS SUMMARY
        console.log('🎉 SUCCESS SUMMARY:');
        console.log('═'.repeat(40));
        console.log(`✅ OAuth flow completed in ${tokenExchangeTime}ms`);
        console.log(`✅ IMMEDIATE refresh succeeded in ${refreshTime}ms`);
        console.log(`✅ API access succeeded in ${apiTime}ms`);
        console.log('');
        console.log('🔍 DIAGNOSIS: OAuth configuration is HEALTHY');
        console.log('   - Fresh tokens work correctly');
        console.log('   - Immediate refresh succeeds');
        console.log('   - API access is functional');
        console.log('');
        console.log('🎯 Your refresh token for testing:');
        console.log(refreshResponse.data.refresh_token || tokenResponse.data.refresh_token);
        
      } catch (apiError) {
        console.log(`❌ API access FAILED:`, apiError.response?.data || apiError.message);
      }
      
    } catch (refreshError) {
      console.log('❌ IMMEDIATE refresh FAILED:');
      console.log(`   Status: ${refreshError.response?.status}`);
      console.log(`   Error: ${JSON.stringify(refreshError.response?.data, null, 2)}`);
      console.log('');
      
      // This is the key diagnostic
      if (refreshError.response?.status === 400) {
        const errorData = refreshError.response.data;
        console.log('🚨 CRITICAL FINDING:');
        console.log(`   Error: ${errorData?.error}`);
        console.log(`   Description: ${errorData?.error_description}`);
        console.log('');
        
        if (errorData?.error === 'invalid_grant') {
          console.log('🔍 ANALYSIS: IMMEDIATE fresh token rejection');
          console.log('   This confirms the reported issue!');
          console.log('   Possible causes:');
          console.log('   1. Token rotation policy - refresh tokens are single-use');
          console.log('   2. OAuth application configuration changed');
          console.log('   3. Client ID/Secret mismatch in token generation vs usage');
          console.log('   4. Rate limiting on token refresh endpoint');
          console.log('   5. OAuth service issue at Volvo');
          console.log('');
          console.log('🎯 RECOMMENDED NEXT STEPS:');
          console.log('   1. Use the original access token instead of refreshing');
          console.log('   2. Only refresh when access token expires');
          console.log('   3. Investigate token rotation policy');
          console.log('   4. Contact Volvo Developer Support');
        }
      }
    }
    
  } catch (tokenError) {
    console.error('❌ Token exchange failed:');
    console.error(`   Status: ${tokenError.response?.status}`);
    console.error(`   Error: ${JSON.stringify(tokenError.response?.data, null, 2)}`);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  testFreshTokenImmediate().catch(console.error);
}