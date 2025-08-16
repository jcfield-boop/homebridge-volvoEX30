#!/usr/bin/env node

/**
 * OAuth Specification Compliance Testing
 * 
 * Systematically tests OAuth requests following Volvo documentation exactly:
 * - Required parameters in correct order
 * - STATE parameter (highly recommended by Volvo)
 * - Proper URL encoding
 * - PKCE vs non-PKCE variations
 */

const crypto = require('crypto');

console.log('🔍 OAuth Specification Compliance Testing');
console.log('═'.repeat(70));
console.log('');

const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

// Generate parameters
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

console.log('📋 Generated Parameters:');
console.log(`   Code verifier: ${codeVerifier.substring(0, 20)}...`);
console.log(`   Code challenge: ${codeChallenge.substring(0, 20)}...`);
console.log(`   State: ${state}`);
console.log('');

// Your approved scopes
const approvedScopes = [
  'conve:fuel_status', 'conve:brake_status', 'conve:doors_status', 'conve:trip_statistics',
  'conve:environment', 'conve:odometer_status', 'conve:honk_flash', 'conve:command_accessibility',
  'conve:engine_status', 'conve:commands', 'conve:vehicle_relation', 'conve:windows_status',
  'conve:navigation', 'conve:tyre_status', 'conve:connectivity_status', 'conve:battery_charge_level',
  'conve:climatization_start_stop', 'conve:engine_start_stop', 'conve:lock', 'openid',
  'conve:diagnostics_workshop', 'conve:unlock', 'conve:lock_status', 'conve:diagnostics_engine_status',
  'conve:warnings'
].join(' ');

console.log('🧪 TEST 1: Minimal Request (openid + state - NO PKCE)');
console.log('Following Volvo spec exactly, testing if PKCE is actually required');
console.log('');

// Test 1: Minimal without PKCE (maybe PKCE isn't required for your app)
const test1Params = new URLSearchParams();
test1Params.append('response_type', 'code');
test1Params.append('client_id', clientId);
test1Params.append('redirect_uri', redirectUri);
test1Params.append('scope', 'openid');
test1Params.append('state', state);

const test1Url = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${test1Params.toString()}`;
console.log('URL:', test1Url);
console.log('');

console.log('🧪 TEST 2: Minimal Request (openid + state + PKCE)');
console.log('Adding PKCE to minimal request');
console.log('');

// Test 2: Minimal with PKCE
const test2Params = new URLSearchParams();
test2Params.append('response_type', 'code');
test2Params.append('client_id', clientId);
test2Params.append('redirect_uri', redirectUri);
test2Params.append('scope', 'openid');
test2Params.append('state', state);
test2Params.append('code_challenge', codeChallenge);
test2Params.append('code_challenge_method', 'S256');

const test2Url = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${test2Params.toString()}`;
console.log('URL:', test2Url);
console.log('');

console.log('🧪 TEST 3: Basic CV Scopes (3 scopes + state + PKCE)');
console.log('Testing with basic Connected Vehicle scopes');
console.log('');

// Test 3: Basic scopes with full compliance
const basicScopes = 'openid conve:fuel_status conve:battery_charge_level';
const test3Params = new URLSearchParams();
test3Params.append('response_type', 'code');
test3Params.append('client_id', clientId);
test3Params.append('redirect_uri', redirectUri);
test3Params.append('scope', basicScopes);
test3Params.append('state', state);
test3Params.append('code_challenge', codeChallenge);
test3Params.append('code_challenge_method', 'S256');

const test3Url = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${test3Params.toString()}`;
console.log('URL:', test3Url);
console.log('');

console.log('🧪 TEST 4: All Scopes (25 scopes + state + PKCE)');
console.log('Full scope list with complete compliance');
console.log('');

// Test 4: All scopes with full compliance
const test4Params = new URLSearchParams();
test4Params.append('response_type', 'code');
test4Params.append('client_id', clientId);
test4Params.append('redirect_uri', redirectUri);
test4Params.append('scope', approvedScopes);
test4Params.append('state', state);
test4Params.append('code_challenge', codeChallenge);
test4Params.append('code_challenge_method', 'S256');

const test4Url = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${test4Params.toString()}`;
console.log('URL:', test4Url);
console.log('');

console.log('🧪 TEST 5: Manual Parameter Order (matching Volvo docs exactly)');
console.log('Building URL manually with exact parameter order from docs');
console.log('');

// Test 5: Manual construction with exact Volvo spec order
const test5Url = 'https://volvoid.eu.volvocars.com/as/authorization.oauth2' +
  '?response_type=code' +
  '&client_id=' + encodeURIComponent(clientId) +
  '&redirect_uri=' + encodeURIComponent(redirectUri) +
  '&scope=' + encodeURIComponent('openid') +
  '&state=' + encodeURIComponent(state) +
  '&code_challenge=' + encodeURIComponent(codeChallenge) +
  '&code_challenge_method=S256';

console.log('URL:', test5Url);
console.log('');

console.log('📝 TESTING PRIORITY:');
console.log('1. Try TEST 1 first (no PKCE) - maybe PKCE isn\'t required');
console.log('2. Try TEST 2 (minimal + PKCE) - basic compliance test');
console.log('3. Try TEST 5 (manual order) - exact spec parameter order');
console.log('4. If any work, try progressive scope testing');
console.log('');

console.log('🎯 EXPECTED RESULTS:');
console.log('• TEST 1 works → Your app doesn\'t require PKCE');
console.log('• TEST 2 works → PKCE required, scope issue was blocking');
console.log('• TEST 5 works → Parameter order was the issue');
console.log('• All fail → Application configuration problem in portal');
console.log('');

console.log('💾 Save for token exchange if any work:');
console.log(`CODE_VERIFIER: ${codeVerifier}`);
console.log(`STATE: ${state}`);
console.log('');

console.log('🔧 Key Changes Made:');
console.log('✅ Added STATE parameter (required by Volvo docs)');
console.log('✅ Tested without PKCE (maybe not required)');
console.log('✅ Manual parameter ordering (spec compliance)');
console.log('✅ Progressive scope complexity (isolate scope issues)');
console.log('✅ Proper URL encoding (prevent encoding issues)');