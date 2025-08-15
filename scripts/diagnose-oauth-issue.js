#!/usr/bin/env node

const axios = require('axios');
const crypto = require('crypto');

// Diagnostic script to identify OAuth issues
const CLIENT_ID = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const CLIENT_SECRET = '989jHbeioeEPJrusrlPtWn';
const VCC_API_KEY = 'e88ac699aef74ed4af934993ea61299';

console.log('🔍 Diagnosing OAuth Setup Issues');
console.log('='.repeat(50));
console.log('');

// Test 1: Check if Client ID format is valid
console.log('📋 Test 1: Client ID Analysis');
console.log(`Client ID: ${CLIENT_ID}`);
console.log(`Length: ${CLIENT_ID.length}`);
console.log(`Format: ${/^[a-zA-Z0-9-]+$/.test(CLIENT_ID) ? 'Valid' : 'Invalid'}`);
console.log(`Prefix: ${CLIENT_ID.startsWith('dc-') ? 'Correct (dc-)' : 'Unexpected'}`);
console.log('');

// Test 2: Try different redirect URIs
const redirectURIs = [
  'https://github.com/jcfield-boop/homebridge-volvoEX30',
  'https://localhost:8080/callback',
  'https://developer.volvocars.com/callback',
  'urn:ietf:wg:oauth:2.0:oob'
];

console.log('🔗 Test 2: Testing Different Redirect URIs');
console.log('');

for (const redirectUri of redirectURIs) {
  console.log(`Testing: ${redirectUri}`);
  
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid',  // Minimal scope first
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  
  const authUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${params.toString()}`;
  console.log(`URL: ${authUrl.substring(0, 100)}...`);
  console.log('');
}

// Test 3: Try different scope combinations
console.log('🔐 Test 3: Testing Different Scope Combinations');
console.log('');

const scopeCombinations = [
  'openid',
  'openid conve:vehicle_relation',
  'openid conve:battery_charge_level',
  'conve:fuel_status conve:battery_charge_level openid',
  'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid energy:state:read energy:capability:read conve:battery_charge_level conve:diagnostics_engine_status conve:warnings'
];

for (let i = 0; i < scopeCombinations.length; i++) {
  const scope = scopeCombinations[i];
  console.log(`Scope Set ${i + 1}: ${scope}`);
  
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
    scope: scope,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });
  
  const authUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${params.toString()}`;
  console.log(`URL: ${authUrl.substring(0, 120)}...`);
  console.log('');
}

// Test 4: Check if we can discover OpenID configuration
console.log('🌐 Test 4: Testing OpenID Discovery');
console.log('');

async function testOpenIDDiscovery() {
  try {
    const response = await axios.get('https://volvoid.eu.volvocars.com/.well-known/openid_configuration', {
      timeout: 10000
    });
    
    console.log('✅ OpenID Discovery successful');
    console.log(`Authorization Endpoint: ${response.data.authorization_endpoint}`);
    console.log(`Token Endpoint: ${response.data.token_endpoint}`);
    console.log(`Supported Scopes: ${response.data.scopes_supported?.join(', ') || 'Not listed'}`);
    
  } catch (error) {
    console.log('❌ OpenID Discovery failed:', error.message);
  }
}

// Test 5: Test basic authorization endpoint
console.log('🔧 Test 5: Testing Authorization Endpoint Availability');
console.log('');

async function testAuthEndpoint() {
  try {
    // Just test if the endpoint responds (should return error but not network failure)
    const response = await axios.get('https://volvoid.eu.volvocars.com/as/authorization.oauth2', {
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log(`✅ Authorization endpoint reachable (Status: ${response.status})`);
    
  } catch (error) {
    console.log('❌ Authorization endpoint unreachable:', error.message);
  }
}

async function runDiagnostics() {
  await testOpenIDDiscovery();
  console.log('');
  await testAuthEndpoint();
  
  console.log('');
  console.log('🎯 NEXT STEPS:');
  console.log('1. Try the minimal scope URL (openid only) first');
  console.log('2. Check Volvo Developer Portal for:');
  console.log('   - Application status (Active vs Pending)');
  console.log('   - Configured redirect URIs');
  console.log('   - Approved scopes list');
  console.log('3. If still failing, the new app may need manual approval');
  console.log('');
  console.log('📝 Copy one of the test URLs above and try in browser');
}

runDiagnostics().catch(console.error);