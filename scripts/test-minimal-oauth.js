#!/usr/bin/env node

const crypto = require('crypto');

// Your new credentials
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

// Generate PKCE parameters (same as working oauth-setup.js)
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return hash.toString('base64url');
}

const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

// Use EXACT same scopes as working oauth-setup.js
const scopes = 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid energy:state:read energy:capability:read conve:battery_charge_level conve:diagnostics_engine_status conve:warnings';

// Build URL with same parameters as working oauth-setup.js
const params = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: scopes,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
});

const authUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${params.toString()}`;

console.log('🔧 Testing with minimal parameters matching working oauth-setup.js');
console.log('');
console.log('Client ID:', clientId);
console.log('Redirect URI:', redirectUri);
console.log('Scopes:', scopes);
console.log('Code Challenge Method: S256');
console.log('');
console.log('🔗 Authorization URL:');
console.log(authUrl);
console.log('');
console.log('📝 Code Verifier (save this for token exchange):');
console.log(codeVerifier);
console.log('');
console.log('💡 Try this URL and let me know if it works or gives "invalid request"');