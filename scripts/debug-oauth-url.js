// OAuth URL debugging script

const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

console.log('🔍 Testing different OAuth URL variations\n');

// Test 1: Minimal parameters (no PKCE, basic scopes)
const minimalParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid'
});

const minimalUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${minimalParams.toString()}`;

console.log('🧪 TEST 1 - Minimal (just openid scope, no PKCE):');
console.log(minimalUrl);
console.log('');

// Test 2: Basic Connected Vehicle scopes (no PKCE)
const basicParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid conve:fuel_status conve:battery_charge_level'
});

const basicUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${basicParams.toString()}`;

console.log('🧪 TEST 2 - Basic scopes (no PKCE):');
console.log(basicUrl);
console.log('');

// Test 3: Check different endpoint format
const altParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid'
});

const altUrl = `https://volvoid.eu.volvocars.com/oauth2/authorize?${altParams.toString()}`;

console.log('🧪 TEST 3 - Alternative endpoint format:');
console.log(altUrl);
console.log('');

// Test 4: Different base domain
const altDomainParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: 'openid'
});

const altDomainUrl = `https://id.volvocars.com/as/authorization.oauth2?${altDomainParams.toString()}`;

console.log('🧪 TEST 4 - Alternative domain:');
console.log(altDomainUrl);
console.log('');

console.log('📋 Instructions:');
console.log('1. Try each URL above in your browser');
console.log('2. See which one does NOT give "invalid request"'); 
console.log('3. The working one will show Volvo ID login page');
console.log('4. Let me know which test works!');
console.log('');
console.log('💡 If ALL tests fail with "invalid request", the issue is likely:');
console.log('   • Your application is not actually published');
console.log('   • Client ID is incorrect'); 
console.log('   • Redirect URI not properly configured in the application');
console.log('   • Application type/settings mismatch');