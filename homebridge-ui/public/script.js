// Volvo EX30 Plugin Configuration UI
class VolvoEX30ConfigUI {
    constructor() {
        this.oauthState = null;
        this.codeVerifier = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadCurrentConfig();
    }

    bindEvents() {
        $('#startOAuth').on('click', () => this.startOAuth());
        $('#copyUrl').on('click', () => this.copyAuthUrl());
        $('#openUrl').on('click', () => this.openAuthUrl());
        $('#gotCode').on('click', () => this.showStep(3));
        $('#exchangeToken').on('click', () => this.exchangeToken());
        $('#saveConfig').on('click', () => this.saveConfiguration());
        $('#loadConfig').on('click', () => this.loadCurrentConfig());
    }

    showError(message) {
        $('#errorMessage').text(message).show();
        setTimeout(() => $('#errorMessage').hide(), 5000);
    }

    showStep(stepNumber) {
        $('.step').removeClass('active').hide();
        $(`#step${stepNumber}`).addClass('active').show();
        
        // Mark previous steps as complete
        for (let i = 1; i < stepNumber; i++) {
            $(`#step${i}`).addClass('complete');
        }
    }

    async startOAuth() {
        const clientId = $('#clientId').val().trim();
        const clientSecret = $('#clientSecret').val().trim();
        const region = $('#region').val();

        if (!clientId || !clientSecret) {
            this.showError('Please enter your Client ID and Client Secret first.');
            return;
        }

        // Basic validation
        if (clientId.length < 10) {
            this.showError('Client ID appears to be too short. Please check your credentials.');
            return;
        }

        if (clientSecret.length < 10) {
            this.showError('Client Secret appears to be too short. Please check your credentials.');
            return;
        }

        try {
            // Start the OAuth callback server
            const serverResponse = await fetch('/oauth/start-server', {
                method: 'POST'
            });

            if (!serverResponse.ok) {
                throw new Error('Failed to start OAuth callback server');
            }

            // Generate PKCE parameters
            this.codeVerifier = this.generateCodeVerifier();
            const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
            
            // Use GitHub repository as redirect URI
            const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
            this.oauthState = this.generateState();
            
            const baseUrl = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
            console.log('Region:', region, 'Base URL:', baseUrl); // Debug log
            const params = new URLSearchParams({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: redirectUri,
                scope: 'conve:fuel_status conve:climatization_start_stop conve:unlock conve:lock_status conve:lock openid energy:state:read energy:capability:read conve:battery_charge_level conve:diagnostics_engine_status conve:warnings',
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                state: this.oauthState
            });

            const authUrl = `${baseUrl}/as/authorization.oauth2?${params.toString()}`;
            
            $('#authUrl').text(authUrl);
            this.authUrl = authUrl;
            
            this.showStep(2);
            
        } catch (error) {
            let errorMessage = `Failed to start OAuth: ${error.message}`;
            if (error.message.includes('PKCE')) {
                errorMessage += ' This may be a browser compatibility issue with PKCE.';
            }
            this.showError(errorMessage);
        }
    }

    async startCallbackPolling() {
        // Poll every 2 seconds for OAuth callback
        this.callbackInterval = setInterval(async () => {
            try {
                const response = await fetch('/oauth/check-callback');
                const data = await response.json();
                
                if (data.error) {
                    clearInterval(this.callbackInterval);
                    this.showError(`OAuth authorization failed: ${data.error} - ${data.error_description || ''}`);
                } else if (data.code) {
                    clearInterval(this.callbackInterval);
                    // Automatically proceed with token exchange
                    this.autoExchangeToken(data.code);
                }
            } catch (error) {
                console.warn('Error polling for callback:', error);
            }
        }, 2000);

        // Stop polling after 10 minutes
        setTimeout(() => {
            if (this.callbackInterval) {
                clearInterval(this.callbackInterval);
                this.showError('OAuth authorization timed out. Please try again.');
            }
        }, 10 * 60 * 1000);
    }

    async autoExchangeToken(code) {
        const clientId = $('#clientId').val().trim();
        const clientSecret = $('#clientSecret').val().trim();
        const region = $('#region').val();

        try {
            $('#step2').removeClass('active').addClass('complete');
            this.showStep(4); // Skip step 3, go directly to success
            
            $('.loading').show();
            const response = await this.makeTokenRequest(code, clientId, clientSecret, region, this.codeVerifier);
            
            if (response.refresh_token) {
                $('#refreshToken').val(response.refresh_token);
                $('#tokenDisplay').text(response.refresh_token);
                this.codeVerifier = null; // Clear code verifier after successful exchange
                $('.loading').hide();
            } else {
                throw new Error('No refresh token received');
            }
            
        } catch (error) {
            $('.loading').hide();
            this.showError(`Token exchange failed: ${error.message}`);
        }
    }

    copyAuthUrl() {
        navigator.clipboard.writeText(this.authUrl).then(() => {
            const btn = $('#copyUrl');
            const originalText = btn.text();
            btn.text('✅ Copied!');
            setTimeout(() => btn.text(originalText), 2000);
        }).catch(() => {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = this.authUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            
            const btn = $('#copyUrl');
            const originalText = btn.text();
            btn.text('✅ Copied!');
            setTimeout(() => btn.text(originalText), 2000);
        });
    }

    openAuthUrl() {
        window.open(this.authUrl, '_blank');
    }

    async exchangeToken() {
        const authCode = $('#authCode').val().trim();
        const clientId = $('#clientId').val().trim();
        const clientSecret = $('#clientSecret').val().trim();
        const region = $('#region').val();

        if (!authCode) {
            this.showError('Please enter the authorization code.');
            return;
        }

        if (!this.codeVerifier) {
            this.showError('Code verifier not found. Please restart the OAuth process.');
            return;
        }

        $('.loading').show();
        $('#exchangeToken').prop('disabled', true);

        try {
            const response = await this.makeTokenRequest(authCode, clientId, clientSecret, region, this.codeVerifier);
            
            if (response.refresh_token) {
                $('#refreshToken').val(response.refresh_token);
                $('#tokenDisplay').text(response.refresh_token);
                this.codeVerifier = null; // Clear code verifier after successful exchange
                
                $('.loading').hide();
                $('#exchangeToken').prop('disabled', false);
                this.showStep(4);
            } else {
                throw new Error('No refresh token received');
            }
            
        } catch (error) {
            $('.loading').hide();
            $('#exchangeToken').prop('disabled', false);
            
            let errorMessage = `Token exchange failed: ${error.message}`;
            if (error.message.includes('code_challenge')) {
                errorMessage += ' The OAuth server requires PKCE support.';
            } else if (error.message.includes('invalid_grant')) {
                errorMessage += ' The authorization code may have expired or been used already.';
            }
            
            this.showError(errorMessage);
        }
    }

    async makeTokenRequest(code, clientId, clientSecret, region, codeVerifier) {
        const baseUrl = region === 'na' ? 'https://volvoid.volvocars.com' : 'https://volvoid.eu.volvocars.com';
        const redirectUri = 'https://github.com/jcfield-boop/homebridge-volvoEX30';
        
        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            client_secret: clientSecret,
            code: code,
            redirect_uri: redirectUri
        });

        // Since we can't make direct CORS requests to Volvo's OAuth endpoint from the browser,
        // we'll use our server-side endpoint
        const response = await fetch('/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code,
                clientId,
                clientSecret,
                region,
                redirectUri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
                codeVerifier
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Token exchange failed');
        }

        return await response.json();
    }

    generateState() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    generateCodeVerifier() {
        // Generate a code verifier (43-128 characters)
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return this.base64URLEncode(array);
    }

    async generateCodeChallenge(codeVerifier) {
        // Create SHA256 hash of code verifier
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return this.base64URLEncode(new Uint8Array(hash));
    }

    base64URLEncode(array) {
        return btoa(String.fromCharCode.apply(null, array))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    async saveConfiguration() {
        const vin = $('#vin').val().trim();
        const clientId = $('#clientId').val().trim();
        const clientSecret = $('#clientSecret').val().trim();
        const vccApiKey = $('#vccApiKey').val().trim();
        const refreshToken = $('#refreshToken').val().trim();

        if (!vin || !clientId || !clientSecret || !vccApiKey) {
            this.showError('Please fill in all required fields: VIN, Client ID, Client Secret, and VCC API Key.');
            return;
        }

        if (!refreshToken) {
            this.showError('Please complete the OAuth authorization to get a refresh token.');
            return;
        }

        const config = {
            platform: 'VolvoEX30',
            name: $('#name').val().trim() || 'Volvo EX30',
            vin: vin,
            clientId: clientId,
            clientSecret: clientSecret,
            vccApiKey: vccApiKey,
            refreshToken: refreshToken,
            region: $('#region').val(),
            pollingInterval: parseInt($('#pollingInterval').val()) || 5,
            enableBattery: $('#enableBattery').prop('checked'),
            enableClimate: $('#enableClimate').prop('checked'),
            enableLocks: $('#enableLocks').prop('checked'),
            enableDoors: $('#enableDoors').prop('checked')
        };

        try {
            const response = await fetch('/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                alert('✅ Configuration saved successfully! Please restart Homebridge to apply changes.');
            } else {
                const error = await response.json();
                this.showError(`Failed to save configuration: ${error.message}`);
            }
        } catch (error) {
            this.showError(`Failed to save configuration: ${error.message}`);
        }
    }

    async loadCurrentConfig() {
        try {
            const response = await fetch('/config');
            if (response.ok) {
                const config = await response.json();
                
                $('#name').val(config.name || 'Volvo EX30');
                $('#vin').val(config.vin || '');
                $('#clientId').val(config.clientId || '');
                $('#clientSecret').val(config.clientSecret || '');
                $('#vccApiKey').val(config.vccApiKey || '');
                $('#region').val(config.region || 'eu');
                $('#pollingInterval').val(config.pollingInterval || 5);
                $('#enableBattery').prop('checked', config.enableBattery !== false);
                $('#enableClimate').prop('checked', config.enableClimate === true);
                $('#enableLocks').prop('checked', config.enableLocks === true);
                $('#enableDoors').prop('checked', config.enableDoors === true);
                
                if (config.refreshToken) {
                    $('#refreshToken').val(config.refreshToken);
                    $('#tokenDisplay').text(config.refreshToken);
                    this.showStep(4);
                }
            }
        } catch (error) {
            console.warn('Could not load current configuration:', error);
        }
    }
}

// Initialize the UI when the page loads
$(document).ready(() => {
    new VolvoEX30ConfigUI();
});