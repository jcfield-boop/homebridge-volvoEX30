#!/usr/bin/env node

const crypto = require('crypto');

// Your new credentials
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

// Use EXACT scopes from your new published application
const scopes = 'conve:fuel_status conve:brake_status conve:doors_status conve:trip_statistics conve:environment conve:odometer_status conve:honk_flash conve:command_accessibility conve:engine_status conve:commands conve:vehicle_relation conve:windows_status conve:navigation conve:tyre_status conve:connectivity_status conve:battery_charge_level conve:climatization_start_stop conve:engine_start_stop conve:lock openid conve:diagnostics_workshop conve:unlock conve:lock_status conve:diagnostics_engine_status conve:warnings';

// Build URL with correct scopes for your new application
const params = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: scopes,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
});

const authUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${params.toString()}`;

console.log('🔧 Testing with EXACT scopes from your published application');
console.log('');
console.log('Client ID:', clientId);
console.log('Redirect URI:', redirectUri);
console.log('');
console.log('✅ Application Scopes (25 scopes):');
const scopeList = scopes.split(' ');
scopeList.forEach((scope, i) => {
  console.log(`${(i + 1).toString().padStart(2)}: ${scope}`);
});
console.log('');
console.log('🔗 Authorization URL:');
console.log(authUrl);
console.log('');
console.log('📝 Code Verifier (save for token exchange):');
console.log(codeVerifier);
console.log('');
console.log('💡 This should work since it matches your published application scopes exactly!');