#!/usr/bin/env node

// Test OAuth implementation with your credentials (LOCAL TESTING ONLY)
// DO NOT COMMIT THIS FILE WITH REAL CREDENTIALS

const axios = require('axios');
const crypto = require('crypto');

// Your test credentials (LOCAL TESTING ONLY)
const TEST_CREDENTIALS = {
    vin: 'YV4EK3ZL4SS150793',
    clientId: 'dc-s68ezw2gmvo5nmrmfre3j4c28',
    clientSecret: 'h5Wvv1t6XJjnmGGdUJydKJ',
    vccApiKey: '2e86956bc5b941dfb861e878a6c3dd19',
    region: 'eu' // Try 'na' if 'eu' doesn't work
};

console.log('🔍 Debugging OAuth Configuration Issues...\n');
console.log('📋 Current credentials being used:');
console.log(`   Client ID: ${TEST_CREDENTIALS.clientId}`);
console.log(`   Client Secret: ${TEST_CREDENTIALS.clientSecret.substring(0, 8)}...`);
console.log(`   VCC API Key: ${TEST_CREDENTIALS.vccApiKey.substring(0, 8)}...`);
console.log(`   VIN: ${TEST_CREDENTIALS.vin}\n`);

class OAuthTester {
    constructor() {
        this.codeVerifier = null;
        this.state = null;
    }

    generateCodeVerifier() {
        return crypto.randomBytes(32)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    generateCodeChallenge(codeVerifier) {
        const hash = crypto.createHash('sha256').update(codeVerifier).digest();
        return hash.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    async testOAuthFlow() {
        console.log('🧪 Testing OAuth Flow with your credentials...\n');
        
        // Generate PKCE parameters
        this.codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
        this.state = crypto.randomBytes(16).toString('hex');
        
        console.log('📋 Generated PKCE parameters:');
        console.log(`   Code Verifier: ${this.codeVerifier.substring(0, 16)}...`);
        console.log(`   Code Challenge: ${codeChallenge.substring(0, 16)}...`);
        console.log(`   State: ${this.state}\n`);

        // Test different configurations with your actual approved scopes
        const approvedScopes = 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid energy:state:read energy:capability:read conve:battery_charge_level conve:diagnostics_engine_status conve:warnings';
        
        const testConfigs = [
            {
                name: 'EU endpoint with ALL approved scopes + http://localhost redirect',
                baseUrl: 'https://volvoid.eu.volvocars.com',
                redirectUri: 'http://localhost:8080',
                scope: approvedScopes
            },
            {
                name: 'NA endpoint with ALL approved scopes + http://localhost redirect', 
                baseUrl: 'https://volvoid.volvocars.com',
                redirectUri: 'http://localhost:8080',
                scope: approvedScopes
            },
            {
                name: 'EU endpoint with minimal scope + GitHub redirect',
                baseUrl: 'https://volvoid.eu.volvocars.com',
                redirectUri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
                scope: 'openid'
            },
            {
                name: 'NA endpoint with minimal scope + GitHub redirect',
                baseUrl: 'https://volvoid.volvocars.com', 
                redirectUri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
                scope: 'openid'
            },
            {
                name: 'EU endpoint with legacy conve scopes only',
                baseUrl: 'https://volvoid.eu.volvocars.com',
                redirectUri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
                scope: 'conve:fuel_status conve:battery_charge_level openid'
            }
        ];

        console.log('🔍 Testing multiple configurations:\n');
        
        testConfigs.forEach((config, index) => {
            const authParams = new URLSearchParams({
                response_type: 'code',
                client_id: TEST_CREDENTIALS.clientId,
                redirect_uri: config.redirectUri,
                scope: config.scope,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                state: this.state
            });

            const authUrl = `${config.baseUrl}/as/authorization.oauth2?${authParams.toString()}`;
            
            console.log(`${index + 1}. ${config.name}:`);
            console.log(`   ${authUrl}\n`);
        });
        
        console.log('📋 Next steps:');
        console.log('1. Try each URL above in your browser (start with #1)');
        console.log('2. Sign in with your Volvo ID');
        console.log('3. Authorize the application');
        console.log('4. Copy the "code" parameter from the redirect URL');
        console.log('5. Run: node test-oauth.js [CODE_HERE]');
        
        return testConfigs[0]; // Return first config for token exchange
    }

    async exchangeCodeForTokens(authCode) {
        console.log('🔄 Exchanging authorization code for tokens...\n');
        
        // Test both endpoints since we don't know which one worked for authorization
        const endpoints = [
            { name: 'EU', baseUrl: 'https://volvoid.eu.volvocars.com' },
            { name: 'NA', baseUrl: 'https://volvoid.volvocars.com' }
        ];
        
        const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
        
        console.log('📋 Token Exchange Parameters:');
        console.log(`   Authorization Code: ${authCode.substring(0, 16)}...`);
        console.log(`   Client ID: ${TEST_CREDENTIALS.clientId}`);
        console.log(`   Client Secret: ${TEST_CREDENTIALS.clientSecret.substring(0, 8)}...`);
        console.log(`   Code Verifier: ${this.codeVerifier?.substring(0, 16)}...`);
        console.log(`   Redirect URI: ${redirectUri}\n`);

        for (const endpoint of endpoints) {
            console.log(`🌍 Trying ${endpoint.name} endpoint: ${endpoint.baseUrl}`);
            
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: TEST_CREDENTIALS.clientId,
                client_secret: TEST_CREDENTIALS.clientSecret,
                code: authCode,
                redirect_uri: redirectUri,
                code_verifier: this.codeVerifier
            });

            try {
                console.log(`📡 Making token exchange request to ${endpoint.name}...`);
                console.log(`   URL: ${endpoint.baseUrl}/as/token.oauth2`);
                console.log(`   Params: ${params.toString()}\n`);
                
                const tokenResponse = await axios.post(`${endpoint.baseUrl}/as/token.oauth2`, params, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    timeout: 30000
                });

                console.log(`✅ ${endpoint.name} token exchange successful!`);
                console.log('🎫 Received tokens:');
                console.log(`   Access Token: ${tokenResponse.data.access_token?.substring(0, 16)}...`);
                console.log(`   Refresh Token: ${tokenResponse.data.refresh_token?.substring(0, 16)}...`);
                console.log(`   Expires In: ${tokenResponse.data.expires_in} seconds\n`);
                
                // Test API call
                await this.testApiCall(tokenResponse.data.access_token);
                
                console.log('🎯 REFRESH TOKEN FOR HOMEBRIDGE CONFIG:');
                console.log(tokenResponse.data.refresh_token);
                
                return tokenResponse.data;

            } catch (error) {
                console.error(`❌ ${endpoint.name} token exchange failed:`);
                console.error('   Status:', error.response?.status);
                console.error('   Error:', error.response?.data?.error);
                console.error('   Description:', error.response?.data?.error_description);
                console.error('   Headers sent:', error.config?.headers);
                console.error('   Data sent:', error.config?.data);
                console.error('   Full error response:', JSON.stringify(error.response?.data, null, 2));
                console.log(''); // Empty line for readability
            }
        }
        
        throw new Error('Token exchange failed on both EU and NA endpoints');
    }

    async testClientCredentials() {
        console.log('🔐 Testing Client Credentials Grant (for diagnostics)...\n');
        
        const regions = [
            { name: 'EU', baseUrl: 'https://volvoid.eu.volvocars.com' },
            { name: 'NA', baseUrl: 'https://volvoid.volvocars.com' }
        ];

        for (const region of regions) {
            console.log(`Testing ${region.name} endpoint...`);
            
            try {
                const params = new URLSearchParams({
                    grant_type: 'client_credentials',
                    client_id: TEST_CREDENTIALS.clientId,
                    client_secret: TEST_CREDENTIALS.clientSecret,
                    scope: 'openid'
                });

                const response = await axios.post(`${region.baseUrl}/as/token.oauth2`, params, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    timeout: 10000
                });

                console.log(`✅ ${region.name} credentials valid!`);
                console.log(`   Token: ${response.data.access_token?.substring(0, 16)}...\n`);
                return region;

            } catch (error) {
                console.log(`❌ ${region.name} failed:`, error.response?.status, error.response?.data?.error || error.message);
                console.log(`   Details:`, error.response?.data?.error_description || 'No details\n');
            }
        }
        
        return null;
    }

    async testApiCall(accessToken) {
        console.log('🧪 Testing API call with access token...');
        
        try {
            const apiResponse = await axios.get(`https://api.volvocars.com/energy/v1/vehicles/${TEST_CREDENTIALS.vin}/battery-charge-level`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'VCC-API-Key': TEST_CREDENTIALS.vccApiKey,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });
            
            console.log('✅ API call successful!');
            console.log('📊 Battery data:', apiResponse.data);
            
        } catch (error) {
            console.log('⚠️  API call failed (this might be expected):');
            console.log('   Status:', error.response?.status);
            console.log('   Error:', error.response?.data);
            console.log('   (This could be normal if EX30 isn\'t supported by this specific endpoint)');
        }
    }
}

// Main execution
async function main() {
    const tester = new OAuthTester();
    const authCode = process.argv[2];
    const command = process.argv[2];
    
    if (command === 'test-creds') {
        // Test client credentials
        const validRegion = await tester.testClientCredentials();
        if (!validRegion) {
            console.error('💥 All credential tests failed! Check your Client ID and Secret in Volvo Developer Portal.');
            process.exit(1);
        }
    } else if (!authCode) {
        // Skip client credentials test (might not be enabled) and go straight to OAuth flow
        console.log('⚠️  Skipping client credentials test (often disabled for security)');
        console.log('🔍 Proceeding directly with OAuth authorization flow...\n');
        await tester.testOAuthFlow();
    } else {
        // Exchange code for tokens
        try {
            await tester.exchangeCodeForTokens(authCode);
        } catch (error) {
            console.error('💥 Test failed:', error.message);
            process.exit(1);
        }
    }
}

if (require.main === module) {
    main().catch(console.error);
}