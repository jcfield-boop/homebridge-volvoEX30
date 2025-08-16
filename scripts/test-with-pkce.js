#!/usr/bin/env node

/**
 * Test OAuth with PKCE (required for new applications)
 * Using the correct endpoint: https://volvoid.eu.volvocars.com/as/authorization.oauth2
 */

const crypto = require('crypto');

console.log('🔐 Testing OAuth with PKCE (Required for New Applications)');
console.log('═'.repeat(70));
console.log('');

// Your credentials  
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

// Generate PKCE parameters (as per Volvo docs)
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return hash.toString('base64url');
}

const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);
const state = crypto.randomBytes(16).toString('hex');

console.log('🔧 Generated PKCE parameters:');
console.log(`   Code verifier: ${codeVerifier.substring(0, 20)}...`);
console.log(`   Code challenge: ${codeChallenge.substring(0, 20)}...`);
console.log(`   State: ${state}`);
console.log('');

// Test 1: Minimal with PKCE
console.log('🧪 TEST 1: Minimal (openid + PKCE + state)');
const minimalParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state
});

const minimalUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${minimalParams.toString()}`;
console.log(minimalUrl);
console.log('');

// Test 2: Basic scopes with PKCE
console.log('🧪 TEST 2: Basic scopes + PKCE');
const basicParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid conve:fuel_status conve:battery_charge_level',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state
});

const basicUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${basicParams.toString()}`;
console.log(basicUrl);
console.log('');

// All 25 scopes your application has
const allScopes = [
  'conve:fuel_status', 'conve:brake_status', 'conve:doors_status', 'conve:trip_statistics',
  'conve:environment', 'conve:odometer_status', 'conve:honk_flash', 'conve:command_accessibility',
  'conve:engine_status', 'conve:commands', 'conve:vehicle_relation', 'conve:windows_status',
  'conve:navigation', 'conve:tyre_status', 'conve:connectivity_status', 'conve:battery_charge_level',
  'conve:climatization_start_stop', 'conve:engine_start_stop', 'conve:lock', 'openid',
  'conve:diagnostics_workshop', 'conve:unlock', 'conve:lock_status', 'conve:diagnostics_engine_status',
  'conve:warnings'
].join(' ');

// Test 3: All scopes with PKCE
console.log('🧪 TEST 3: All 25 scopes + PKCE');
const fullParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: allScopes,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state
});

const fullUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${fullParams.toString()}`;
console.log(fullUrl);
console.log('');

console.log('📝 Testing Order:');
console.log('1. Try TEST 1 first (minimal with PKCE)');
console.log('2. If it works → PKCE was the missing piece!');
console.log('3. If it works, try TEST 2, then TEST 3');
console.log('4. The goal is to find which scopes your app accepts');
console.log('');

console.log('🎯 Expected Success:');
console.log(`${redirectUri}?code=AUTHORIZATION_CODE&state=${state}`);
console.log('');

console.log('💾 Save for token exchange:');
console.log(`CODE_VERIFIER: ${codeVerifier}`);
console.log(`STATE: ${state}`);
console.log('');

console.log('🔥 BREAKTHROUGH: We found the right endpoint AND the PKCE requirement!');
console.log('   This should finally work with your new application.');