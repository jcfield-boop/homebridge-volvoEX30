#!/usr/bin/env node

/**
 * Minimal OAuth Script - Fallback Testing
 * 
 * Uses only 'openid' scope for basic authentication testing.
 * Use this if the full scope OAuth fails.
 */

const crypto = require('crypto');

console.log('🧪 Minimal OAuth Script - Fallback Testing');
console.log('═'.repeat(50));
console.log('');
console.log('This script uses only the "openid" scope for basic testing.');
console.log('If this works, the issue is with specific scopes.');
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

// Minimal scope - just openid
const minimalScope = 'openid';

// Minimal OAuth URL
const params = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: minimalScope,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  state: state
});

const minimalUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${params.toString()}`;

console.log('🔗 MINIMAL OAuth URL (openid only):');
console.log('═'.repeat(50));
console.log(minimalUrl);
console.log('═'.repeat(50));
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

console.log('🎯 Testing Strategy:');
console.log('✅ If this works → The issue is with specific scopes');
console.log('❌ If this fails → The issue is with client credentials or PKCE');
console.log('');

console.log('🔧 For token exchange, run:');
console.log('node scripts/token-exchange.js [AUTHORIZATION_CODE]');
console.log('');

console.log('⚠️  NOTE: This minimal token will have limited API access.');
console.log('   Use working-oauth.js for full Connected Vehicle API access.');