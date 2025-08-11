// Volvo EX30 Plugin Configuration UI
class VolvoEX30ConfigUI {
    constructor() {
        this.sessionId = null;
        this.oauthState = null;
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

        console.log('🚀 Starting OAuth with:', { clientId: clientId?.substring(0, 8) + '...', region });

        if (!clientId || !clientSecret) {
            this.showError('Please enter your Client ID and Client Secret first.');
            return;
        }

        try {
            console.log('📡 Making authorization request to server...');
            const authResponse = await fetch('/oauth/authorize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    clientId,
                    clientSecret,
                    region
                })
            });

            if (!authResponse.ok) {
                const errorData = await authResponse.json();
                throw new Error(errorData.message || 'Failed to generate authorization URL');
            }

            const authData = await authResponse.json();
            this.sessionId = authData.sessionId;
            this.oauthState = authData.state;
            this.authUrl = authData.authUrl;
            
            console.log('✅ Authorization URL generated:', {
                sessionId: this.sessionId,
                state: this.oauthState,
                authUrl: authData.authUrl.substring(0, 100) + '...'
            });
            
            $('#authUrl').text(authData.authUrl);
            
            this.showStep(2);
            
        } catch (error) {
            console.error('❌ OAuth start failed:', error);
            this.showError(`Failed to start OAuth: ${error.message}`);
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
        if (!this.sessionId || !this.oauthState) {
            this.showError('Session expired. Please restart OAuth process.');
            return;
        }

        try {
            $('#step2').removeClass('active').addClass('complete');
            this.showStep(4); // Skip step 3, go directly to success
            
            $('.loading').show();
            const response = await this.makeTokenRequest(code, this.sessionId, this.oauthState);
            
            if (response.refresh_token) {
                $('#refreshToken').val(response.refresh_token);
                $('#tokenDisplay').text(response.refresh_token);
                // Clear session data after successful exchange
                this.sessionId = null;
                this.oauthState = null;
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

        if (!authCode) {
            this.showError('Please enter the authorization code.');
            return;
        }

        if (!this.sessionId || !this.oauthState) {
            this.showError('Session expired. Please restart the OAuth process.');
            return;
        }

        $('.loading').show();
        $('#exchangeToken').prop('disabled', true);

        try {
            const response = await this.makeTokenRequest(authCode, this.sessionId, this.oauthState);
            
            if (response.refresh_token) {
                $('#refreshToken').val(response.refresh_token);
                $('#tokenDisplay').text(response.refresh_token);
                // Clear session data after successful exchange
                this.sessionId = null;
                this.oauthState = null;
                
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
            if (error.message.includes('session')) {
                errorMessage += ' Please restart the OAuth process.';
            } else if (error.message.includes('invalid_grant')) {
                errorMessage += ' The authorization code may have expired or been used already.';
            }
            
            this.showError(errorMessage);
        }
    }

    async makeTokenRequest(code, sessionId, state) {
        console.log('🔄 Making token exchange request:', {
            code: code?.substring(0, 16) + '...',
            sessionId,
            state
        });

        const response = await fetch('/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code,
                sessionId,
                state
            })
        });

        console.log(`📡 Token exchange response status: ${response.status}`);

        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Token exchange error:', error);
            throw new Error(error.message || 'Token exchange failed');
        }

        const tokenData = await response.json();
        console.log('✅ Token exchange successful:', Object.keys(tokenData));
        
        return tokenData;
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