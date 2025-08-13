#!/usr/bin/env node

/**
 * Test Token Storage Functionality
 * 
 * This script tests the token persistence system to ensure
 * tokens are properly stored and retrieved.
 */

const { TokenStorage } = require('../dist/storage/token-storage');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock logger
const mockLogger = {
  debug: (msg) => console.log(`[DEBUG] ${msg}`),
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg) => console.log(`[ERROR] ${msg}`),
};

// Test configuration
const testVin = 'YV4EK3ZL4SS150793';
const testToken = 'test_refresh_token_' + Date.now();
const testStorageDir = path.join(os.tmpdir(), 'homebridge-test');

async function testTokenStorage() {
  console.log('🧪 Testing Token Storage System\n');

  try {
    // 1. Initialize token storage
    console.log('1. Initializing token storage...');
    const storage = new TokenStorage(mockLogger, testVin, testStorageDir);
    await storage.initialize();
    console.log('✅ Storage initialized\n');

    // 2. Test storing a token
    console.log('2. Storing test token...');
    await storage.storeRefreshToken(testToken);
    console.log('✅ Token stored\n');

    // 3. Test retrieving the stored token
    console.log('3. Retrieving stored token...');
    const retrievedToken = await storage.getStoredRefreshToken();
    if (retrievedToken === testToken) {
      console.log('✅ Token retrieved successfully\n');
    } else {
      console.log('❌ Token mismatch!\n');
      console.log(`Expected: ${testToken}`);
      console.log(`Retrieved: ${retrievedToken}`);
      return false;
    }

    // 4. Test token info
    console.log('4. Getting token info...');
    const tokenInfo = await storage.getTokenInfo();
    console.log('Token Info:', JSON.stringify(tokenInfo, null, 2));
    console.log('✅ Token info retrieved\n');

    // 5. Test getBestRefreshToken with config fallback
    console.log('5. Testing token precedence...');
    const configToken = 'config_fallback_token';
    const bestToken = await storage.getBestRefreshToken(configToken);
    
    if (bestToken && bestToken.source === 'stored' && bestToken.token === testToken) {
      console.log('✅ Stored token has precedence over config token\n');
    } else {
      console.log('❌ Token precedence test failed\n');
      console.log('Best token:', bestToken);
      return false;
    }

    // 6. Test with no stored token (after clearing)
    console.log('6. Testing config fallback...');
    await storage.clearStoredToken();
    const fallbackToken = await storage.getBestRefreshToken(configToken);
    
    if (fallbackToken && fallbackToken.source === 'config' && fallbackToken.token === configToken) {
      console.log('✅ Config fallback works correctly\n');
    } else {
      console.log('❌ Config fallback test failed\n');
      console.log('Fallback token:', fallbackToken);
      return false;
    }

    // 7. Verify storage directory structure
    console.log('7. Checking storage directory...');
    const storageDir = path.join(testStorageDir, 'persist', 'volvo-ex30');
    if (fs.existsSync(storageDir)) {
      console.log(`✅ Storage directory exists: ${storageDir}`);
      const files = fs.readdirSync(storageDir);
      console.log('Storage files:', files);
    } else {
      console.log('❌ Storage directory not found');
      return false;
    }

    console.log('\n🎉 All token storage tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  } finally {
    // Cleanup test storage
    try {
      const storageDir = path.join(testStorageDir, 'persist', 'volvo-ex30');
      if (fs.existsSync(storageDir)) {
        fs.rmSync(storageDir, { recursive: true, force: true });
        console.log('\n🧹 Test storage cleaned up');
      }
    } catch (cleanupError) {
      console.warn('Warning: Failed to cleanup test storage:', cleanupError.message);
    }
  }
}

// Run the test
testTokenStorage().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((error) => {
  console.error('Test runner failed:', error);
  process.exit(1);
});