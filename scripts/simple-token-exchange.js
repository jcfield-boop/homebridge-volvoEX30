#!/usr/bin/env node

/**
 * Simple Token Exchange - Just pass the authorization code
 * 
 * Usage: node scripts/simple-token-exchange.js YOUR_AUTH_CODE
 */

const axios = require('axios');
const crypto = require('crypto');

// Your credentials
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const clientSecret = '989jHbeioeEPJrusrlPtWn';
const vccApiKey = 'e88ac699aef74ed4af934993ea612999';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

// Get auth code from command line
const authCode = process.argv[2];

if (!authCode) {
  console.error('❌ Usage: node scripts/simple-token-exchange.js YOUR_AUTH_CODE');
  console.error('');
  console.error('Example:');
  console.error('  node scripts/simple-token-exchange.js U1aP4yOR9dwFFnlwTw5SLeb7sG32xMuQbWM8NFxr');
  process.exit(1);
}

// Generate fresh PKCE - this won't work with existing auth codes
// We need to use the original code verifier from working-oauth.js
console.log('❌ ERROR: This approach won\'t work!');
console.log('');
console.log('The authorization code is tied to the ORIGINAL code verifier from working-oauth.js');
console.log('You need to use the code verifier that was generated when you got the auth code.');
console.log('');
console.log('Please look back at the output from working-oauth.js and find these lines:');
console.log('💾 Save for token exchange:');
console.log('CODE_VERIFIER: [some long string]');
console.log('STATE: [some long string]');
console.log('');
console.log('Then run:');
console.log('node scripts/token-exchange.js');
console.log('');
console.log('And enter:');
console.log(`- Authorization code: ${authCode}`);
console.log('- Code verifier: [from working-oauth.js output]');
console.log('- State: 62d680f35b42a7610ef4edfb9d3d9ded');