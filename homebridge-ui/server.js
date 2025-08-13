console.log('🚗 Starting Volvo EX30 UI Server...');

const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
const axios = require('axios');
const crypto = require('crypto');

console.log('✅ Dependencies loaded successfully');

class VolvoEX30UiServer extends HomebridgePluginUiServer {
    constructor() {
        console.log('🏗️ Initializing VolvoEX30UiServer...');
        super();

        // Simple session storage for PKCE parameters
        this.authSessions = new Map();

        // Bind OAuth endpoints following Mercedes plugin pattern
        this.onRequest('/authCode', this.handleAuthCode.bind(this));
        this.onRequest('/authToken', this.handleAuthToken.bind(this));
        this.onRequest('/config', this.handleConfig.bind(this));

        // Health check endpoint
        this.onRequest('/health', async () => {
            console.log('🏥 Health check endpoint called');
            return { 
                status: 'Volvo EX30 UI Server Running', 
                timestamp: new Date().toISOString(),
                version: '1.2.24',
                activeSessions: this.authSessions.size,
                uptime: process.uptime()
            };
        });

        // Simple test endpoint for debugging
        this.onRequest('/test', async () => {
            console.log('🧪 Test endpoint called');
            return { status: 'Volvo EX30 UI Server Running', timestamp: new Date().toISOString() };
        });

        this.ready();
        console.log('✅ VolvoEX30UiServer ready!');
    }

    async handleAuthCode(request) {
        console.log('🔐 Handling auth code generation');
        console.log('📥 Request method:', request.method);
        console.log('📥 Request body:', request.body);
        
        const { clientId, region = 'eu' } = request.body;
        
        if (!clientId) {
            throw new RequestError('Client ID is required', { status: 400 });
        }

        try {
            // Discover OpenID endpoints following official Volvo sample
            const endpoints = await this.discoverVolvoEndpoints(region);
            
            // Generate PKCE parameters
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = this.generateCodeChallenge(codeVerifier);
            const state = crypto.randomBytes(16).toString('hex');
            
            // Store session data
            const sessionId = crypto.randomBytes(16).toString('hex');
            this.authSessions.set(sessionId, {
                codeVerifier,
                state,
                clientId,
                region,
                endpoints,
                createdAt: Date.now()
            });

            // Clean old sessions
            this.cleanupOldSessions();

            // Use OAuth redirect URI configured in Volvo Developer Portal
            // For development/testing, we use the GitHub repo as per Volvo's test setup
            // For production, this should match the registered redirect URI
            const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
            
            const authParams = new URLSearchParams({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: redirectUri,
                scope: 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid energy:state:read energy:capability:read conve:battery_charge_level conve:diagnostics_engine_status conve:warnings',
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                state: state
            });

            const authUrl = `${endpoints.authorization_endpoint}?${authParams.toString()}`;
            
            console.log(`✅ Generated auth URL for session ${sessionId}`);
            
            const response = {
                authUrl,
                sessionId,
                state
            };
            
            console.log('📤 Returning response:', response);
            return response;
            
        } catch (error) {
            console.error('❌ Auth code generation failed:', error);
            throw new RequestError(`Failed to generate authorization URL: ${error.message}`, { status: 500 });
        }
    }

    async handleAuthToken(request) {
        console.log('🎫 Handling token exchange');
        
        const { code, sessionId, clientSecret } = request.body;
        
        if (!code || !sessionId || !clientSecret) {
            throw new RequestError('Missing required parameters: code, sessionId, clientSecret', { status: 400 });
        }

        // Retrieve session data
        const session = this.authSessions.get(sessionId);
        
        if (!session) {
            console.log(`❌ Session ${sessionId} not found`);
            throw new RequestError('Invalid or expired session', { status: 400 });
        }

        const { codeVerifier, clientId, region, endpoints } = session;

        try {
            // Must match the authorization request redirect URI exactly
            const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
            
            const tokenParams = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier
            });

            console.log(`🌍 Making token request to: ${endpoints.token_endpoint}`);

            const tokenResponse = await axios.post(endpoints.token_endpoint, tokenParams, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            console.log('✅ Token exchange successful!');

            // Clean up session
            this.authSessions.delete(sessionId);

            return {
                access_token: tokenResponse.data.access_token,
                refresh_token: tokenResponse.data.refresh_token,
                expires_in: tokenResponse.data.expires_in
            };

        } catch (error) {
            console.error('❌ Token exchange failed:', error.response?.data || error.message);
            
            throw new RequestError(
                `Token exchange failed: ${error.response?.data?.error_description || error.message}`,
                { status: 400 }
            );
        }
    }

    async handleConfig(request) {
        console.log(`📝 Handling config ${request.method}`);
        
        if (request.method === 'GET') {
            try {
                const currentConfig = await this.homebridgeConfig.getPluginConfig('VolvoEX30');
                console.log('🔍 Retrieved plugin config:', JSON.stringify(currentConfig, null, 2));
                
                if (Array.isArray(currentConfig) && currentConfig.length > 0) {
                    console.log('✅ Returning first config from array:', currentConfig[0]);
                    return currentConfig[0];
                } else if (currentConfig && typeof currentConfig === 'object') {
                    console.log('✅ Returning config object directly:', currentConfig);
                    return currentConfig;
                } else {
                    console.log('📄 No existing config found, returning empty object');
                    return {};
                }
            } catch (error) {
                console.error('❌ Error loading config:', error.message);
                return {};
            }
        } else if (request.method === 'POST') {
            const config = request.body;
            
            // Validate required fields
            if (!config.vin || !config.clientId || !config.clientSecret || !config.vccApiKey || !config.refreshToken) {
                throw new RequestError('Missing required configuration fields', { status: 400 });
            }

            // Validate VIN format
            if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(config.vin)) {
                throw new RequestError('Invalid VIN format. Must be 17 characters.', { status: 400 });
            }

            try {
                const newConfig = [{
                    platform: 'VolvoEX30',
                    name: config.name,
                    vin: config.vin,
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                    vccApiKey: config.vccApiKey,
                    refreshToken: config.refreshToken,
                    region: config.region,
                    pollingInterval: config.pollingInterval,
                    enableBattery: config.enableBattery,
                    enableClimate: config.enableClimate,
                    enableLocks: config.enableLocks,
                    enableDoors: config.enableDoors
                }];

                await this.homebridgeConfig.updatePluginConfig('VolvoEX30', newConfig);
                
                this.pushEvent('config-saved', { success: true });
                return { success: true, message: 'Configuration saved successfully' };

            } catch (error) {
                this.pushEvent('config-error', { message: error.message });
                throw new RequestError(`Failed to save configuration: ${error.message}`, { status: 500 });
            }
        } else {
            throw new RequestError('Method not allowed', { status: 405 });
        }
    }

    generateCodeVerifier() {
        // Generate 128 bytes of random data, base64url encode
        // This follows RFC 7636 specification for PKCE
        return crypto.randomBytes(32)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    generateCodeChallenge(codeVerifier) {
        // SHA256 hash of code verifier, base64url encoded
        // This follows RFC 7636 specification for PKCE
        const hash = crypto.createHash('sha256').update(codeVerifier).digest();
        return hash.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    async discoverVolvoEndpoints(region = 'eu') {
        // Discover Volvo ID OpenID configuration
        // Following official Volvo sample pattern
        const baseUrl = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
        
        try {
            const response = await axios.get(`${baseUrl}/.well-known/openid_configuration`);
            console.log('🔍 Discovered Volvo ID endpoints:', {
                authorization_endpoint: response.data.authorization_endpoint,
                token_endpoint: response.data.token_endpoint,
                issuer: response.data.issuer
            });
            return response.data;
        } catch (error) {
            console.warn('⚠️ Failed to discover OpenID endpoints, using defaults:', error.message);
            return {
                authorization_endpoint: `${baseUrl}/as/authorization.oauth2`,
                token_endpoint: `${baseUrl}/as/token.oauth2`,
                issuer: baseUrl
            };
        }
    }

    cleanupOldSessions() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [sessionId, session] of this.authSessions.entries()) {
            if (session.createdAt < oneHourAgo) {
                this.authSessions.delete(sessionId);
            }
        }
    }
}

// Direct instantiation following Mercedes plugin pattern
console.log('🚀 Creating VolvoEX30UiServer instance...');
new VolvoEX30UiServer();
console.log('🎉 Volvo EX30 UI Server started successfully!');