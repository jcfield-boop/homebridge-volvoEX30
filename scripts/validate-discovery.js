#!/usr/bin/env node

/**
 * Phase 1: Validate Client Credentials with Discovery Endpoint
 * 
 * This script thoroughly tests if your client credentials are valid
 * and can successfully perform endpoint discovery as per the official Volvo sample.
 */

const client = require('openid-client');

console.log('🔍 Phase 1: Client Credential & Discovery Validation');
console.log('═'.repeat(70));
console.log('');

// Your credentials
const clientId = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const clientSecret = '989jHbeioeEPJrusrlPtWn';
const vccApiKey = 'e88ac699aef74ed4af934993ea612999';

console.log('📋 Testing Credentials:');
console.log(`   Client ID: ${clientId}`);
console.log(`   Client Secret: ${clientSecret.substring(0, 8)}...${clientSecret.substring(clientSecret.length - 4)}`);
console.log(`   VCC API Key: ${vccApiKey}`);
console.log('');

async function validateDiscovery() {
  console.log('🔍 Test 1: Discovery Endpoint Validation');
  console.log('─'.repeat(50));
  
  try {
    console.log('📡 Attempting discovery with your credentials...');
    console.log('   Endpoint: https://volvoid.eu.volvocars.com');
    console.log('   Using openid-client library (same as official sample)');
    console.log('');
    
    // Exact same discovery call as official Volvo sample
    const config = await client.discovery(
      new URL("https://volvoid.eu.volvocars.com"),
      clientId,
      clientSecret
    );
    
    console.log('✅ Discovery SUCCESSFUL!');
    console.log('');
    console.log('📊 Discovered Configuration:');
    console.log(`   Issuer: ${config.issuer || 'UNDEFINED ❌'}`);
    console.log(`   Authorization endpoint: ${config.authorization_endpoint || 'UNDEFINED ❌'}`);
    console.log(`   Token endpoint: ${config.token_endpoint || 'UNDEFINED ❌'}`);
    console.log(`   UserInfo endpoint: ${config.userinfo_endpoint || 'Not provided'}`);
    console.log(`   JWKS URI: ${config.jwks_uri || 'Not provided'}`);
    console.log(`   Scopes supported: ${config.scopes_supported ? config.scopes_supported.join(' ') : 'Not provided'}`);
    console.log(`   Response types: ${config.response_types_supported ? config.response_types_supported.join(' ') : 'Not provided'}`);
    console.log(`   Grant types: ${config.grant_types_supported ? config.grant_types_supported.join(' ') : 'Not provided'}`);
    console.log(`   Code challenge methods: ${config.code_challenge_methods_supported ? config.code_challenge_methods_supported.join(' ') : 'Not provided'}`);
    console.log('');
    
    // Validate critical endpoints exist
    if (!config.authorization_endpoint || !config.token_endpoint) {
      console.log('❌ CRITICAL: Missing required endpoints!');
      console.log('   This explains why OAuth fails - discovery didn\'t return valid config');
      console.log('   Your credentials may not be valid for this environment');
      return false;
    }
    
    console.log('✅ All required endpoints discovered successfully');
    console.log('');
    
    // Test authorization URL generation with discovered config
    console.log('🔍 Test 2: Authorization URL Generation');
    console.log('─'.repeat(50));
    
    // Generate PKCE parameters using official methods
    const code_verifier = client.randomPKCECodeVerifier();
    const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
    
    console.log('📝 Generated PKCE parameters:');
    console.log(`   Code verifier: ${code_verifier.substring(0, 20)}...`);
    console.log(`   Code challenge: ${code_challenge.substring(0, 20)}...`);
    console.log('');
    
    // Test with minimal scope first
    console.log('🧪 Testing with minimal scope (openid only):');
    
    const minimalParameters = {
      redirect_uri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
      scope: 'openid',
      code_challenge,
      code_challenge_method: "S256",
    };

    const minimalUrl = client.buildAuthorizationUrl(config, minimalParameters);
    
    console.log('✅ Minimal authorization URL generated:');
    console.log(minimalUrl.href);
    console.log('');
    
    // Test with basic Connected Vehicle scopes
    console.log('🧪 Testing with basic Connected Vehicle scopes:');
    
    const basicParameters = {
      redirect_uri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
      scope: 'openid conve:fuel_status conve:battery_charge_level',
      code_challenge,
      code_challenge_method: "S256",
    };

    const basicUrl = client.buildAuthorizationUrl(config, basicParameters);
    
    console.log('✅ Basic scopes authorization URL generated:');
    console.log(basicUrl.href);
    console.log('');
    
    // Test with all your approved scopes
    console.log('🧪 Testing with ALL approved scopes:');
    
    const allScopes = [
      'conve:fuel_status', 'conve:brake_status', 'conve:doors_status', 'conve:trip_statistics',
      'conve:environment', 'conve:odometer_status', 'conve:honk_flash', 'conve:command_accessibility', 
      'conve:engine_status', 'conve:commands', 'conve:vehicle_relation', 'conve:windows_status',
      'conve:navigation', 'conve:tyre_status', 'conve:connectivity_status', 'conve:battery_charge_level',
      'conve:climatization_start_stop', 'conve:engine_start_stop', 'conve:lock', 'openid',
      'conve:diagnostics_workshop', 'conve:unlock', 'conve:lock_status', 'conve:diagnostics_engine_status',
      'conve:warnings'
    ].join(' ');
    
    const fullParameters = {
      redirect_uri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
      scope: allScopes,
      code_challenge,
      code_challenge_method: "S256",
    };

    const fullUrl = client.buildAuthorizationUrl(config, fullParameters);
    
    console.log('✅ Full scopes authorization URL generated:');
    console.log(fullUrl.href);
    console.log('');
    
    console.log('🎯 TESTING PRIORITY:');
    console.log('1. Try the MINIMAL URL first');
    console.log('2. If it works → your credentials and discovery are valid');
    console.log('3. Then try basic scopes, then full scopes');
    console.log('4. This will isolate if it\'s a scope issue or credential issue');
    console.log('');
    
    console.log('💾 Save this code verifier for token exchange:');
    console.log(code_verifier);
    console.log('');
    
    return true;
    
  } catch (error) {
    console.log('❌ Discovery FAILED!');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
    console.log('');
    
    console.log('🔧 This explains the OAuth failures:');
    console.log('   • Your client credentials are not valid for discovery');
    console.log('   • The application might be in wrong environment'); 
    console.log('   • Client ID/Secret might be incorrect');
    console.log('   • Application might not be properly published');
    console.log('');
    
    console.log('🚨 IMMEDIATE ACTIONS:');
    console.log('   1. Verify Client ID exactly matches portal');
    console.log('   2. Verify Client Secret exactly matches portal');
    console.log('   3. Confirm application is published (not draft)');
    console.log('   4. Check if application is in production environment');
    console.log('');
    
    return false;
  }
}

async function testAlternativeEnvironments() {
  console.log('🔍 Test 3: Alternative Environment Testing');
  console.log('─'.repeat(50));
  
  const environments = [
    'https://volvoid.volvocars.com',      // US/Global
    'https://id.volvocars.com',           // Alternative domain
    'https://auth.volvocars.com',         // Auth subdomain
  ];
  
  for (const env of environments) {
    try {
      console.log(`📡 Testing discovery: ${env}`);
      
      const config = await client.discovery(
        new URL(env),
        clientId,
        clientSecret
      );
      
      if (config.authorization_endpoint && config.token_endpoint) {
        console.log(`✅ SUCCESS: ${env}`);
        console.log(`   Auth endpoint: ${config.authorization_endpoint}`);
        console.log(`   Token endpoint: ${config.token_endpoint}`);
        console.log('   🎯 This might be your correct environment!');
        console.log('');
        
        // Generate a test URL for this environment
        const code_verifier = client.randomPKCECodeVerifier();
        const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);
        
        const testParams = {
          redirect_uri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
          scope: 'openid',
          code_challenge,
          code_challenge_method: "S256",
        };

        const testUrl = client.buildAuthorizationUrl(config, testParams);
        console.log(`   Test URL: ${testUrl.href}`);
        console.log(`   Code verifier: ${code_verifier}`);
        console.log('');
        
        return { environment: env, config, code_verifier, testUrl };
      } else {
        console.log(`❌ FAILED: ${env} (missing endpoints)`);
      }
      
    } catch (error) {
      console.log(`❌ FAILED: ${env} (${error.message})`);
    }
  }
  
  console.log('🚨 No alternative environments worked');
  return null;
}

// Run the validation
validateDiscovery()
  .then(success => {
    if (!success) {
      console.log('🔄 Trying alternative environments...');
      return testAlternativeEnvironments();
    }
    return null;
  })
  .then(altResult => {
    if (altResult) {
      console.log(`🎉 Found working environment: ${altResult.environment}`);
    }
    
    console.log('');
    console.log('📋 SUMMARY:');
    console.log('If discovery succeeded → test the generated URLs');
    console.log('If discovery failed → check application configuration');
    console.log('If alternative environment worked → use that one');
  })
  .catch(console.error);