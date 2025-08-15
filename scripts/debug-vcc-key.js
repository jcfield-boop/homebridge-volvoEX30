#!/usr/bin/env node

const axios = require('axios');

// Debug VCC API Key issues
console.log('🔍 VCC API Key Diagnostics');
console.log('=' .repeat(40));
console.log('');

// Current key from your message
const CURRENT_KEY = 'e88ac699aef74ed4af934993ea61299';

console.log('📋 Current VCC API Key Analysis:');
console.log(`Key: ${CURRENT_KEY}`);
console.log(`Length: ${CURRENT_KEY.length}`);
console.log(`Format: ${/^[a-f0-9]+$/.test(CURRENT_KEY) ? 'Valid hex' : 'Invalid format'}`);
console.log('');

// VCC API Keys are typically:
// - 32 characters long (128-bit hex)
// - Only contain lowercase hex digits (a-f, 0-9)
// - No dashes or special characters

console.log('🔍 Expected VCC API Key Format:');
console.log('- Length: Usually 32 characters');
console.log('- Format: Lowercase hexadecimal (a-f, 0-9)');
console.log('- Example: abc123def456789abc123def45678901');
console.log('');

if (CURRENT_KEY.length !== 32) {
  console.log('⚠️  Warning: Key length is not 32 characters');
  console.log('   This might indicate the key is incomplete or copied incorrectly');
  console.log('');
}

// Test different possible VCC API Key scenarios
const testKeys = [
  CURRENT_KEY,
  CURRENT_KEY + '1', // In case it's missing a character
  'dc-towqtsl3ngkotpzdc6qlqhnxl', // Client ID (wrong but let's test)
];

console.log('🧪 Testing different key scenarios...');
console.log('');

async function testVCCKey(apiKey, description) {
  console.log(`Testing: ${description}`);
  console.log(`Key: ${apiKey}`);
  
  try {
    // Test with a simple API call that requires VCC API Key
    const response = await axios.get('https://api.volvocars.com/connected-vehicle/v2/vehicles', {
      headers: {
        'vcc-api-key': apiKey,
        'Authorization': 'Bearer invalid_token_test', // This will fail auth but test key format
        'Accept': 'application/json'
      },
      timeout: 10000,
      validateStatus: () => true // Accept any status
    });
    
    // Analyze the response
    if (response.status === 401 && response.data?.error?.message?.includes('Invalid access token')) {
      console.log('✅ VCC API Key accepted (failed on token, which is expected)');
    } else if (response.status === 403 && response.data?.error?.message?.includes('Invalid API key')) {
      console.log('❌ VCC API Key rejected - Invalid API key');
    } else if (response.status === 403 && response.data?.error?.message?.includes('Forbidden')) {
      console.log('✅ VCC API Key accepted (access denied for other reasons)');
    } else {
      console.log(`🤷 Unexpected response: ${response.status} - ${response.data?.error?.message || 'Unknown'}`);
    }
    
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  console.log('');
}

async function runDiagnostics() {
  await testVCCKey(CURRENT_KEY, 'Current VCC API Key');
  
  console.log('🎯 TROUBLESHOOTING STEPS:');
  console.log('');
  console.log('1. Double-check the VCC API Key in Volvo Developer Portal:');
  console.log('   - Go to https://developer.volvocars.com/');
  console.log('   - Sign in and go to your application');
  console.log('   - Look for "Application Key" or "VCC API Key"');
  console.log('   - Copy the FULL key (usually 32 characters)');
  console.log('');
  console.log('2. Common issues:');
  console.log('   - Key was partially copied/truncated');
  console.log('   - Confused Client ID with VCC API Key');
  console.log('   - Key not yet activated (new applications)');
  console.log('');
  console.log('3. What to look for in Developer Portal:');
  console.log('   - "Application Key": This is your VCC API Key');
  console.log('   - "Client ID": Used for OAuth (dc-towqtsl3ngkotpzdc6qlqhnxl)');
  console.log('   - "Client Secret": Used for OAuth (989jHbeioeEPJrusrlPtWn)');
  console.log('');
  console.log('💡 TIP: The VCC API Key should be different from both Client ID and Secret');
}

runDiagnostics().catch(console.error);