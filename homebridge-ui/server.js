console.log('🚗 Starting Volvo EX30 UI Server v1.3.0...');

try {
    const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
    const path = require('path');
    const axios = require('axios');
    
    console.log('✅ Core dependencies loaded successfully');

    // Import the shared OAuth handler (will be compiled to JavaScript)
    let SharedOAuthHandler;
    try {
        SharedOAuthHandler = require('../dist/auth/oauth-setup-shared').SharedOAuthHandler;
        console.log('✅ SharedOAuthHandler loaded successfully');
    } catch (error) {
        console.error('❌ Failed to load SharedOAuthHandler:', error.message);
        console.log('🔄 Falling back to built-in OAuth implementation');
        SharedOAuthHandler = null;
    }

    console.log('✅ All dependencies loaded successfully');

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
                version: '1.3.0',
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
            let authUrl, codeVerifier, state;
            
            if (SharedOAuthHandler) {
                // Use shared OAuth handler if available
                const oauthHandler = new SharedOAuthHandler({ clientId, region });
                const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
                const authResult = oauthHandler.generateAuthorizationUrl(redirectUri);
                
                authUrl = authResult.authUrl;
                codeVerifier = authResult.codeVerifier;
                state = authResult.state;
            } else {
                // Fallback OAuth implementation
                const crypto = require('crypto');
                codeVerifier = this.generateCodeVerifier();
                const codeChallenge = this.generateCodeChallenge(codeVerifier);
                state = crypto.randomBytes(16).toString('hex');
                
                const baseURL = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
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

                authUrl = `${baseURL}/as/authorization.oauth2?${authParams.toString()}`;
            }
            
            // Store session data
            const sessionId = require('crypto').randomBytes(16).toString('hex');
            this.authSessions.set(sessionId, {
                codeVerifier,
                state,
                clientId,
                region,
                createdAt: Date.now()
            });

            // Clean old sessions
            this.cleanupOldSessions();
            
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

        const { codeVerifier, clientId, region } = session;

        try {
            const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
            console.log('🌍 Exchanging authorization code for tokens...');

            let tokens;
            
            if (SharedOAuthHandler) {
                // Use shared OAuth handler if available
                const oauthHandler = new SharedOAuthHandler({ 
                    clientId, 
                    clientSecret, 
                    region 
                });
                tokens = await oauthHandler.exchangeCodeForTokens(code, redirectUri, codeVerifier);
            } else {
                // Fallback token exchange implementation
                const axios = require('axios');
                const baseURL = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
                
                const params = new URLSearchParams({
                    grant_type: 'authorization_code',
                    client_id: clientId,
                    client_secret: clientSecret,
                    code: code,
                    redirect_uri: redirectUri,
                    code_verifier: codeVerifier
                });

                const response = await axios.post(`${baseURL}/as/token.oauth2`, params, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    },
                    timeout: 30000
                });

                tokens = {
                    access_token: response.data.access_token,
                    refresh_token: response.data.refresh_token,
                    expires_in: response.data.expires_in
                };
            }

            console.log('✅ Token exchange successful!');

            // Clean up session
            this.authSessions.delete(sessionId);

            return tokens;

        } catch (error) {
            console.error('❌ Token exchange failed:', error.message);
            
            throw new RequestError(
                `Token exchange failed: ${error.message}`,
                { status: 400 }
            );
        }
    }

    async handleConfig(request) {
        console.log(`📝 Handling config ${request.method}`);
        
        if (request.method === 'GET') {
            try {
                // Read the complete Homebridge config to access platforms array
                const homebridgeConfig = await this.homebridgeConfig.getConfig();
                const platforms = homebridgeConfig.platforms || [];
                
                // Find the first VolvoEX30 platform configuration
                const volvoConfig = platforms.find(platform => platform.platform === 'VolvoEX30');
                
                if (volvoConfig) {
                    console.log('✅ Found VolvoEX30 config:', JSON.stringify(volvoConfig, null, 2));
                    // Return config without the 'platform' field as it's not needed in the UI
                    const { platform, ...configWithoutPlatform } = volvoConfig;
                    return configWithoutPlatform;
                } else {
                    console.log('📄 No VolvoEX30 platform found in config, returning empty object');
                    return {};
                }
            } catch (error) {
                console.error('❌ Error loading config:', error.message);
                return {};
            }
        } else if (request.method === 'POST') {
            const config = request.body;
            
            // Validate required fields
            if (!config.vin || !config.clientId || !config.clientSecret || !config.vccApiKey || !config.initialRefreshToken) {
                throw new RequestError('Missing required configuration fields', { status: 400 });
            }

            // Validate VIN format
            if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(config.vin)) {
                throw new RequestError('Invalid VIN format. Must be 17 characters.', { status: 400 });
            }

            try {
                // Read current Homebridge config
                const homebridgeConfig = await this.homebridgeConfig.getConfig();
                let platforms = homebridgeConfig.platforms || [];
                
                // Create the platform config object
                const platformConfig = {
                    platform: 'VolvoEX30',
                    name: config.name,
                    vin: config.vin,
                    clientId: config.clientId,
                    clientSecret: config.clientSecret,
                    vccApiKey: config.vccApiKey,
                    initialRefreshToken: config.initialRefreshToken,
                    region: config.region,
                    pollingInterval: config.pollingInterval,
                    enableBattery: config.enableBattery,
                    enableClimate: config.enableClimate,
                    enableLocks: config.enableLocks,
                    enableDoors: config.enableDoors
                };

                // Find and update existing VolvoEX30 config, or add new one
                const existingIndex = platforms.findIndex(platform => platform.platform === 'VolvoEX30');
                
                if (existingIndex >= 0) {
                    // Update existing configuration
                    platforms[existingIndex] = platformConfig;
                    console.log('🔄 Updated existing VolvoEX30 platform config');
                } else {
                    // Add new configuration
                    platforms.push(platformConfig);
                    console.log('➕ Added new VolvoEX30 platform config');
                }

                // Update the platforms array in the config
                homebridgeConfig.platforms = platforms;
                
                // Save the updated config
                await this.homebridgeConfig.updateConfig(homebridgeConfig);
                
                this.pushEvent('config-saved', { success: true });
                console.log('✅ Configuration saved to platforms array successfully');
                return { success: true, message: 'Configuration saved successfully' };

            } catch (error) {
                console.error('❌ Failed to save config:', error);
                this.pushEvent('config-error', { message: error.message });
                throw new RequestError(`Failed to save configuration: ${error.message}`, { status: 500 });
            }
        } else {
            throw new RequestError('Method not allowed', { status: 405 });
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

    // Fallback OAuth methods (used when SharedOAuthHandler fails to load)
    generateCodeVerifier() {
        // Generate 128 bytes of random data, base64url encode
        // This follows RFC 7636 specification for PKCE
        return require('crypto').randomBytes(32)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    generateCodeChallenge(codeVerifier) {
        // SHA256 hash of code verifier, base64url encoded
        // This follows RFC 7636 specification for PKCE
        const hash = require('crypto').createHash('sha256').update(codeVerifier).digest();
        return hash.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
}

    // Direct instantiation following Mercedes plugin pattern
    console.log('🚀 Creating VolvoEX30UiServer instance...');
    new VolvoEX30UiServer();
    console.log('🎉 Volvo EX30 UI Server started successfully!');

} catch (error) {
    console.error('❌ Failed to start Volvo EX30 UI Server:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    // Fallback minimal server to prevent complete failure
    try {
        const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
        
        class FallbackUiServer extends HomebridgePluginUiServer {
            constructor() {
                super();
                console.log('🔄 Starting fallback UI server...');
                
                this.onRequest('/health', async () => {
                    return { 
                        status: 'Fallback UI Server Running', 
                        error: 'Main server failed to load',
                        timestamp: new Date().toISOString()
                    };
                });
                
                this.ready();
                console.log('✅ Fallback UI server ready');
            }
        }
        
        new FallbackUiServer();
    } catch (fallbackError) {
        console.error('❌ Even fallback server failed:', fallbackError.message);
        process.exit(1);
    }
}