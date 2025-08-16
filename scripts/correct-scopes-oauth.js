#!/usr/bin/env node

/**
 * BREAKTHROUGH: OAuth URL with CORRECT SCOPES
 * 
 * Now that we know the issue is scope mismatch, this generates
 * OAuth URLs using ONLY your approved Connected Vehicle API scopes.
 */

const crypto = require('crypto');

console.log('🎉 BREAKTHROUGH: Creating OAuth URLs with CORRECT SCOPES');
console.log('═'.repeat(70));
console.log('');

const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

console.log('✅ ROOT CAUSE IDENTIFIED: Scope mismatch');
console.log('   Previous URLs included Energy API scopes your app doesn\'t have');
console.log('   Your app only has Connected Vehicle API scopes approved');
console.log('');

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

console.log('🔐 Generated PKCE parameters:');
console.log(`   Code verifier: ${codeVerifier.substring(0, 20)}...`);
console.log(`   Code challenge: ${codeChallenge.substring(0, 20)}...`);
console.log('');

// ONLY your 25 approved Connected Vehicle API scopes (NO Energy API scopes)
const approvedScopes = [
  'conve:fuel_status',
  'conve:brake_status', 
  'conve:doors_status',
  'conve:trip_statistics',
  'conve:environment',
  'conve:odometer_status',
  'conve:honk_flash',
  'conve:command_accessibility',
  'conve:engine_status',
  'conve:commands',
  'conve:vehicle_relation',
  'conve:windows_status',
  'conve:navigation',
  'conve:tyre_status',
  'conve:connectivity_status',
  'conve:battery_charge_level',
  'conve:climatization_start_stop',
  'conve:engine_start_stop',
  'conve:lock',
  'openid',
  'conve:diagnostics_workshop',
  'conve:unlock',
  'conve:lock_status',
  'conve:diagnostics_engine_status',
  'conve:warnings'
];

const scopesString = approvedScopes.join(' ');

console.log('📋 Using ONLY your 25 approved Connected Vehicle API scopes:');
approvedScopes.forEach((scope, i) => {
  console.log(`   ${(i + 1).toString().padStart(2)}: ${scope}`);
});
console.log('');
console.log('❌ REMOVED Energy API scopes that caused the error:');
console.log('   • energy:state:read');
console.log('   • energy:capability:read');
console.log('');

// Build the correct OAuth URL
const params = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: scopesString,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256'
});

const correctUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${params.toString()}`;

console.log('🎯 CORRECTED OAuth URL (should work now):');
console.log('═'.repeat(70));
console.log(correctUrl);
console.log('═'.repeat(70));
console.log('');

console.log('🔍 What changed:');
console.log('   ✅ Using working endpoint: volvoid.eu.volvocars.com');
console.log('   ✅ PKCE parameters included');
console.log('   ✅ ONLY Connected Vehicle API scopes (no Energy API)');
console.log('   ✅ All 25 scopes your application has approved');
console.log('');

console.log('📝 Expected result:');
console.log('   • Should show Volvo ID login page (not invalid_scope error)');
console.log('   • After login, redirects to GitHub with authorization code');
console.log('   • Example: https://github.com/jcfield-boop/homebridge-volvoEX30?code=ABC123');
console.log('');

console.log('💾 Save for token exchange:');
console.log(`CODE_VERIFIER: ${codeVerifier}`);
console.log('');

console.log('🚀 This should finally work! The scope mismatch was the only issue.');

// Also create a minimal test (just openid) to verify basic OAuth works
console.log('');
console.log('🧪 BACKUP TEST: Minimal scopes (if above somehow still fails)');

const minimalParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid',
  code_challenge: codeChallenge,
  code_challenge_method: 'S256'
});

const minimalUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${minimalParams.toString()}`;
console.log(minimalUrl);
console.log('(Try this if the full URL somehow fails - just openid scope)');