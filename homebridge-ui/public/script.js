/**
 * Volvo EX30 Plugin Configuration UI
 * Simplified Mercedes-style OAuth flow with current plugin-ui-utils
 */

// Global state
let currentSessionId = null;
let currentState = null;

$(document).ready(() => {
    console.log('🚗 Volvo EX30 UI initialized');
    
    // Load current configuration
    loadCurrentConfig();
    
    // Bind event handlers
    $('#startOAuth').on('click', startOAuthFlow);
    $('#copyUrl').on('click', copyAuthUrl);
    $('#openUrl').on('click', openAuthUrl);
    $('#gotCode').on('click', showCodeEntry);
    $('#exchangeToken').on('click', exchangeTokens);
    $('#saveConfig').on('click', saveConfiguration);
    $('#loadConfig').on('click', loadCurrentConfig);
});

async function startOAuthFlow() {
    console.log('🚀 Starting OAuth flow');
    
    const clientId = $('#clientId').val().trim();
    const region = $('#region').val();
    
    if (!clientId) {
        showError('Please enter your Client ID first.');
        return;
    }
    
    try {
        $('#startOAuth').prop('disabled', true).text('⏳ Generating URL...');
        
        const response = await makeRequest('/authCode', 'POST', {
            clientId,
            region
        });
        
        console.log('✅ Auth URL generated', response);
        
        currentSessionId = response.sessionId;
        currentState = response.state;
        
        $('#authUrl').text(response.authUrl);
        $('#openUrl').attr('href', response.authUrl);
        
        // Update UI
        $('#step1').removeClass('active').addClass('complete');
        $('#step2').show().addClass('active');
        
        hideError();
        
    } catch (error) {
        console.error('❌ Failed to start OAuth:', error);
        showError(`Failed to generate authorization URL: ${error.message || error}`);
    } finally {
        $('#startOAuth').prop('disabled', false).text('🚀 Start OAuth Setup');
    }
}

function copyAuthUrl() {
    const authUrl = $('#authUrl').text();
    navigator.clipboard.writeText(authUrl).then(() => {
        $('#copyUrl').text('✅ Copied!');
        setTimeout(() => {
            $('#copyUrl').text('📋 Copy URL');
        }, 2000);
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = authUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        $('#copyUrl').text('✅ Copied!');
        setTimeout(() => {
            $('#copyUrl').text('📋 Copy URL');
        }, 2000);
    });
}

function openAuthUrl() {
    const authUrl = $('#authUrl').text();
    window.open(authUrl, '_blank');
}

function showCodeEntry() {
    $('#step2').removeClass('active').addClass('complete');
    $('#step3').show().addClass('active');
    $('#authCode').focus();
}

async function exchangeTokens() {
    console.log('🔄 Exchanging authorization code for tokens');
    
    const authCode = $('#authCode').val().trim();
    const clientSecret = $('#clientSecret').val().trim();
    
    if (!authCode) {
        showError('Please enter the authorization code from your browser.');
        return;
    }
    
    if (!clientSecret) {
        showError('Please enter your Client Secret.');
        return;
    }
    
    if (!currentSessionId) {
        showError('Session expired. Please start OAuth again.');
        return;
    }
    
    try {
        $('#exchangeToken').prop('disabled', true);
        $('.loading').show();
        
        const response = await makeRequest('/authToken', 'POST', {
            code: authCode,
            sessionId: currentSessionId,
            clientSecret: clientSecret
        });
        
        console.log('✅ Token exchange successful');
        
        // Store the refresh token
        $('#refreshToken').val(response.refresh_token);
        $('#tokenDisplay').text(response.refresh_token);
        
        // Update UI
        $('#step3').removeClass('active').addClass('complete');
        $('#step4').show().addClass('active');
        
        hideError();
        
    } catch (error) {
        console.error('❌ Token exchange failed:', error);
        showError(`Token exchange failed: ${error.message || error}`);
    } finally {
        $('#exchangeToken').prop('disabled', false);
        $('.loading').hide();
    }
}

async function saveConfiguration() {
    console.log('💾 Saving configuration');
    
    const config = {
        name: $('#name').val().trim() || 'Volvo EX30',
        vin: $('#vin').val().trim(),
        clientId: $('#clientId').val().trim(),
        clientSecret: $('#clientSecret').val().trim(),
        vccApiKey: $('#vccApiKey').val().trim(),
        refreshToken: $('#refreshToken').val().trim(),
        region: $('#region').val(),
        pollingInterval: parseInt($('#pollingInterval').val()) || 5,
        enableBattery: $('#enableBattery').is(':checked'),
        enableClimate: $('#enableClimate').is(':checked'),
        enableLocks: $('#enableLocks').is(':checked'),
        enableDoors: $('#enableDoors').is(':checked')
    };
    
    // Validate required fields
    if (!config.vin) {
        showError('Please enter your VIN.');
        return;
    }
    
    if (!config.clientId || !config.clientSecret || !config.vccApiKey) {
        showError('Please enter all API credentials.');
        return;
    }
    
    if (!config.refreshToken) {
        showError('Please complete OAuth authorization to get a refresh token.');
        return;
    }
    
    try {
        $('#saveConfig').prop('disabled', true).text('⏳ Saving...');
        
        const response = await makeRequest('/config', 'POST', config);
        
        console.log('✅ Configuration saved');
        showSuccess('Configuration saved successfully! Restart Homebridge to apply changes.');
        
    } catch (error) {
        console.error('❌ Failed to save config:', error);
        showError(`Failed to save configuration: ${error.message || error}`);
    } finally {
        $('#saveConfig').prop('disabled', false).text('💾 Save Configuration');
    }
}

async function loadCurrentConfig() {
    console.log('📥 Loading current configuration');
    
    try {
        const config = await makeRequest('/config', 'GET');
        
        if (Object.keys(config).length > 0) {
            console.log('📋 Config loaded:', config);
            
            $('#name').val(config.name || 'Volvo EX30');
            $('#vin').val(config.vin || '');
            $('#clientId').val(config.clientId || '');
            $('#clientSecret').val(config.clientSecret || '');
            $('#vccApiKey').val(config.vccApiKey || '');
            $('#refreshToken').val(config.refreshToken || '');
            $('#region').val(config.region || 'eu');
            $('#pollingInterval').val(config.pollingInterval || 5);
            $('#enableBattery').prop('checked', config.enableBattery !== false);
            $('#enableClimate').prop('checked', config.enableClimate === true);
            $('#enableLocks').prop('checked', config.enableLocks === true);
            $('#enableDoors').prop('checked', config.enableDoors === true);
            
            if (config.refreshToken) {
                $('#tokenDisplay').text(config.refreshToken);
                $('#step1').removeClass('active').addClass('complete');
                $('#step2').removeClass('active').addClass('complete');
                $('#step3').removeClass('active').addClass('complete');
                $('#step4').show().addClass('complete');
            }
        } else {
            console.log('📄 No existing configuration found');
        }
        
    } catch (error) {
        console.error('❌ Failed to load config:', error);
    }
}

async function makeRequest(endpoint, method, data = null) {
    console.log(`📡 Making ${method} request to ${endpoint}`, data);
    
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };
    
    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(endpoint, options);
        
        console.log(`📡 Response status: ${response.status}`);
        
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                // Response might not be JSON
                const text = await response.text();
                console.error('❌ Non-JSON error response:', text);
                errorMessage = 'Server returned non-JSON response. Check server logs.';
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        console.log('✅ Request successful:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Request failed:', error);
        throw error;
    }
}

function showError(message) {
    $('#errorMessage').text(message).show();
    // Auto-hide after 10 seconds
    setTimeout(() => {
        $('#errorMessage').hide();
    }, 10000);
}

function hideError() {
    $('#errorMessage').hide();
}

function showSuccess(message) {
    // Create or update success message
    let successDiv = $('#successMessage');
    if (successDiv.length === 0) {
        successDiv = $('<div id="successMessage" class="success-message" style="display: none;"></div>');
        $('#errorMessage').after(successDiv);
    }
    
    successDiv.text(message).show();
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        successDiv.hide();
    }, 5000);
}