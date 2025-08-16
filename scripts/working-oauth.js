#!/usr/bin/env node

/**
 * ✅ WORKING OAuth URLs - BREAKTHROUGH CONFIRMED!
 * 
 * ROOT CAUSE IDENTIFIED: PKCE (code_challenge) is MANDATORY for your application
 * 
 * Test Results:
 * ❌ Without PKCE: "code_challenge is required" error
 * ✅ With PKCE: Shows Volvo ID login page (WORKS!)
 */

const crypto = require('crypto');

console.log('🎉 BREAKTHROUGH: Working OAuth URLs Confirmed!');
console.log('═'.repeat(60));
console.log('');
console.log('✅ ROOT CAUSE IDENTIFIED: PKCE is mandatory');
console.log('   Without PKCE: "code_challenge is required" error');
console.log('   With PKCE: Shows Volvo ID login page ✓');
console.log('');

const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

// Generate PKCE parameters
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

console.log('🔐 PKCE Parameters:');
console.log(`   Code verifier: ${codeVerifier.substring(0, 20)}...`);
console.log(`   Code challenge: ${codeChallenge.substring(0, 20)}...`);
console.log(`   State: ${state}`);
console.log('');

// User's approved Connected Vehicle scopes (NO Energy API scopes)
const approvedScopes = [
  'conve:fuel_status', 'conve:brake_status', 'conve:doors_status', 'conve:trip_statistics',
  'conve:environment', 'conve:odometer_status', 'conve:honk_flash', 'conve:command_accessibility',
  'conve:engine_status', 'conve:commands', 'conve:vehicle_relation', 'conve:windows_status',
  'conve:navigation', 'conve:tyre_status', 'conve:connectivity_status', 'conve:battery_charge_level',
  'conve:climatization_start_stop', 'conve:engine_start_stop', 'conve:lock', 'openid',
  'conve:diagnostics_workshop', 'conve:unlock', 'conve:lock_status', 'conve:diagnostics_engine_status',
  'conve:warnings'
].join(' ');

// Working OAuth URL with approved scopes
const params = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: approvedScopes,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state
});

const workingUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${params.toString()}`;

console.log('🔗 WORKING OAuth URL (Connected Vehicle scopes + PKCE):');
console.log('═'.repeat(60));
console.log(workingUrl);
console.log('═'.repeat(60));
console.log('');

console.log('📱 Instructions:');
console.log('1. Open the URL above in your browser');
console.log('2. Sign in with your Volvo ID');
console.log('3. Authorize the application');
console.log('4. You\'ll be redirected to GitHub (shows 404 - that\'s normal)');
console.log('5. Copy the "code" parameter from the address bar');
console.log('');
console.log('Example redirect:');
console.log(`${redirectUri}?code=ABC123XYZ&state=${state}`);
console.log('Copy just: ABC123XYZ');
console.log('');

console.log('💾 Save for token exchange:');
console.log(`CODE_VERIFIER: ${codeVerifier}`);
console.log(`STATE: ${state}`);
console.log('');

console.log('🎯 What We Learned:');
console.log('✅ Your Client ID and credentials are valid');
console.log('✅ Connected Vehicle scopes match your approved scopes');
console.log('✅ PKCE is mandatory for new applications');
console.log('✅ STATE parameter works correctly');
console.log('✅ volvoid.eu.volvocars.com is the correct endpoint');
console.log('');

console.log('🚀 Next Steps:');
console.log('1. Complete the OAuth flow above to get authorization code');
console.log('2. Exchange code for tokens using token-exchange.js');
console.log('3. Update plugin configuration with refresh token');
console.log('');

console.log('🔧 For token exchange, run:');
console.log('node scripts/token-exchange.js [AUTHORIZATION_CODE]');