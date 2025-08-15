#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// Test if your existing working app can access Connected Vehicle API
// This will help us understand if the issue is with the new app setup
// or if Connected Vehicle API requires different authentication

const VIN = 'YV4EK3ZL4SS150793'; // Your EX30 VIN
const API_BASE_URL = 'https://api.volvocars.com';

async function testWithExistingTokens() {
  console.log('🔍 Testing Connected Vehicle API with existing working tokens...\n');
  
  // Try to read existing tokens from your current setup
  let tokens = null;
  let vccApiKey = null;
  
  // Check if there are stored tokens
  try {
    const tokenPath = '/var/lib/homebridge/volvo-ex30-tokens.json';
    if (fs.existsSync(tokenPath)) {
      const tokenData = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
      console.log('📁 Found stored tokens file');
      
      // Look for your VIN in the stored tokens
      const vinKey = Object.keys(tokenData).find(key => key.includes('YV4EK3ZL'));
      if (vinKey && tokenData[vinKey]) {
        tokens = tokenData[vinKey];
        console.log('✅ Found tokens for your EX30');
      }
    }
  } catch (error) {
    console.log('⚠️  Could not read stored tokens:', error.message);
  }
  
  // Try to read VCC API Key from config
  try {
    const homebridgeConfigPath = '/var/lib/homebridge/config.json';
    if (fs.existsSync(homebridgeConfigPath)) {
      const config = JSON.parse(fs.readFileSync(homebridgeConfigPath, 'utf8'));
      const volvoConfig = config.platforms?.find(p => p.platform === 'VolvoEX30');
      if (volvoConfig && volvoConfig.vccApiKey) {
        vccApiKey = volvoConfig.vccApiKey;
        console.log('✅ Found VCC API Key from Homebridge config');
      }
    }
  } catch (error) {
    console.log('⚠️  Could not read Homebridge config:', error.message);
  }
  
  if (!tokens || !tokens.accessToken) {
    console.log('❌ No valid access token found. Options:');
    console.log('1. Generate tokens using your current working app first');
    console.log('2. Or manually provide tokens by editing this script');
    console.log('\nTo generate tokens with your current working app:');
    console.log('npm run oauth-setup');
    return;
  }
  
  if (!vccApiKey) {
    console.log('❌ No VCC API Key found in Homebridge config');
    console.log('Please add vccApiKey to your Homebridge VolvoEX30 platform config');
    return;
  }
  
  console.log('🚀 Testing Connected Vehicle API endpoints...\n');
  
  const headers = {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'vcc-api-key': vccApiKey,
    'Accept': 'application/json'
  };
  
  const testEndpoints = [
    { name: 'List Vehicles', url: '/connected-vehicle/v2/vehicles' },
    { name: 'Vehicle Details', url: `/connected-vehicle/v2/vehicles/${VIN}` },
    { name: 'Doors & Locks', url: `/connected-vehicle/v2/vehicles/${VIN}/doors` },
    { name: 'Available Commands', url: `/connected-vehicle/v2/vehicles/${VIN}/commands` }
  ];
  
  const results = {};
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`📡 Testing ${endpoint.name}...`);
      
      const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, { 
        headers,
        timeout: 10000 
      });
      
      results[endpoint.name] = {
        status: 'success',
        statusCode: response.status,
        dataSize: JSON.stringify(response.data).length,
        sampleData: JSON.stringify(response.data).substring(0, 200) + '...'
      };
      
      console.log(`✅ ${endpoint.name}: ${response.status} (${results[endpoint.name].dataSize} bytes)`);
      
    } catch (error) {
      results[endpoint.name] = {
        status: 'error',
        statusCode: error.response?.status || 'network_error',
        error: error.response?.data?.error?.message || error.message
      };
      
      console.log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error?.message || error.message}`);
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 RESULTS SUMMARY:');
  console.log('='.repeat(50));
  
  const successCount = Object.values(results).filter(r => r.status === 'success').length;
  const totalCount = Object.keys(results).length;
  
  if (successCount > 0) {
    console.log(`✅ Connected Vehicle API works! (${successCount}/${totalCount} endpoints successful)`);
    console.log('🎯 Your existing application CAN access Connected Vehicle API v2');
    console.log('📝 The issue is likely with the new application setup, not the API itself');
    
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('1. Check new app redirect URI in Volvo Developer Portal');
    console.log('2. Verify all scopes are approved for the new application');
    console.log('3. Ensure new application status is "Active" not "Pending"');
    console.log('4. Try using existing working app credentials for now');
    
  } else {
    console.log(`❌ Connected Vehicle API not working (${successCount}/${totalCount} endpoints successful)`);
    console.log('⚠️  This suggests scope or permission issues with your current app');
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Current app may not have Connected Vehicle API scopes');
    console.log('2. VCC API Key may be incorrect');
    console.log('3. Tokens may be expired or invalid');
  }
  
  // Save detailed results
  const reportPath = './existing-app-connected-vehicle-test.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    vccApiKey: vccApiKey ? 'present' : 'missing',
    tokens: tokens ? 'present' : 'missing',
    results: results
  }, null, 2));
  
  console.log(`\n💾 Detailed results saved to: ${reportPath}`);
}

if (require.main === module) {
  testWithExistingTokens().catch(console.error);
}