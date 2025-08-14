console.log('🚗 Starting Volvo EX30 UI Server...');

const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
const path = require('path');

// Import the shared OAuth handler (will be compiled to JavaScript)
const { SharedOAuthHandler } = require('../dist/auth/oauth-setup-shared');

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
            // Create shared OAuth handler
            const oauthHandler = new SharedOAuthHandler({ clientId, region });
            
            // Use OAuth redirect URI configured in Volvo Developer Portal
            const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
            
            // Generate authorization URL with PKCE parameters
            const authResult = oauthHandler.generateAuthorizationUrl(redirectUri);
            
            // Store session data
            const sessionId = require('crypto').randomBytes(16).toString('hex');
            this.authSessions.set(sessionId, {
                codeVerifier: authResult.codeVerifier,
                state: authResult.state,
                clientId,
                region,
                oauthHandler,
                createdAt: Date.now()
            });

            // Clean old sessions
            this.cleanupOldSessions();
            
            console.log(`✅ Generated auth URL for session ${sessionId}`);
            
            const response = {
                authUrl: authResult.authUrl,
                sessionId,
                state: authResult.state
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
            // Create shared OAuth handler with client secret for token exchange
            const oauthHandler = new SharedOAuthHandler({ 
                clientId, 
                clientSecret, 
                region 
            });
            
            // Must match the authorization request redirect URI exactly
            const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
            
            console.log('🌍 Exchanging authorization code for tokens...');

            const tokens = await oauthHandler.exchangeCodeForTokens(code, redirectUri, codeVerifier);

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
}

// Direct instantiation following Mercedes plugin pattern
console.log('🚀 Creating VolvoEX30UiServer instance...');
new VolvoEX30UiServer();
console.log('🎉 Volvo EX30 UI Server started successfully!');