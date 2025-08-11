const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
const axios = require('axios');
const http = require('http');
const crypto = require('crypto');

class VolvoEX30PluginUiServer extends HomebridgePluginUiServer {
    constructor() {
        super();

        // OAuth callback server
        this.oauthServer = null;
        this.oauthCallbackData = null;
        
        // OAuth session storage (following Volvo's pattern)
        this.oauthSessions = new Map(); // sessionId -> { codeVerifier, state, clientId, clientSecret, region }

        // Handle OAuth authorization URL generation (following Volvo's pattern)
        this.onRequest('/oauth/authorize', this.handleAuthorizationRequest.bind(this));
        
        // Handle OAuth token exchange
        this.onRequest('/oauth/token', this.handleTokenExchange.bind(this));
        
        // Handle OAuth callback server start/stop
        this.onRequest('/oauth/start-server', this.startOAuthServer.bind(this));
        this.onRequest('/oauth/stop-server', this.stopOAuthServer.bind(this));
        this.onRequest('/oauth/check-callback', this.checkOAuthCallback.bind(this));
        
        // Handle configuration save/load
        this.onRequest('/config', this.handleConfig.bind(this));

        this.ready();
    }

    async handleAuthorizationRequest(request, response) {
        if (request.method !== 'POST') {
            throw new RequestError('Method not allowed', { status: 405 });
        }

        const { clientId, clientSecret, region } = request.body;

        if (!clientId || !clientSecret || !region) {
            throw new RequestError('Missing required parameters: clientId, clientSecret, region', { status: 400 });
        }

        try {
            // Generate session ID
            const sessionId = crypto.randomBytes(16).toString('hex');
            
            // Generate PKCE parameters (following Volvo's approach)
            const codeVerifier = this.generateCodeVerifier();
            const codeChallenge = this.generateCodeChallenge(codeVerifier);
            const state = crypto.randomBytes(16).toString('hex');
            
            // Store session data (like Volvo's session storage)
            this.oauthSessions.set(sessionId, {
                codeVerifier,
                state,
                clientId,
                clientSecret,
                region,
                createdAt: Date.now()
            });

            // Clean up old sessions (older than 1 hour)
            this.cleanupOldSessions();

            // Build authorization URL (matching Volvo's structure)
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
            throw new RequestError(`Authorization request failed: ${error.message}`, { status: 500 });
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

        if (!code || !sessionId || !state) {
            throw new RequestError('Missing required parameters: code, sessionId, state', { status: 400 });
        }

        // Retrieve session data (following Volvo's pattern)
        const session = this.oauthSessions.get(sessionId);
        if (!session) {
            throw new RequestError('Invalid or expired session', { status: 400 });
        }

        // Verify state parameter (following Volvo's security pattern)
        if (session.state !== state) {
            throw new RequestError('State parameter mismatch', { status: 400 });
        }

        const { codeVerifier, clientId, clientSecret, region } = session;

        try {
            const baseUrl = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
            
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri,
                code_verifier: codeVerifier
            });

            const tokenResponse = await axios.post(`${baseUrl}/as/token.oauth2`, params, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            const tokens = {
                access_token: tokenResponse.data.access_token,
                refresh_token: tokenResponse.data.refresh_token,
                expires_in: tokenResponse.data.expires_in
            };

            // Clean up session after successful token exchange (following Volvo's pattern)
            this.oauthSessions.delete(sessionId);

            response.send(tokens);

        } catch (error) {
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
        return crypto.randomBytes(32).toString('base64url');
    }

    generateCodeChallenge(codeVerifier) {
        const hash = crypto.createHash('sha256').update(codeVerifier).digest();
        return hash.toString('base64url');
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