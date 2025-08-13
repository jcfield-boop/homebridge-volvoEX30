#!/usr/bin/env node

/**
 * Test Refresh Token Validity
 * 
 * This script tests if your current refresh token is still valid
 * and can be used to get a new access token.
 */

const axios = require('axios');

// Your configuration - update these values
const config = {
    clientId: 'dc-s68ezw2gmvo5nmrmfre3j4c28',
    clientSecret: 'AAZIK89F1JF1BKCiJ3yuaW',
    refreshToken: 'oxSNqaNqPH8CG5t4B7FtRooitzpSvJcojYBqaKRRcm',
    region: 'eu' // or 'na'
};

const baseUrl = config.region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';

async function testRefreshToken() {
    console.log('🔍 Testing refresh token validity...\n');
    
    console.log('Configuration:');
    console.log(`  Client ID: ${config.clientId}`);
    console.log(`  Client Secret: ${config.clientSecret.substring(0, 8)}...`);
    console.log(`  Refresh Token: ${config.refreshToken.substring(0, 12)}... (length: ${config.refreshToken.length})`);
    console.log(`  Region: ${config.region}`);
    console.log(`  Token Endpoint: ${baseUrl}/as/token.oauth2\n`);
    
    try {
        const params = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: config.refreshToken
        });

        console.log('📡 Making token refresh request...');
        
        const response = await axios.post(`${baseUrl}/as/token.oauth2`, params, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 30000
        });

        console.log('✅ SUCCESS! Refresh token is valid.\n');
        console.log('Response:');
        console.log(`  Access Token: ${response.data.access_token.substring(0, 20)}...`);
        console.log(`  Token Type: ${response.data.token_type}`);
        console.log(`  Expires In: ${response.data.expires_in} seconds`);
        
        if (response.data.refresh_token) {
            console.log(`  New Refresh Token: ${response.data.refresh_token.substring(0, 20)}...`);
        } else {
            console.log('  Refresh Token: (same as input)');
        }
        
        console.log(`\n🎉 Your refresh token is working correctly!`);
        
    } catch (error) {
        console.log('❌ FAILED! Refresh token is invalid or expired.\n');
        
        if (error.response) {
            console.log('Error Details:');
            console.log(`  Status: ${error.response.status} ${error.response.statusText}`);
            console.log(`  Error: ${error.response.data?.error || 'Unknown'}`);
            console.log(`  Description: ${error.response.data?.error_description || 'No description'}`);
            
            if (error.response.status === 400 && error.response.data?.error === 'invalid_grant') {
                console.log('\n💡 This error usually means:');
                console.log('   • Your refresh token has expired');
                console.log('   • The refresh token was generated with different client credentials');
                console.log('   • The refresh token format is incorrect');
                console.log('\n🔧 Solutions:');
                console.log('   1. Generate a new refresh token using the custom UI OAuth flow');
                console.log('   2. Use Postman with the correct client ID/secret to get a fresh token');
                console.log('   3. Run the production-oauth-setup.js script for production credentials');
            } else if (error.response.status === 401) {
                console.log('\n💡 Authentication failed - check your client credentials');
            }
            
        } else {
            console.log('Network Error:', error.message);
        }
        
        process.exit(1);
    }
}

// Run the test
testRefreshToken().catch(console.error);