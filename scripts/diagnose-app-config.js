#!/usr/bin/env node

/**
 * Volvo Developer Portal Application Configuration Diagnostics
 * 
 * This script helps diagnose why your new Connected Vehicle API application
 * gives "invalid request" errors even with the official OAuth pattern.
 */

const client = require('openid-client');

console.log('🔍 Volvo Developer Portal Application Configuration Diagnostics');
console.log('═'.repeat(70));
console.log('');

// Your credentials
const newAppClientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const newAppClientSecret = '989jHbeioeEPJrusrlPtWn';
const newAppVccKey = 'e88ac699aef74ed4af934993ea612999';

// Test with a known working application (if you have old credentials)
// const oldAppClientId = 'YOUR_OLD_WORKING_CLIENT_ID';  // Uncomment if available

console.log('📋 New Application Details:');
console.log(`   Client ID: ${newAppClientId}`);
console.log(`   Client Secret: ${newAppClientSecret.substring(0, 8)}...`);
console.log(`   VCC API Key: ${newAppVccKey}`);
console.log('');

async function diagnoseConfiguration() {
  try {
    console.log('🔍 Test 1: OAuth Discovery...');
    
    const config = await client.discovery(
      new URL("https://volvoid.eu.volvocars.com"),
      newAppClientId,
      newAppClientSecret
    );
    
    console.log('✅ Discovery successful');
    console.log(`   Issuer: ${config.issuer || 'undefined'}`);
    console.log(`   Auth endpoint: ${config.authorization_endpoint || 'undefined'}`);
    console.log(`   Token endpoint: ${config.token_endpoint || 'undefined'}`);
    console.log('');
    
    console.log('🔍 Test 2: Minimal OAuth URL (openid scope only)...');
    
    const minimalParams = {
      redirect_uri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
      scope: 'openid'
    };

    const minimalUrl = client.buildAuthorizationUrl(config, minimalParams);
    
    console.log('✅ Minimal URL generated:');
    console.log(minimalUrl.href);
    console.log('');
    console.log('📝 TEST THIS URL FIRST (just openid scope):');
    console.log('   If this fails → Application configuration issue');
    console.log('   If this works → Scope configuration issue');
    console.log('');
    
    console.log('🔍 Test 3: OAuth URL without PKCE...');
    
    const noPkceParams = {
      redirect_uri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
      scope: 'openid conve:fuel_status conve:battery_charge_level'
    };

    const noPkceUrl = client.buildAuthorizationUrl(config, noPkceParams);
    
    console.log('✅ No-PKCE URL generated:');
    console.log(noPkceUrl.href);
    console.log('');
    console.log('📝 TEST THIS URL SECOND (no PKCE):');
    console.log('   If this works → PKCE requirement issue');
    console.log('   If this fails → Scope/redirect issue');
    console.log('');
    
    console.log('🔧 Troubleshooting Checklist:');
    console.log('');
    console.log('📋 Verify in Volvo Developer Portal:');
    console.log('   1. Application Status: Must be "Published" (not Draft)');
    console.log('   2. Client ID: Exactly matches "dc-towqtsl3ngkotpzdc6qlqhnxl"');
    console.log('   3. Application Type: Should be "Web Application"');
    console.log('   4. Redirect URIs: Must include exactly:');
    console.log('      "https://github.com/jcfield-boop/homebridge-volvoEX30"');
    console.log('   5. Grant Types: Must include "Authorization Code"');
    console.log('   6. Response Types: Must include "code"');
    console.log('   7. PKCE: Check if required or optional');
    console.log('');
    console.log('🔑 OAuth Configuration:');
    console.log('   8. All 25 scopes must be approved and active');
    console.log('   9. Scopes must match exactly what we\'re requesting');
    console.log('   10. No extra restrictions or limitations');
    console.log('');
    console.log('⚠️ Common Issues:');
    console.log('   • Application still in "Draft" status');
    console.log('   • Redirect URI has trailing slash or case mismatch');
    console.log('   • Client ID copy/paste error (common with long IDs)');
    console.log('   • Application created in wrong region/environment');
    console.log('   • Scopes not fully approved by Volvo');
    console.log('');
    console.log('🚨 If BOTH test URLs fail with "invalid request":');
    console.log('   → The issue is with basic application configuration');
    console.log('   → Double-check Client ID, Status, and Redirect URI');
    console.log('   → Consider creating a fresh application');
    console.log('');
    console.log('💡 If minimal URL works but full URL fails:');
    console.log('   → The issue is with specific scopes');
    console.log('   → Check which scopes are actually approved');
    console.log('   → Try adding scopes incrementally');
    
  } catch (error) {
    console.error('❌ Discovery failed:');
    console.error(`   Error: ${error.message}`);
    console.error('');
    console.error('🔧 This suggests:');
    console.error('   • Client credentials are invalid');
    console.error('   • Application doesn\'t exist or is not published');
    console.error('   • Network/connectivity issue');
  }
}

diagnoseConfiguration().catch(console.error);