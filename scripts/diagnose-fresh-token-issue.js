#!/usr/bin/env node

/**
 * Diagnostic Script: Fresh Token Rejection Issue
 * 
 * This script investigates why fresh tokens (generated 15 minutes ago) 
 * are being immediately rejected as "7-day limit reached".
 * 
 * Usage: node scripts/diagnose-fresh-token-issue.js [FRESH_TOKEN]
 */

const axios = require('axios');

// Credentials from easy-oauth.js
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const clientSecret = '989jHbeioeEPJrusrlPtWn';
const vccApiKey = 'e88ac699aef74ed4af934993ea612999';

async function diagnoseFreshTokenIssue(refreshToken) {
  console.log('🔍 OAuth Application Configuration Diagnostic');
  console.log('═'.repeat(60));
  console.log('');
  
  if (!refreshToken) {
    console.error('❌ No refresh token provided');
    console.error('Usage: node scripts/diagnose-fresh-token-issue.js [FRESH_TOKEN]');
    process.exit(1);
  }
  
  console.log('📋 Diagnostic Information:');
  console.log(`   Client ID: ${clientId}`);
  console.log(`   Token Length: ${refreshToken.length} chars`);
  console.log(`   Token Prefix: ${refreshToken.substring(0, 12)}...`);
  console.log('');
  
  // Test 1: Check OpenID Configuration
  console.log('🔍 TEST 1: OpenID Configuration Discovery');
  try {
    const discoveryResponse = await axios.get('https://volvoid.eu.volvocars.com/.well-known/openid_configuration', {
      timeout: 10000
    });
    
    console.log('✅ OpenID Discovery successful');
    console.log(`   Token Endpoint: ${discoveryResponse.data.token_endpoint}`);
    console.log(`   Authorization Endpoint: ${discoveryResponse.data.authorization_endpoint}`);
    console.log(`   Issuer: ${discoveryResponse.data.issuer}`);
    console.log('');
  } catch (error) {
    console.log('❌ OpenID Discovery failed:', error.message);
    console.log('');
  }
  
  // Test 2: Token Refresh Attempt
  console.log('🔍 TEST 2: Token Refresh Analysis');
  try {
    const tokenResponse = await axios.post(
      'https://volvoid.eu.volvocars.com/as/token.oauth2',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Token refresh SUCCESSFUL!');
    console.log('   New access token received');
    console.log(`   Expires in: ${tokenResponse.data.expires_in} seconds`);
    console.log(`   Token type: ${tokenResponse.data.token_type}`);
    
    if (tokenResponse.data.refresh_token) {
      console.log('   ⚠️  New refresh token provided (token rotation)');
    } else {
      console.log('   ℹ️  Same refresh token can be reused');
    }
    console.log('');
    
    // Test 3: API Access Test
    console.log('🔍 TEST 3: Connected Vehicle API Access');
    try {
      const apiResponse = await axios.get(
        'https://api.volvocars.com/connected-vehicle/v2/vehicles',
        {
          headers: {
            'Authorization': `Bearer ${tokenResponse.data.access_token}`,
            'vcc-api-key': vccApiKey,
            'Accept': 'application/json'
          },
          timeout: 15000
        }
      );
      
      console.log('✅ Connected Vehicle API access SUCCESSFUL!');
      console.log(`   Found ${apiResponse.data.data?.length || 0} vehicle(s)`);
      
      if (apiResponse.data.data && apiResponse.data.data.length > 0) {
        console.log('   Vehicles:');
        apiResponse.data.data.forEach((vehicle, i) => {
          console.log(`     ${i + 1}. ${vehicle.vin} - ${vehicle.modelYear} ${vehicle.model}`);
        });
      }
      console.log('');
      
    } catch (apiError) {
      console.log('❌ Connected Vehicle API access FAILED:');
      console.log(`   Status: ${apiError.response?.status}`);
      console.log(`   Error: ${JSON.stringify(apiError.response?.data, null, 2)}`);
      console.log('');
    }
    
  } catch (tokenError) {
    console.log('❌ Token refresh FAILED:');
    console.log(`   Status: ${tokenError.response?.status}`);
    console.log(`   Error Data:`, JSON.stringify(tokenError.response?.data, null, 2));
    console.log('');
    
    // Detailed error analysis
    if (tokenError.response?.status === 400) {
      const errorData = tokenError.response.data;
      console.log('🔍 ERROR ANALYSIS:');
      
      if (errorData?.error === 'invalid_grant') {
        console.log('   ❌ INVALID_GRANT: This indicates one of:');
        console.log('      1. Refresh token has expired (7-day limit)');
        console.log('      2. Refresh token was revoked');
        console.log('      3. Refresh token was issued by different client');
        console.log('      4. OAuth application configuration mismatch');
        console.log('');
        
        // Check if this is a fresh token issue
        console.log('🚨 FRESH TOKEN REJECTION ANALYSIS:');
        console.log('   If this token was generated within the last hour, possible causes:');
        console.log('   1. Client ID/Secret mismatch between generation and usage');
        console.log('   2. OAuth application has been reconfigured/regenerated');
        console.log('   3. Token was generated with different environment (dev vs prod)');
        console.log('   4. Volvo ID account has conflicting applications');
        console.log('   5. Rate limiting or temporary OAuth service issues');
        
      } else if (errorData?.error === 'invalid_client') {
        console.log('   ❌ INVALID_CLIENT: OAuth application not found or credentials wrong');
        console.log('      Check Client ID and Client Secret in Volvo Developer Portal');
        
      } else {
        console.log(`   ❌ UNKNOWN ERROR: ${errorData?.error}`);
        console.log(`      Description: ${errorData?.error_description || 'None provided'}`);
      }
      
    } else if (tokenError.response?.status === 401) {
      console.log('🔍 ERROR ANALYSIS:');
      console.log('   ❌ UNAUTHORIZED: Client authentication failed');
      console.log('      - Check Client ID and Client Secret');
      console.log('      - Verify OAuth application is approved for production');
      
    } else {
      console.log('🔍 ERROR ANALYSIS:');
      console.log('   ❌ UNEXPECTED HTTP ERROR');
      console.log('      This may indicate network issues or OAuth service problems');
    }
    console.log('');
  }
  
  // Test 4: Configuration Recommendations
  console.log('🔧 CONFIGURATION RECOMMENDATIONS:');
  console.log('');
  
  console.log('1. Verify OAuth Application Status:');
  console.log('   - Log into Volvo Developer Portal');
  console.log('   - Check if application is approved for production');
  console.log('   - Verify redirect URIs match exactly');
  console.log('');
  
  console.log('2. Generate Fresh Credentials:');
  console.log('   - Create new OAuth application if current one is corrupted');
  console.log('   - Note down new Client ID, Client Secret, VCC API Key');
  console.log('   - Update easy-oauth.js with new credentials');
  console.log('');
  
  console.log('3. Token Generation Best Practices:');
  console.log('   - Use tokens immediately after generation');
  console.log('   - Don\'t store tokens for extended periods');
  console.log('   - Regenerate if unused for more than 1 hour');
  console.log('');
  
  console.log('4. Check for Multiple Applications:');
  console.log('   - Ensure only one active OAuth app per Volvo ID account');
  console.log('   - Delete old/unused applications to avoid conflicts');
  console.log('');
  
  console.log('🔗 Next Steps:');
  console.log('   1. Try generating a completely fresh token now');
  console.log('   2. If still failing, recreate OAuth application');
  console.log('   3. Consider contacting Volvo Developer Support');
}

// Get refresh token from command line
const refreshToken = process.argv[2];

if (require.main === module) {
  diagnoseFreshTokenIssue(refreshToken).catch(console.error);
}