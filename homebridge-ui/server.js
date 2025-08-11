console.log('🔍 Starting server.js execution...');

let HomebridgePluginUiServer, RequestError, axios, http, crypto;

try {
    ({ HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils'));
    console.log('✅ Successfully loaded @homebridge/plugin-ui-utils');
    
    axios = require('axios');
    console.log('✅ Successfully loaded axios');
    
    http = require('http');
    crypto = require('crypto');
    console.log('✅ Successfully loaded built-in modules');

} catch (error) {
    console.error('💥 Failed to load dependencies:', error);
    throw error;
}

class VolvoEX30PluginUiServer extends HomebridgePluginUiServer {
    constructor() {
        try {
            console.log('🚀 Initializing VolvoEX30PluginUiServer...');
            super();

            // OAuth callback server
            this.oauthServer = null;
            this.oauthCallbackData = null;
            
            // OAuth session storage
            this.oauthSessions = new Map(); // sessionId -> { codeVerifier, state, clientId, clientSecret, region }

            // Add a simple test endpoint to verify server is running
            this.onRequest('/test', (request, response) => {
                console.log('🧪 Test endpoint hit!');
                response.json({ status: 'VolvoEX30 UI Server Running', timestamp: new Date().toISOString() });
            });

            // Handle OAuth endpoints with error wrapping
            this.onRequest('/oauth/authorize', this.wrapHandler(this.handleAuthorizationRequest.bind(this)));
            this.onRequest('/oauth/token', this.wrapHandler(this.handleTokenExchange.bind(this)));
            this.onRequest('/oauth/start-server', this.wrapHandler(this.startOAuthServer.bind(this)));
            this.onRequest('/oauth/stop-server', this.wrapHandler(this.stopOAuthServer.bind(this)));
            this.onRequest('/oauth/check-callback', this.wrapHandler(this.checkOAuthCallback.bind(this)));
            this.onRequest('/config', this.wrapHandler(this.handleConfig.bind(this)));

            this.ready();
            console.log('✅ VolvoEX30PluginUiServer initialized successfully');
        } catch (error) {
            console.error('💥 Failed to initialize VolvoEX30PluginUiServer:', error);
            throw error;
        }
    }

    wrapHandler(handler) {
        return async (request, response) => {
            try {
                console.log(`📡 Handling ${request.method} ${request.url}`);
                await handler(request, response);
            } catch (error) {
                console.error(`💥 Handler error for ${request.method} ${request.url}:`, error);
                console.error('💥 Error stack:', error.stack);
                
                // Send JSON error response instead of letting it become HTML
                if (!response.headersSent) {
                    response.status(500).json({
                        error: 'Internal Server Error',
                        message: error.message,
                        details: error.stack
                    });
                }
            }
        };
    }

    async handleAuthorizationRequest(request, response) {
        if (request.method !== 'POST') {
            throw new RequestError('Method not allowed', { status: 405 });
        }

        const { clientId, clientSecret, region } = request.body;

        if (!clientId || !clientSecret || !region) {
            throw new RequestError('Missing required parameters', { status: 400 });
        }

        try {
            // Generate session ID and PKCE parameters
            const sessionId = crypto.randomBytes(16).toString('hex');
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = this.generateCodeChallenge(codeVerifier);
            const state = crypto.randomBytes(16).toString('hex');
            
            // Store session data
            this.oauthSessions.set(sessionId, {
                codeVerifier,
                state,
                clientId,
                clientSecret,
                region,
                createdAt: Date.now()
            });

            console.log(`🔑 Created OAuth session ${sessionId} with state ${state}`);

            // Clean up old sessions
            this.cleanupOldSessions();

            // Build authorization URL
            const baseUrl = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
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

            const authUrl = `${baseUrl}/as/authorization.oauth2?${authParams.toString()}`;
            
            response.send({
                authUrl,
                sessionId,
                state
            });

        } catch (error) {
            console.error('❌ OAuth authorization error:', error.message);
            throw new RequestError(`Authorization failed: ${error.message}`, { status: 500 });
        }
    }

    cleanupOldSessions() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [sessionId, session] of this.oauthSessions.entries()) {
            if (session.createdAt < oneHourAgo) {
                this.oauthSessions.delete(sessionId);
            }
        }
    }

    async startOAuthServer(request, response) {
        if (request.method !== 'POST') {
            throw new RequestError('Method not allowed', { status: 405 });
        }

        // Stop existing server if running
        if (this.oauthServer) {
            this.oauthServer.close();
        }

        this.oauthCallbackData = null;

        return new Promise((resolve, reject) => {
            // Create a simple HTTP server to catch the OAuth callback
            this.oauthServer = http.createServer((req, res) => {
                const url = new URL(req.url, 'http://localhost:3000');
                
                if (url.pathname === '/callback') {
                    const code = url.searchParams.get('code');
                    const state = url.searchParams.get('state');
                    const error = url.searchParams.get('error');

                    if (error) {
                        this.oauthCallbackData = { error: error, error_description: url.searchParams.get('error_description') };
                    } else if (code) {
                        this.oauthCallbackData = { code, state };
                    }

                    // Send a success page
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Volvo EX30 OAuth - Authorization Complete</title>
                            <style>
                                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; margin: 50px; }
                                .success { color: #28a745; }
                                .error { color: #dc3545; }
                            </style>
                        </head>
                        <body>
                            ${error ? `
                                <h1 class="error">❌ Authorization Failed</h1>
                                <p>Error: ${error}</p>
                                <p>${url.searchParams.get('error_description') || ''}</p>
                            ` : `
                                <h1 class="success">✅ Authorization Complete!</h1>
                                <p>You can now close this window and return to the Homebridge configuration.</p>
                                <p>The authorization code has been captured automatically.</p>
                            `}
                            <hr>
                            <p><small>Volvo EX30 Homebridge Plugin</small></p>
                        </body>
                        </html>
                    `);

                    // Notify the UI that callback was received
                    this.pushEvent('oauth-callback-received', this.oauthCallbackData);
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found');
                }
            });

            this.oauthServer.listen(3000, 'localhost', (err) => {
                if (err) {
                    reject(new RequestError(`Failed to start OAuth server: ${err.message}`, { status: 500 }));
                } else {
                    resolve();
                    response.send({ success: true, message: 'OAuth callback server started on port 3000' });
                }
            });

            // Auto-stop server after 10 minutes
            setTimeout(() => {
                if (this.oauthServer) {
                    this.oauthServer.close();
                    this.oauthServer = null;
                }
            }, 10 * 60 * 1000);
        });
    }

    async stopOAuthServer(request, response) {
        if (this.oauthServer) {
            this.oauthServer.close();
            this.oauthServer = null;
        }
        response.send({ success: true, message: 'OAuth callback server stopped' });
    }

    async checkOAuthCallback(request, response) {
        if (this.oauthCallbackData) {
            const data = this.oauthCallbackData;
            this.oauthCallbackData = null; // Clear after reading
            response.send(data);
        } else {
            response.send({ waiting: true });
        }
    }

    async handleTokenExchange(request, response) {
        if (request.method !== 'POST') {
            throw new RequestError('Method not allowed', { status: 405 });
        }

        const { code, sessionId, state } = request.body;
        console.log(`🔄 Token exchange request: sessionId=${sessionId}, state=${state}, code=${code?.substring(0, 16)}...`);

        if (!code || !sessionId || !state) {
            throw new RequestError('Missing required parameters: code, sessionId, state', { status: 400 });
        }

        // Retrieve session data
        const session = this.oauthSessions.get(sessionId);
        console.log(`📋 Session lookup: ${session ? 'found' : 'NOT FOUND'}`);
        
        if (!session) {
            console.log(`❌ Available sessions: ${Array.from(this.oauthSessions.keys())}`);
            throw new RequestError('Invalid or expired session', { status: 400 });
        }

        // Verify state parameter
        console.log(`🔍 State verification: received=${state}, expected=${session.state}, match=${session.state === state}`);
        if (session.state !== state) {
            throw new RequestError('State parameter mismatch', { status: 400 });
        }

        const { codeVerifier, clientId, clientSecret, region } = session;
        console.log(`🎫 Using session data: region=${region}, codeVerifier=${codeVerifier?.substring(0, 16)}...`);

        try {
            const baseUrl = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
            const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
            
            console.log(`🌍 Making token request to: ${baseUrl}/as/token.oauth2`);
            
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier
            });

            console.log(`📡 Token exchange parameters: ${params.toString()}`);

            const tokenResponse = await axios.post(`${baseUrl}/as/token.oauth2`, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            console.log(`✅ Token exchange successful! Got ${Object.keys(tokenResponse.data).join(', ')}`);

            const tokens = {
                access_token: tokenResponse.data.access_token,
                refresh_token: tokenResponse.data.refresh_token,
                expires_in: tokenResponse.data.expires_in
            };

            // Clean up session after successful token exchange
            this.oauthSessions.delete(sessionId);
            console.log(`🧹 Cleaned up session ${sessionId}`);

            response.send(tokens);

        } catch (error) {
            console.error(`❌ Token exchange failed:`, {
                status: error.response?.status,
                error: error.response?.data?.error,
                description: error.response?.data?.error_description,
                data: error.response?.data
            });

            this.pushEvent('oauth-error', {
                message: error.response?.data?.error_description || error.message
            });

            throw new RequestError(
                `OAuth token exchange failed: ${error.response?.data?.error_description || error.message}`,
                { status: 400 }
            );
        }
    }

    generateCodeVerifier() {
        // Generate base64url encoded string (compatible with older Node.js versions)
        return crypto.randomBytes(32)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    generateCodeChallenge(codeVerifier) {
        // Generate SHA256 hash and encode as base64url (compatible with older Node.js versions)
        const hash = crypto.createHash('sha256').update(codeVerifier).digest();
        return hash.toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }


    async handleConfig(request, response) {
        if (request.method === 'GET') {
            // Load current configuration
            try {
                const currentConfig = await this.homebridgeConfig.getPluginConfig('VolvoEX30');
                response.send(currentConfig[0] || {});
            } catch (error) {
                response.send({});
            }
        } else if (request.method === 'POST') {
            // Save configuration
            const config = request.body;
            
            // Validate required fields
            if (!config.vin || !config.clientId || !config.clientSecret || !config.vccApiKey || !config.refreshToken) {
                throw new RequestError('Missing required configuration fields', { status: 400 });
            }

            // Validate VIN format (basic check)
            if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(config.vin)) {
                throw new RequestError('Invalid VIN format. Must be 17 characters.', { status: 400 });
            }

            try {
                // Get current config array
                const platforms = await this.homebridgeConfig.getPluginConfig('VolvoEX30');
                
                // Replace or add our config
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

                // Save the configuration
                await this.homebridgeConfig.updatePluginConfig('VolvoEX30', newConfig);

                this.pushEvent('config-saved', { success: true });
                response.send({ success: true, message: 'Configuration saved successfully' });

            } catch (error) {
                this.pushEvent('config-error', {
                    message: error.message
                });
                
                throw new RequestError(`Failed to save configuration: ${error.message}`, { status: 500 });
            }
        } else {
            throw new RequestError('Method not allowed', { status: 405 });
        }
    }
}

(() => {
    return new VolvoEX30PluginUiServer();
})();