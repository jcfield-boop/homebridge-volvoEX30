const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');

class VolvoUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    this.onRequest('/authCode', this.generateAuthCode.bind(this));
    this.onRequest('/authToken', this.exchangeToken.bind(this));
    this.onRequest('/config', this.handleConfig.bind(this));

    this.ready();
  }

  async generateAuthCode(request) {
    const { clientId, region = 'eu' } = request.body;
    
    if (!clientId) {
      throw new RequestError('Client ID is required', { status: 400 });
    }

    const crypto = require('crypto');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    const state = crypto.randomBytes(16).toString('hex');
    
    const baseURL = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
    const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid energy:state:read energy:capability:read conve:battery_charge_level conve:diagnostics_engine_status conve:warnings conve:odometer conve:vehicle_relation conve:windows conve:doors conve:tyre_status conve:commands conve:statistics',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state
    });

    const authUrl = `${baseURL}/as/authorization.oauth2?${params.toString()}`;
    
    // Store session for token exchange
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.sessions = this.sessions || new Map();
    this.sessions.set(sessionId, {
      codeVerifier,
      state,
      clientId,
      region,
      createdAt: Date.now()
    });

    return {
      authUrl,
      sessionId,
      state
    };
  }

  async exchangeToken(request) {
    const { code, sessionId, clientSecret } = request.body;
    
    if (!code || !sessionId || !clientSecret) {
      throw new RequestError('Missing required parameters', { status: 400 });
    }

    this.sessions = this.sessions || new Map();
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new RequestError('Invalid session', { status: 400 });
    }

    const { codeVerifier, clientId, region } = session;
    const axios = require('axios');
    const baseURL = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
      code_verifier: codeVerifier
    });

    try {
      const response = await axios.post(`${baseURL}/as/token.oauth2`, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 30000
      });

      this.sessions.delete(sessionId);

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in
      };
    } catch (error) {
      throw new RequestError(`Token exchange failed: ${error.message}`, { status: 400 });
    }
  }

  async handleConfig(request) {
    if (request.method === 'GET') {
      try {
        const config = await this.homebridgeConfig.getConfig();
        const platforms = config.platforms || [];
        const volvoConfig = platforms.find(platform => platform.platform === 'VolvoEX30');
        
        if (volvoConfig) {
          const { platform, ...configWithoutPlatform } = volvoConfig;
          return configWithoutPlatform;
        }
        return {};
      } catch (error) {
        return {};
      }
    } else if (request.method === 'POST') {
      const config = request.body;
      
      if (!config.vin || !config.clientId || !config.clientSecret || !config.vccApiKey || !config.initialRefreshToken) {
        throw new RequestError('Missing required configuration fields', { status: 400 });
      }
      
      // Validate VCC API Key format (should be 32 characters)
      if (!config.vccApiKey || config.vccApiKey.length !== 32) {
        throw new RequestError('VCC API Key must be exactly 32 characters long', { status: 400 });
      }

      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(config.vin)) {
        throw new RequestError('Invalid VIN format', { status: 400 });
      }

      try {
        const homebridgeConfig = await this.homebridgeConfig.getConfig();
        let platforms = homebridgeConfig.platforms || [];
        
        const platformConfig = {
          platform: 'VolvoEX30',
          name: config.name,
          vin: config.vin,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          vccApiKey: config.vccApiKey,
          initialRefreshToken: config.initialRefreshToken,
          region: config.region || 'eu',
          pollingInterval: config.pollingInterval || 5,
          enableBattery: config.enableBattery !== false,
          enableClimate: config.enableClimate !== false,
          enableLocks: config.enableLocks !== false,
          enableDoors: config.enableDoors !== false,
          enableDiagnostics: config.enableDiagnostics !== false,
          apiPreference: config.apiPreference || 'connected-first'
        };

        const existingIndex = platforms.findIndex(platform => platform.platform === 'VolvoEX30');
        
        if (existingIndex >= 0) {
          platforms[existingIndex] = platformConfig;
        } else {
          platforms.push(platformConfig);
        }

        homebridgeConfig.platforms = platforms;
        await this.homebridgeConfig.updateConfig(homebridgeConfig);
        
        return { success: true, message: 'Configuration saved successfully' };
      } catch (error) {
        throw new RequestError(`Failed to save configuration: ${error.message}`, { status: 500 });
      }
    } else {
      throw new RequestError('Method not allowed', { status: 405 });
    }
  }
}

new VolvoUiServer();