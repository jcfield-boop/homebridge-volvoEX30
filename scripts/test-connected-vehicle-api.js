#!/usr/bin/env node

const axios = require('axios');
const crypto = require('crypto');

// New extended app credentials
const CLIENT_ID = 'dc-towqtsl3ngkotpzdc6qlqhnxl';
const CLIENT_SECRET = '989jHbeioeEPJrusrlPtWn';
const VCC_API_KEY = 'e88ac699aef74ed4af934993ea61299';
const REGION = 'eu';
const VIN = 'YV4EK3ZL4SS150793'; // Your EX30 VIN

// OAuth endpoints
const AUTH_BASE_URL = REGION === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
const API_BASE_URL = 'https://api.volvocars.com';

class ConnectedVehicleApiTester {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.codeVerifier = null;
  }

  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  generateCodeChallenge(codeVerifier) {
    return crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  }

  generateAuthUrl() {
    // Generate PKCE parameters - store codeVerifier for later use
    this.codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
    const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid energy:state:read energy:capability:read conve:battery_charge_level conve:diagnostics_engine_status conve:warnings',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return `${AUTH_BASE_URL}/as/authorization.oauth2?${params.toString()}`;
  }

  async exchangeCodeForTokens(authCode) {
    if (!this.codeVerifier) {
      throw new Error('Code verifier not found. Please generate authorization URL first.');
    }
    
    const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';

    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: authCode,
        redirect_uri: redirectUri,
        code_verifier: this.codeVerifier
      });

      const response = await axios.post(`${AUTH_BASE_URL}/as/token.oauth2`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      
      this.codeVerifier = null; // Clear code verifier after successful exchange
      
      console.log('✅ Token exchange successful!');
      console.log('🔑 Access Token:', this.accessToken ? 'Retrieved' : 'Failed');
      console.log('🔄 Refresh Token:', this.refreshToken ? 'Retrieved' : 'Failed');
      
      return response.data;
    } catch (error) {
      console.error('❌ Token exchange failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async testConnectedVehicleAPI() {
    if (!this.accessToken) {
      throw new Error('No access token available. Please run OAuth flow first.');
    }

    console.log('\n🚗 Testing Connected Vehicle API v2 with EX30...\n');

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'vcc-api-key': VCC_API_KEY,
      'Accept': 'application/json'
    };

    const endpoints = [
      { name: 'List Vehicles', url: '/connected-vehicle/v2/vehicles' },
      { name: 'Vehicle Details', url: `/connected-vehicle/v2/vehicles/${VIN}` },
      { name: 'Doors & Locks', url: `/connected-vehicle/v2/vehicles/${VIN}/doors` },
      { name: 'Windows', url: `/connected-vehicle/v2/vehicles/${VIN}/windows` },
      { name: 'Diagnostics', url: `/connected-vehicle/v2/vehicles/${VIN}/diagnostics` },
      { name: 'Engine Status', url: `/connected-vehicle/v2/vehicles/${VIN}/engine-status` },
      { name: 'Odometer', url: `/connected-vehicle/v2/vehicles/${VIN}/odometer` },
      { name: 'Fuel/Energy', url: `/connected-vehicle/v2/vehicles/${VIN}/fuel` },
      { name: 'Statistics', url: `/connected-vehicle/v2/vehicles/${VIN}/statistics` },
      { name: 'Tyre Pressure', url: `/connected-vehicle/v2/vehicles/${VIN}/tyres` },
      { name: 'Warnings', url: `/connected-vehicle/v2/vehicles/${VIN}/warnings` },
      { name: 'Brake Status', url: `/connected-vehicle/v2/vehicles/${VIN}/brakes` },
      { name: 'Engine Diagnostics', url: `/connected-vehicle/v2/vehicles/${VIN}/engine` },
      { name: 'Available Commands', url: `/connected-vehicle/v2/vehicles/${VIN}/commands` },
      { name: 'Command Accessibility', url: `/connected-vehicle/v2/vehicles/${VIN}/command-accessibility` }
    ];

    const results = {};

    for (const endpoint of endpoints) {
      try {
        console.log(`📡 Testing ${endpoint.name}...`);
        
        const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, { headers });
        
        results[endpoint.name] = {
          status: 'success',
          statusCode: response.status,
          data: response.data,
          dataSize: JSON.stringify(response.data).length
        };
        
        console.log(`✅ ${endpoint.name}: ${response.status} (${results[endpoint.name].dataSize} bytes)`);
        
      } catch (error) {
        results[endpoint.name] = {
          status: 'error',
          statusCode: error.response?.status || 'network_error',
          error: error.response?.data || error.message
        };
        
        console.log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error?.message || error.message}`);
      }

      // Rate limiting - wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  async compareWithEnergyAPI() {
    if (!this.accessToken) {
      throw new Error('No access token available.');
    }

    console.log('\n⚡ Comparing with Energy API v2...\n');

    const headers = {
      'Authorization': `Bearer ${this.accessToken}`,
      'vcc-api-key': VCC_API_KEY,
      'Accept': 'application/json'
    };

    const energyEndpoints = [
      { name: 'Energy Capabilities', url: `/energy/v2/vehicles/${VIN}/capabilities` },
      { name: 'Energy State', url: `/energy/v2/vehicles/${VIN}/state` }
    ];

    const energyResults = {};

    for (const endpoint of energyEndpoints) {
      try {
        console.log(`⚡ Testing ${endpoint.name}...`);
        
        const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, { headers });
        
        energyResults[endpoint.name] = {
          status: 'success',
          statusCode: response.status,
          data: response.data,
          dataSize: JSON.stringify(response.data).length
        };
        
        console.log(`✅ ${endpoint.name}: ${response.status} (${energyResults[endpoint.name].dataSize} bytes)`);
        
      } catch (error) {
        energyResults[endpoint.name] = {
          status: 'error',
          statusCode: error.response?.status || 'network_error',
          error: error.response?.data || error.message
        };
        
        console.log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error?.message || error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return energyResults;
  }

  generateReport(connectedVehicleResults, energyResults) {
    console.log('\n📊 TEST RESULTS SUMMARY\n');
    console.log('='.repeat(60));
    
    console.log('\n🚗 Connected Vehicle API v2 Results:');
    let successCount = 0;
    let totalEndpoints = 0;
    
    for (const [name, result] of Object.entries(connectedVehicleResults)) {
      totalEndpoints++;
      if (result.status === 'success') {
        successCount++;
        console.log(`✅ ${name}: SUCCESS (${result.dataSize} bytes)`);
      } else {
        console.log(`❌ ${name}: FAILED (${result.statusCode})`);
      }
    }
    
    console.log(`\nConnected Vehicle API v2: ${successCount}/${totalEndpoints} endpoints successful`);
    
    console.log('\n⚡ Energy API v2 Results:');
    let energySuccessCount = 0;
    let energyTotalEndpoints = 0;
    
    for (const [name, result] of Object.entries(energyResults)) {
      energyTotalEndpoints++;
      if (result.status === 'success') {
        energySuccessCount++;
        console.log(`✅ ${name}: SUCCESS (${result.dataSize} bytes)`);
      } else {
        console.log(`❌ ${name}: FAILED (${result.statusCode})`);
      }
    }
    
    console.log(`\nEnergy API v2: ${energySuccessCount}/${energyTotalEndpoints} endpoints successful`);
    
    // Summary
    console.log('\n🎯 RECOMMENDATIONS:');
    if (successCount > energySuccessCount) {
      console.log('✅ Connected Vehicle API v2 provides more data - RECOMMENDED for migration');
    } else if (energySuccessCount > successCount) {
      console.log('⚡ Energy API v2 is more reliable - KEEP current implementation');
    } else {
      console.log('⚖️  Both APIs have similar success rates - Consider hybrid approach');
    }
  }
}

// Interactive setup
async function main() {
  const tester = new ConnectedVehicleApiTester();
  
  console.log('🚗 Volvo EX30 Connected Vehicle API v2 Tester\n');
  console.log('📋 New App Configuration:');
  console.log(`   Client ID: ${CLIENT_ID}`);
  console.log(`   Region: ${REGION}`);
  console.log(`   Target VIN: ${VIN}`);
  console.log('');
  
  // Check if we have command line arguments
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Generate auth URL
    const authUrl = tester.generateAuthUrl();
    console.log('🔐 STEP 1: Authorization Required');
    console.log('Open this URL in your browser:');
    console.log('');
    console.log(authUrl);
    console.log('');
    console.log('After authorization, you\'ll be redirected to GitHub with a "code" parameter.');
    console.log('Copy the code and run:');
    console.log(`node test-connected-vehicle-api.js [YOUR_CODE]`);
    
  } else {
    // Exchange code for tokens and test APIs
    const authCode = args[0];
    console.log(`🔄 STEP 2: Exchanging code for tokens...`);
    
    try {
      await tester.exchangeCodeForTokens(authCode);
      
      // Test Connected Vehicle API v2
      const connectedVehicleResults = await tester.testConnectedVehicleAPI();
      
      // Test Energy API v2 for comparison
      const energyResults = await tester.compareWithEnergyAPI();
      
      // Generate report
      tester.generateReport(connectedVehicleResults, energyResults);
      
      // Save detailed results to file
      const allResults = {
        timestamp: new Date().toISOString(),
        connectedVehicleAPI: connectedVehicleResults,
        energyAPI: energyResults,
        tokens: {
          hasAccessToken: !!tester.accessToken,
          hasRefreshToken: !!tester.refreshToken
        }
      };
      
      const fs = require('fs');
      const reportPath = './connected-vehicle-api-test-results.json';
      fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
      console.log(`\n💾 Detailed results saved to: ${reportPath}`);
      
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { ConnectedVehicleApiTester };