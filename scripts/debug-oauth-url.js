#!/usr/bin/env node

const crypto = require('crypto');

// Working oauth-setup.js method
class OAuthHandler {
  constructor(config) {
    this.config = config;
    this.codeVerifier = null;
  }

  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(codeVerifier) {
    const hash = crypto.createHash('sha256').update(codeVerifier).digest();
    return hash.toString('base64url');
  }

  getAuthorizationUrl(redirectUri, state) {
    // Generate PKCE parameters
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid energy:state:read energy:capability:read conve:battery_charge_level conve:diagnostics_engine_status conve:warnings',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    if (state) {
      params.append('state', state);
    }

    const baseURL = this.config.region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
    return `${baseURL}/as/authorization.oauth2?${params.toString()}`;
  }
}

// Test with new credentials
const config = {
  clientId: 'dc-towqtsl3ngkotpzdc6qlqhnxl',
  clientSecret: '989jHbeioeEPJrusrlPtWn',
  region: 'eu'
};

const oauthHandler = new OAuthHandler(config);
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
const authUrl = oauthHandler.getAuthorizationUrl(redirectUri);

console.log('🔐 Debug OAuth URL Generation');
console.log('');
console.log('Using exact oauth-setup.js method:');
console.log('');
console.log(authUrl);
console.log('');
console.log('Code Verifier stored:', !!oauthHandler.codeVerifier);
console.log('Code Verifier length:', oauthHandler.codeVerifier?.length);

// Also test if the issue is with the Client ID format
console.log('');
console.log('Client ID analysis:');
console.log('- Length:', config.clientId.length);
console.log('- Format check:', /^[a-zA-Z0-9-]+$/.test(config.clientId));
console.log('- Starts with dc-:', config.clientId.startsWith('dc-'));
console.log('');

// Compare with known working format (if you have an old working Client ID)
console.log('Compared to typical Volvo Client ID format:');
console.log('- Should be alphanumeric with dashes');
console.log('- Should start with application prefix');
console.log('- Length typically 20-40 characters');