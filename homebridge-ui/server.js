const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
const axios = require('axios');

class VolvoEX30PluginUiServer extends HomebridgePluginUiServer {
    constructor() {
        super();

        // Handle OAuth token exchange
        this.onRequest('/oauth/token', this.handleTokenExchange.bind(this));
        
        // Handle configuration save/load
        this.onRequest('/config', this.handleConfig.bind(this));

        this.ready();
    }

    async handleTokenExchange(request, response) {
        if (request.method !== 'POST') {
            throw new RequestError('Method not allowed', { status: 405 });
        }

        const { code, clientId, clientSecret, region, redirectUri } = request.body;

        if (!code || !clientId || !clientSecret || !region || !redirectUri) {
            throw new RequestError('Missing required parameters', { status: 400 });
        }

        try {
            const baseUrl = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
            
            const params = new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: clientId,
                client_secret: clientSecret,
                code: code,
                redirect_uri: redirectUri
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