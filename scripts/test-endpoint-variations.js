#!/usr/bin/env node

/**
 * Test different OAuth endpoint variations
 * Sometimes different applications use different endpoints
 */

console.log('🔍 Testing Different OAuth Endpoint Variations');
console.log('═'.repeat(60));
console.log('');

const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

// Test different base domains/endpoints
const endpoints = [
  'https://volvoid.eu.volvocars.com/as/authorization.oauth2',
  'https://volvoid.volvocars.com/as/authorization.oauth2',
  'https://id.volvocars.com/as/authorization.oauth2',
  'https://auth.volvocars.com/as/authorization.oauth2',
  'https://api.volvocars.com/auth/authorization.oauth2'
];

const basicParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid'
});

console.log('🧪 Testing different OAuth endpoints:');
console.log('(Try these URLs one by one)');
console.log('');

endpoints.forEach((endpoint, i) => {
  const testUrl = `${endpoint}?${basicParams.toString()}`;
  console.log(`${i + 1}. ${endpoint}`);
  console.log(`   ${testUrl}`);
  console.log('');
});

console.log('💡 Instructions:');
console.log('1. Try each URL above in order');
console.log('2. The first one that doesn\'t show "invalid request" is correct');
console.log('3. If ALL show "invalid request" → application config issue');
console.log('4. If one works → we\'ve found the right endpoint for your app');
console.log('');

console.log('🎯 Most likely candidates:');
console.log('   • #1: Standard EU endpoint (should work)');
console.log('   • #2: US/Global endpoint');
console.log('   • #3: Alternative domain (if app uses different system)');
console.log('');

console.log('❗ If NONE work, the issue is definitely:');
console.log('   • Application status (not actually published)');
console.log('   • Redirect URI mismatch');  
console.log('   • Client ID copy/paste error');
console.log('   • Application in wrong environment/region');