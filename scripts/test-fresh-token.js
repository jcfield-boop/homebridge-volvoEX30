#!/usr/bin/env node

/**
 * Test Fresh Token - Check if your new token actually works
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

const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const clientSecret = '989jHbeioeEPJrusrlPtWn';
const vccApiKey = 'e88ac699aef74ed4af934993ea612999';

async function testToken() {
  console.log('🧪 Fresh Token Test');
  console.log('═'.repeat(40));
  console.log('');
  
  try {
    const refreshToken = await question('🔑 Enter your fresh refresh token: ');
    
    if (!refreshToken.trim()) {
      console.error('❌ No token provided');
      process.exit(1);
    }
    
    console.log('');
    console.log('🔄 Testing token refresh...');
    
    // Try to refresh the token
    const tokenResponse = await axios.post(
      'https://volvoid.eu.volvocars.com/as/token.oauth2',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken.trim()
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Token refresh SUCCESSFUL!');
    console.log(`   New access token: ${tokenResponse.data.access_token.substring(0, 30)}...`);
    console.log(`   Expires in: ${tokenResponse.data.expires_in} seconds`);
    console.log('');
    
    // Test API access with new token
    console.log('🧪 Testing API access...');
    
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
    
    console.log('✅ API access SUCCESSFUL!');
    console.log(`   Found ${apiResponse.data.data?.length || 0} vehicles`);
    
    if (apiResponse.data.data && apiResponse.data.data.length > 0) {
      console.log('');
      console.log('🚗 Your Vehicles:');
      apiResponse.data.data.forEach((vehicle, i) => {
        console.log(`   ${i + 1}. ${vehicle.vin} - ${vehicle.modelYear} ${vehicle.model}`);
      });
    }
    
    console.log('');
    console.log('🎉 Your token is WORKING perfectly!');
    console.log('   The issue is that Homebridge is running an old version.');
    console.log('   Update to v2.0.7 to fix the OAuth spam.');
    
  } catch (error) {
    console.error('❌ Token test failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    if (error.response?.status === 400 && error.response?.data?.error === 'invalid_grant') {
      console.error('');
      console.error('🔍 This means:');
      console.error('   • Token is actually expired/invalid');
      console.error('   • Need to generate a completely fresh token');
      console.error('   • Run: node scripts/easy-oauth.js again');
    }
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  testToken().catch(console.error);
}