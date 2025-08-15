#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');

// Test Connected Vehicle API using Test Access Token from Volvo Developer Portal
// This follows the official Volvo sample: https://github.com/volvo-cars/developer-portal-api-samples/tree/main/connected-vehicle-fetch-sample

const VCC_API_KEY = 'e88ac699aef74ed4af934993ea612999';
const VIN = 'YV4EK3ZL4SS150793'; // Your EX30 VIN
const API_BASE_URL = 'https://api.volvocars.com';

console.log('🚗 Volvo Connected Vehicle API Test (Using Portal Test Token)');
console.log('=' .repeat(60));
console.log('');
console.log('📋 Configuration:');
console.log(`   VCC API Key: ${VCC_API_KEY}`);
console.log(`   Target VIN: ${VIN}`);
console.log('');
console.log('🔑 STEP 1: Generate Test Access Token');
console.log('');
console.log('1. Go to: https://developer.volvocars.com/');
console.log('2. Sign in to your developer account');
console.log('3. Navigate to your application dashboard');
console.log('4. Find "Test access tokens" section');
console.log('5. Generate a new test access token');
console.log('6. Copy the token and run:');
console.log('');
console.log('   node test-with-portal-token.js [YOUR_TEST_TOKEN]');
console.log('');

// Check if access token was provided
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('💡 TIP: Test tokens are short-lived (60 minutes) but perfect for testing!');
  process.exit(0);
}

const ACCESS_TOKEN = args[0];

async function testConnectedVehicleAPI() {
  console.log('🚀 Testing Connected Vehicle API v2 with test token...');
  console.log('');

  // Headers following official Volvo sample
  const headers = {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'vcc-api-key': VCC_API_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  // Test endpoints prioritized by importance for EX30
  const endpoints = [
    { 
      name: 'List Vehicles', 
      url: '/connected-vehicle/v2/vehicles',
      description: 'Get list of vehicles associated with account'
    },
    { 
      name: 'Vehicle Details', 
      url: `/connected-vehicle/v2/vehicles/${VIN}`,
      description: 'Get vehicle model, year, battery capacity, etc.'
    },
    { 
      name: 'Available Commands', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/commands`,
      description: 'List commands available for this vehicle'
    },
    { 
      name: 'Command Accessibility', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/command-accessibility`,
      description: 'Check if vehicle is reachable for commands'
    },
    { 
      name: 'Doors & Locks', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/doors`,
      description: 'Door status, central lock, hood, tailgate'
    },
    { 
      name: 'Windows Status', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/windows`,
      description: 'Window positions including sunroof'
    },
    { 
      name: 'Odometer', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/odometer`,
      description: 'Current mileage reading'
    },
    { 
      name: 'Diagnostics', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/diagnostics`,
      description: 'Service warnings, maintenance intervals'
    },
    { 
      name: 'Statistics', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/statistics`,
      description: 'Trip data, average consumption, distance to empty'
    },
    { 
      name: 'Tyre Pressure', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/tyres`,
      description: 'Individual tyre pressure readings'
    },
    { 
      name: 'Warnings', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/warnings`,
      description: 'Bulb failures and system warnings'
    },
    { 
      name: 'Engine Status', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/engine-status`,
      description: 'Engine on/off status (may be N/A for EV)'
    },
    { 
      name: 'Engine Diagnostics', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/engine`,
      description: 'Oil level, coolant level (may be N/A for EV)'
    },
    { 
      name: 'Fuel/Energy', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/fuel`,
      description: 'Fuel amount (may show energy for EV)'
    },
    { 
      name: 'Brake Status', 
      url: `/connected-vehicle/v2/vehicles/${VIN}/brakes`,
      description: 'Brake fluid level warnings'
    }
  ];

  const results = {
    successful: [],
    failed: [],
    summary: {}
  };

  console.log('📡 Testing endpoints...');
  console.log('');

  for (const endpoint of endpoints) {
    try {
      console.log(`🔍 ${endpoint.name}...`);
      
      const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, { 
        headers,
        timeout: 15000 
      });
      
      const result = {
        name: endpoint.name,
        url: endpoint.url,
        description: endpoint.description,
        status: response.status,
        dataSize: JSON.stringify(response.data).length,
        hasData: Object.keys(response.data).length > 0,
        sampleData: response.data
      };
      
      results.successful.push(result);
      console.log(`✅ ${endpoint.name}: ${response.status} (${result.dataSize} bytes, ${result.hasData ? 'HAS DATA' : 'EMPTY'})`);
      
    } catch (error) {
      const result = {
        name: endpoint.name,
        url: endpoint.url,
        description: endpoint.description,
        error: {
          status: error.response?.status || 'network_error',
          message: error.response?.data?.error?.message || error.message,
          details: error.response?.data
        }
      };
      
      results.failed.push(result);
      console.log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error?.message || error.message}`);
    }

    // Rate limiting - wait between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate summary
  results.summary = {
    total: endpoints.length,
    successful: results.successful.length,
    failed: results.failed.length,
    successRate: Math.round((results.successful.length / endpoints.length) * 100)
  };

  console.log('');
  console.log('📊 RESULTS SUMMARY');
  console.log('=' .repeat(40));
  console.log(`Total endpoints tested: ${results.summary.total}`);
  console.log(`Successful: ${results.summary.successful}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Success rate: ${results.summary.successRate}%`);
  console.log('');

  if (results.successful.length > 0) {
    console.log('✅ SUCCESSFUL ENDPOINTS:');
    results.successful.forEach(result => {
      console.log(`   • ${result.name}: ${result.description}`);
    });
    console.log('');
  }

  if (results.failed.length > 0) {
    console.log('❌ FAILED ENDPOINTS:');
    results.failed.forEach(result => {
      console.log(`   • ${result.name}: ${result.error.status} - ${result.error.message}`);
    });
    console.log('');
  }

  // Compare with Energy API v2 if successful
  if (results.successful.length > 0) {
    console.log('⚡ COMPARING WITH ENERGY API v2...');
    await compareWithEnergyAPI(headers);
  }

  // Save detailed results
  const reportPath = './connected-vehicle-portal-token-test.json';
  const report = {
    timestamp: new Date().toISOString(),
    configuration: {
      vccApiKey: VCC_API_KEY,
      vin: VIN,
      tokenProvided: !!ACCESS_TOKEN
    },
    results: results
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`💾 Detailed results saved to: ${reportPath}`);
  
  return results;
}

async function compareWithEnergyAPI(headers) {
  console.log('');
  
  const energyEndpoints = [
    { name: 'Energy Capabilities', url: `/energy/v2/vehicles/${VIN}/capabilities` },
    { name: 'Energy State', url: `/energy/v2/vehicles/${VIN}/state` }
  ];

  for (const endpoint of energyEndpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, { headers });
      console.log(`✅ ${endpoint.name}: ${response.status} (${JSON.stringify(response.data).length} bytes)`);
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.response?.status || 'ERROR'} - ${error.response?.data?.error?.message || error.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

if (require.main === module) {
  testConnectedVehicleAPI().catch(console.error);
}