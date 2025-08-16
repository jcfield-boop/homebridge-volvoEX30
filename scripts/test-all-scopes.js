#!/usr/bin/env node

/**
 * Test OAuth with ALL approved scopes
 * Since your app has access to all scopes, request ALL of them
 */

const crypto = require('crypto');

console.log('🔍 Testing OAuth with ALL APPROVED SCOPES');
console.log('═'.repeat(70));
console.log('');

// Your credentials
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

// Generate state parameter
const state = crypto.randomBytes(16).toString('hex');

// ALL 25 scopes your application has access to (exact list from your previous message)
const allApprovedScopes = [
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

const scopesString = allApprovedScopes.join(' ');

console.log('📋 Using ALL 25 approved scopes from your application:');
allApprovedScopes.forEach((scope, i) => {
  console.log(`   ${(i + 1).toString().padStart(2)}: ${scope}`);
});
console.log('');

console.log('🧪 FULL SCOPE TEST: All 25 approved scopes + state');

// Build URL with ALL approved scopes
const params = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: scopesString,
  state: state
});

const fullScopeUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${params.toString()}`;

console.log('🔗 OAuth URL with ALL approved scopes:');
console.log('─'.repeat(70));
console.log(fullScopeUrl);
console.log('─'.repeat(70));
console.log('');

console.log('💡 Theory: Your application expects ALL scopes to be requested');
console.log('   Some OAuth providers require exact scope matching');
console.log('   Since your app has 25 scopes approved, it might reject partial requests');
console.log('');

console.log('📝 If this works:');
console.log('   ✅ The issue was requesting fewer scopes than approved');
console.log('   ✅ Your application requires complete scope matching');
console.log('   ✅ We can proceed with token exchange');
console.log('');

console.log('📝 If this still fails:');
console.log('   ❌ Check if scopes are in the exact same order as approved');
console.log('   ❌ Verify each scope name matches exactly (no typos)');
console.log('   ❌ Consider recreating the application');
console.log('');

console.log('🔑 Expected Success Response:');
console.log(`${redirectUri}?code=AUTHORIZATION_CODE&state=${state}`);
console.log('');

console.log('💾 Save this state for validation:');
console.log(`STATE: ${state}`);
console.log('');

// Also create a version with scopes in different order (alphabetical)
const alphabeticalScopes = [...allApprovedScopes].sort();
const alphabeticalScopesString = alphabeticalScopes.join(' ');

const alphabeticalParams = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: redirectUri,
  scope: alphabeticalScopesString,
  state: state
});

const alphabeticalUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${alphabeticalParams.toString()}`;

console.log('🧪 ALTERNATIVE: Same scopes in alphabetical order');
console.log('(Try this if the above fails - sometimes order matters)');
console.log('─'.repeat(70));
console.log(alphabeticalUrl);
console.log('─'.repeat(70));
console.log('');

console.log('🎯 Try the first URL. If it works, we\'ve solved the OAuth issue!');