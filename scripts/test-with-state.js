#!/usr/bin/env node

/**
 * Test OAuth with required state parameter
 * Based on official Volvo documentation
 */

const crypto = require('crypto');

console.log('🔍 Testing OAuth with STATE parameter (as per official docs)');
console.log('═'.repeat(70));
console.log('');

// Your credentials
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

// Generate state parameter (recommended for CSRF protection)
const state = crypto.randomBytes(16).toString('hex');

console.log('📋 Following official Volvo documentation exactly:');
console.log('https://developer.volvocars.com/apis/docs/authorisation/#overview');
console.log('');

// Test 1: Minimal with state
console.log('🧪 TEST 1: Minimal (openid + state parameter)');
const test1Params = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid',
  state: state
});

const test1Url = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${test1Params.toString()}`;
console.log(test1Url);
console.log('');

// Test 2: Basic scopes with state
console.log('🧪 TEST 2: Basic scopes (openid + 2 conve scopes + state)');
const test2Params = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid conve:fuel_status conve:battery_charge_level',
  state: state
});

const test2Url = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${test2Params.toString()}`;
console.log(test2Url);
console.log('');

// Test 3: Check parameter ordering (sometimes sensitive)
console.log('🧪 TEST 3: Different parameter order');
const test3Url = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('openid')}&state=${state}`;
console.log(test3Url);
console.log('');

// Test 4: Manual URL construction (exactly as docs show)
console.log('🧪 TEST 4: Manual construction (matching docs format exactly)');
const manualUrl = 'https://volvoid.eu.volvocars.com/as/authorization.oauth2' +
  '?response_type=code' +
  '&client_id=' + clientId +
  '&redirect_uri=' + encodeURIComponent(redirectUri) +
  '&scope=' + encodeURIComponent('openid') +
  '&state=' + state;
console.log(manualUrl);
console.log('');

console.log('📝 Testing Instructions:');
console.log('1. Try TEST 1 first (most basic with state)');
console.log('2. If TEST 1 fails → fundamental app config issue');
console.log('3. If TEST 1 works → try TEST 2 for scope validation');
console.log('4. If all work → the issue was missing state parameter!');
console.log('');
console.log('🔑 Expected Success Response:');
console.log(`${redirectUri}?code=AUTHORIZATION_CODE&state=${state}`);
console.log('');
console.log('❌ Expected Error Response:');
console.log(`${redirectUri}?error=ERROR_CODE&error_description=DESCRIPTION&state=${state}`);
console.log('');

console.log('💾 Save this state value for validation:');
console.log(`STATE: ${state}`);
console.log('');
console.log('⚠️ Security Note:');
console.log('The state parameter prevents CSRF attacks. Verify the returned');
console.log('state matches the one sent in the request.');