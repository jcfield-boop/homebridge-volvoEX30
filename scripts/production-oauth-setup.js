#!/usr/bin/env node

/**
 * Production OAuth Setup for Real Volvo EX30 Vehicles
 * 
 * This script helps set up OAuth authentication for production use with real vehicles.
 * Unlike the test script, this is designed for actual customer vehicles.
 * 
 * IMPORTANT: This script requires a PRODUCTION OAuth application from Volvo Developer Portal
 * that has been approved for accessing real customer vehicles.
 */

const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🚗 Volvo EX30 Production OAuth Setup');
console.log('=====================================\n');

// Production configuration - replace with your PRODUCTION credentials
const PRODUCTION_CONFIG = {
    // PRODUCTION Client ID (different from developer sandbox)
    clientId: process.env.VOLVO_PROD_CLIENT_ID || 'YOUR_PRODUCTION_CLIENT_ID',
    
    // PRODUCTION Client Secret (different from developer sandbox)
    clientSecret: process.env.VOLVO_PROD_CLIENT_SECRET || 'YOUR_PRODUCTION_CLIENT_SECRET',
    
    // PRODUCTION VCC API Key (different from developer sandbox)
    vccApiKey: process.env.VOLVO_PROD_VCC_API_KEY || 'YOUR_PRODUCTION_VCC_API_KEY',
    
    // Your actual EX30 VIN
    vin: process.env.VOLVO_VIN || 'YV4EK3ZL4SS150793',
    
    // Region (eu or na)
    region: process.env.VOLVO_REGION || 'eu',
    
    // PRODUCTION redirect URI (must be registered in Volvo Developer Portal)
    // Cannot use localhost in production - must be a real domain you control
    redirectUri: process.env.VOLVO_REDIRECT_URI || 'https://your-domain.com/oauth/callback'
};

// Production OAuth scopes (must be approved in your production application)
const PRODUCTION_SCOPES = [
    'openid',
    'energy:state:read',           // Required for Energy API v2
    'energy:capability:read',      // Required for Energy API v2  
    'conve:fuel_status',           // Legacy compatibility
    'conve:battery_charge_level',  // Battery data
    'conve:lock_status',           // Vehicle locks
    'conve:lock',                  // Lock control
    'conve:unlock',                // Unlock control
    'conve:climatization_start_stop', // Climate control
    'conve:diagnostics_engine_status', // Engine/system status
    'conve:warnings'               // Vehicle warnings
].join(' ');

class ProductionOAuthSetup {
    constructor() {
        this.sessionFile = path.join(__dirname, '..', '.production-oauth-session.json');
        this.codeVerifier = null;
        this.state = null;
    }

    validateConfiguration() {
        console.log('🔍 Validating production configuration...\n');
        
        const issues = [];
        
        if (PRODUCTION_CONFIG.clientId === 'YOUR_PRODUCTION_CLIENT_ID') {
            issues.push('❌ Production Client ID not configured');
        }
        
        if (PRODUCTION_CONFIG.clientSecret === 'YOUR_PRODUCTION_CLIENT_SECRET') {
            issues.push('❌ Production Client Secret not configured');
        }
        
        if (PRODUCTION_CONFIG.vccApiKey === 'YOUR_PRODUCTION_VCC_API_KEY') {
            issues.push('❌ Production VCC API Key not configured');
        }
        
        if (PRODUCTION_CONFIG.redirectUri === 'https://your-domain.com/oauth/callback') {
            issues.push('❌ Production redirect URI not configured');
        }
        
        if (PRODUCTION_CONFIG.redirectUri.includes('localhost')) {
            issues.push('⚠️ Warning: localhost redirect URIs not allowed in production');
        }
        
        if (issues.length > 0) {
            console.log('❌ Configuration Issues Found:');
            issues.forEach(issue => console.log(`   ${issue}`));
            console.log('\n📋 Setup Instructions:');
            console.log('1. Create a PRODUCTION application in Volvo Developer Portal');
            console.log('2. Submit for production approval (not sandbox/developer)');
            console.log('3. Configure production redirect URI (must be real domain)');
            console.log('4. Request approval for Energy API v2 scopes');
            console.log('5. Set environment variables or update this script:');
            console.log('   export VOLVO_PROD_CLIENT_ID="your_production_client_id"');
            console.log('   export VOLVO_PROD_CLIENT_SECRET="your_production_client_secret"');
            console.log('   export VOLVO_PROD_VCC_API_KEY="your_production_vcc_api_key"');
            console.log('   export VOLVO_REDIRECT_URI="https://yourdomain.com/oauth/callback"');
            console.log('   export VOLVO_VIN="your_ex30_vin"');
            console.log('   export VOLVO_REGION="eu_or_na"\n');
            return false;
        }
        
        console.log('✅ Production configuration validated');
        console.log(`   Client ID: ${PRODUCTION_CONFIG.clientId}`);
        console.log(`   VIN: ${PRODUCTION_CONFIG.vin}`);
        console.log(`   Region: ${PRODUCTION_CONFIG.region}`);
        console.log(`   Redirect URI: ${PRODUCTION_CONFIG.redirectUri}\n`);
        
        return true;
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

    saveSession(sessionData) {
        try {
            fs.writeFileSync(this.sessionFile, JSON.stringify(sessionData, null, 2));
            console.log('💾 Saved production OAuth session');
        } catch (error) {
            console.warn('⚠️ Could not save session:', error.message);
        }
    }

    loadSession() {
        try {
            if (fs.existsSync(this.sessionFile)) {
                const sessionData = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
                this.codeVerifier = sessionData.codeVerifier;
                this.state = sessionData.state;
                console.log('📂 Loaded production OAuth session');
                return sessionData;
            }
        } catch (error) {
            console.warn('⚠️ Could not load session:', error.message);
        }
        return null;
    }

    cleanupSession() {
        try {
            if (fs.existsSync(this.sessionFile)) {
                fs.unlinkSync(this.sessionFile);
                console.log('🗑️ Cleaned up production session');
            }
        } catch (error) {
            console.warn('⚠️ Could not cleanup session:', error.message);
        }
    }

    async discoverEndpoints() {
        const baseUrl = PRODUCTION_CONFIG.region === 'na' 
            ? 'https://volvoid.volvocars.com' 
            : 'https://volvoid.eu.volvocars.com';
        
        try {
            console.log(`🔍 Discovering OAuth endpoints for ${PRODUCTION_CONFIG.region.toUpperCase()} region...`);
            const response = await axios.get(`${baseUrl}/.well-known/openid_configuration`);
            
            console.log('✅ Discovered endpoints:');
            console.log(`   Authorization: ${response.data.authorization_endpoint}`);
            console.log(`   Token: ${response.data.token_endpoint}`);
            console.log(`   Issuer: ${response.data.issuer}\n`);
            
            return response.data;
        } catch (error) {
            console.warn('⚠️ Could not discover endpoints, using defaults:', error.message);
            return {
                authorization_endpoint: `${baseUrl}/as/authorization.oauth2`,
                token_endpoint: `${baseUrl}/as/token.oauth2`,
                issuer: baseUrl
            };
        }
    }

    async generateAuthorizationUrl() {
        console.log('🔐 Generating production OAuth authorization URL...\n');
        
        if (!this.validateConfiguration()) {
            process.exit(1);
        }
        
        const endpoints = await this.discoverEndpoints();
        
        // Generate PKCE parameters
        this.codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(this.codeVerifier);
        this.state = crypto.randomBytes(16).toString('hex');
        
        // Save session for token exchange
        this.saveSession({
            codeVerifier: this.codeVerifier,
            state: this.state,
            codeChallenge: codeChallenge,
            endpoints: endpoints,
            timestamp: Date.now(),
            config: PRODUCTION_CONFIG
        });
        
        console.log('📋 Generated PKCE parameters:');
        console.log(`   Code Verifier: ${this.codeVerifier.substring(0, 16)}...`);
        console.log(`   Code Challenge: ${codeChallenge.substring(0, 16)}...`);
        console.log(`   State: ${this.state}\n`);
        
        // Build authorization URL
        const authParams = new URLSearchParams({
            response_type: 'code',
            client_id: PRODUCTION_CONFIG.clientId,
            redirect_uri: PRODUCTION_CONFIG.redirectUri,
            scope: PRODUCTION_SCOPES,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            state: this.state
        });
        
        const authUrl = `${endpoints.authorization_endpoint}?${authParams.toString()}`;
        
        console.log('🚀 PRODUCTION OAuth Authorization URL:');
        console.log('=======================================');
        console.log(authUrl);
        console.log('=======================================\n');
        
        console.log('📋 Next Steps:');
        console.log('1. Open the URL above in your browser');
        console.log('2. Sign in with your Volvo ID (the one your EX30 is registered to)');
        console.log('3. Authorize the application to access your vehicle');
        console.log('4. You will be redirected to your configured redirect URI');
        console.log('5. Extract the "code" parameter from the redirect URL');
        console.log('6. Run: node scripts/production-oauth-setup.js [CODE]');
        console.log('\n⚠️ IMPORTANT: Make sure your EX30 is registered to your Volvo account!');
        
        return authUrl;
    }

    async exchangeCodeForTokens(authCode) {
        console.log('🔄 Exchanging production authorization code for tokens...\n');
        
        const session = this.loadSession();
        if (!session || !this.codeVerifier) {
            console.error('💥 No production session found!');
            console.error('Run: node scripts/production-oauth-setup.js (without code) first');
            process.exit(1);
        }
        
        const { endpoints, config } = session;
        
        console.log('✅ Using session data:');
        console.log(`   Code Verifier: ${this.codeVerifier.substring(0, 16)}...`);
        console.log(`   Client ID: ${config.clientId}`);
        console.log(`   Session Age: ${Math.round((Date.now() - session.timestamp) / 1000)} seconds\n`);
        
        const tokenParams = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: authCode,
            redirect_uri: config.redirectUri,
            code_verifier: this.codeVerifier
        });
        
        try {
            console.log(`🌍 Making production token exchange request...`);
            console.log(`   Endpoint: ${endpoints.token_endpoint}`);
            
            const tokenResponse = await axios.post(endpoints.token_endpoint, tokenParams, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });
            
            console.log('✅ Production token exchange successful!\n');
            console.log('🎫 Received tokens:');
            console.log(`   Access Token: ${tokenResponse.data.access_token?.substring(0, 16)}...`);
            console.log(`   Refresh Token: ${tokenResponse.data.refresh_token?.substring(0, 16)}...`);
            console.log(`   Expires In: ${tokenResponse.data.expires_in} seconds\n`);
            
            // Test APIs with production tokens
            await this.testProductionAPIs(tokenResponse.data.access_token, config);
            
            console.log('🎯 PRODUCTION REFRESH TOKEN FOR HOMEBRIDGE:');
            console.log('==========================================');
            console.log(tokenResponse.data.refresh_token);
            console.log('==========================================\n');
            
            console.log('💡 Setup Instructions:');
            console.log('1. Copy the refresh token above');
            console.log('2. In Homebridge Config UI X, configure the Volvo EX30 plugin with:');
            console.log(`   - VIN: ${config.vin}`);
            console.log(`   - Client ID: ${config.clientId}`);
            console.log(`   - Client Secret: ${config.clientSecret}`);
            console.log(`   - VCC API Key: ${config.vccApiKey}`);
            console.log(`   - Refresh Token: [the token above]`);
            console.log(`   - Region: ${config.region}`);
            
            this.cleanupSession();
            return tokenResponse.data;
            
        } catch (error) {
            console.error('❌ Production token exchange failed:');
            console.error('   Status:', error.response?.status);
            console.error('   Error:', error.response?.data?.error);
            console.error('   Description:', error.response?.data?.error_description);
            console.error('   Full response:', JSON.stringify(error.response?.data, null, 2));
            
            if (error.response?.status === 400) {
                console.log('\n💡 Common Issues:');
                console.log('   - Authorization code expired (codes expire quickly)');
                console.log('   - Wrong redirect URI (must match exactly)');
                console.log('   - PKCE parameters mismatch');
                console.log('   - Application not approved for production');
            }
            
            throw error;
        }
    }

    async testProductionAPIs(accessToken, config) {
        console.log('🧪 Testing production APIs with your EX30...\n');
        
        // Test vehicle listing first
        try {
            console.log('📡 Testing vehicle access...');
            const vehiclesResponse = await axios.get('https://api.volvocars.com/connected-vehicle/v2/vehicles', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'vcc-api-key': config.vccApiKey,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });
            
            console.log('✅ Vehicle list retrieved:');
            const vehicles = vehiclesResponse.data.data || [];
            vehicles.forEach(vehicle => {
                const isYourEX30 = vehicle.vin === config.vin;
                console.log(`   ${isYourEX30 ? '🎯' : '📋'} VIN: ${vehicle.vin} ${isYourEX30 ? '(Your EX30!)' : ''}`);
            });
            
            const hasYourEX30 = vehicles.some(v => v.vin === config.vin);
            if (!hasYourEX30) {
                console.log(`\n⚠️ WARNING: Your EX30 (${config.vin}) not found in vehicle list!`);
                console.log('   Possible issues:');
                console.log('   - VIN not registered to your Volvo account');
                console.log('   - Vehicle not connected to Volvo services');
                console.log('   - Application not approved for this vehicle');
            }
            
        } catch (error) {
            console.log('❌ Vehicle list failed:', error.response?.status, error.response?.data?.error || error.message);
        }
        
        // Test Energy API v2 with your EX30
        try {
            console.log(`\n📡 Testing Energy API v2 with your EX30 (${config.vin})...`);
            
            const energyResponse = await axios.get(`https://api.volvocars.com/energy/v2/vehicles/${config.vin}/state`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'vcc-api-key': config.vccApiKey,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });
            
            console.log('✅ Energy API v2 SUCCESS! Your EX30 data:');
            console.log(JSON.stringify(energyResponse.data, null, 2));
            
        } catch (error) {
            console.log('❌ Energy API v2 failed:', error.response?.status, error.response?.data?.error || error.message);
            if (error.response?.status === 403) {
                console.log('   💡 This might indicate:');
                console.log('   - Missing energy:state:read scope approval');
                console.log('   - Application not approved for Energy API v2');
                console.log('   - Vehicle not connected to energy services');
            }
        }
        
        // Test capabilities
        try {
            console.log(`\n📡 Testing capabilities for your EX30...`);
            
            const capabilitiesResponse = await axios.get(`https://api.volvocars.com/energy/v2/vehicles/${config.vin}/capabilities`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'vcc-api-key': config.vccApiKey,
                    'Accept': 'application/json'
                },
                timeout: 15000
            });
            
            console.log('✅ Capabilities retrieved for your EX30:');
            console.log(JSON.stringify(capabilitiesResponse.data, null, 2));
            
        } catch (error) {
            console.log('❌ Capabilities failed:', error.response?.status, error.response?.data?.error || error.message);
        }
    }
}

// Main execution
async function main() {
    const setup = new ProductionOAuthSetup();
    const authCode = process.argv[2];
    
    if (!authCode) {
        // Generate authorization URL
        await setup.generateAuthorizationUrl();
    } else {
        // Exchange code for tokens
        try {
            await setup.exchangeCodeForTokens(authCode);
        } catch (error) {
            console.error('💥 Production OAuth setup failed:', error.message);
            process.exit(1);
        }
    }
}

if (require.main === module) {
    main().catch(console.error);
}