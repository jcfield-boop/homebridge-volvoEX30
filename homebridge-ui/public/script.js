/**
 * Volvo EX30 Plugin Configuration UI
 * Simplified Mercedes-style OAuth flow with current plugin-ui-utils
 */

// Global state
let currentSessionId = null;
let currentState = null;

$(document).ready(() => {
    console.log('🚗 Volvo EX30 UI initialized');
    
    // Test server connectivity first
    testServerConnectivity();
    
    // Load current configuration
    loadCurrentConfig();
    
    // Bind event handlers
    $('#startOAuth').on('click', startOAuthFlow);
    $('#copyUrl').on('click', copyAuthUrl);
    $('#openUrl').on('click', openAuthUrl);
    $('#gotCode').on('click', showCodeEntry);
    $('#exchangeToken').on('click', exchangeTokens);
    $('#useManualToken').on('click', useManualToken);
    $('#saveConfig').on('click', saveConfiguration);
    $('#loadConfig').on('click', loadCurrentConfig);
});

async function testServerConnectivity() {
    console.log('🔍 Testing custom UI server connectivity...');
    
    try {
        const response = await makeRequest('/test', 'GET');
        console.log('✅ Custom UI server is working:', response);
        
        if (response.status && response.status.includes('VolvoEX30 UI Server Running')) {
            console.log('✅ Custom server endpoints are accessible');
        }
    } catch (error) {
        console.error('❌ Custom UI server test failed:', error);
        console.error('❌ This means requests will fall back to main Homebridge UI');
        showError('Custom UI server not loading. Check Homebridge logs for server initialization errors.');
    }
}

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
        $('#initialRefreshToken').val(response.refresh_token);
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

async function useManualToken() {
    console.log('🔑 Using manual refresh token');
    
    const manualToken = $('#manualRefreshToken').val().trim();
    
    if (!manualToken) {
        showError('Please enter a refresh token');
        return;
    }
    
    // Validate token format (basic check)
    if (manualToken.length < 10) {
        showError('Invalid refresh token format - tokens are usually much longer');
        return;
    }
    
    try {
        // Set the refresh token in the hidden field for saving
        $('#initialRefreshToken').val(manualToken);
        $('#tokenDisplay').text(manualToken.substring(0, 20) + '...');
        
        // Hide all OAuth steps and show success
        $('#step1, #step2, #step3').hide().removeClass('active');
        $('#step4').show().addClass('active complete');
        
        // Update the success message
        $('.success-message').html('<strong>Success!</strong> Your manual refresh token has been set.');
        
        console.log('✅ Manual token set successfully');
        hideError();
        
    } catch (error) {
        console.error('❌ Failed to set manual token:', error);
        showError(`Failed to set manual token: ${error.message || error}`);
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
        initialRefreshToken: $('#initialRefreshToken').val().trim(),
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
    
    if (!config.initialRefreshToken) {
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

async function loadCurrentConfig(retryCount = 0) {
    console.log(`📥 Loading current configuration (attempt ${retryCount + 1})`);
    
    try {
        const config = await makeRequest('/config', 'GET');
        
        if (Object.keys(config).length > 0) {
            console.log('📋 Config loaded successfully:', config);
            
            $('#name').val(config.name || 'Volvo EX30');
            $('#vin').val(config.vin || '');
            $('#clientId').val(config.clientId || '');
            $('#clientSecret').val(config.clientSecret || '');
            $('#vccApiKey').val(config.vccApiKey || '');
            $('#initialRefreshToken').val(config.initialRefreshToken || '');
            $('#region').val(config.region || 'eu');
            $('#pollingInterval').val(config.pollingInterval || 5);
            $('#enableBattery').prop('checked', config.enableBattery !== false);
            $('#enableClimate').prop('checked', config.enableClimate === true);
            $('#enableLocks').prop('checked', config.enableLocks === true);
            $('#enableDoors').prop('checked', config.enableDoors === true);
            
            if (config.initialRefreshToken) {
                $('#tokenDisplay').text(config.initialRefreshToken);
                $('#step1').removeClass('active').addClass('complete');
                $('#step2').removeClass('active').addClass('complete');
                $('#step3').removeClass('active').addClass('complete');
                $('#step4').show().addClass('complete');
            }
            
            console.log('✅ Configuration loaded and UI updated successfully');
        } else {
            console.log('📄 No existing configuration found');
            
            // Retry up to 3 times with increasing delay if no config found
            if (retryCount < 2) {
                const delay = (retryCount + 1) * 1000; // 1s, 2s delays
                console.log(`⏰ Retrying config load in ${delay}ms...`);
                setTimeout(() => loadCurrentConfig(retryCount + 1), delay);
                return;
            }
        }
        
    } catch (error) {
        console.error(`❌ Failed to load config (attempt ${retryCount + 1}):`, error);
        
        // Retry up to 3 times with increasing delay on error
        if (retryCount < 2) {
            const delay = (retryCount + 1) * 1500; // 1.5s, 3s delays
            console.log(`⏰ Retrying config load in ${delay}ms due to error...`);
            setTimeout(() => loadCurrentConfig(retryCount + 1), delay);
        } else {
            console.error('❌ Failed to load configuration after 3 attempts');
        }
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
            let responseText = '';
            
            try {
                responseText = await response.text();
                console.error(`❌ Error response (${response.status}):`, responseText);
                
                // Try to parse as JSON first
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorData.error || errorMessage;
            } catch (e) {
                // Response is not JSON - likely HTML from main Homebridge UI
                console.error('❌ Non-JSON error response (HTML fallback detected):', responseText.substring(0, 200) + '...');
                
                if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
                    errorMessage = 'Custom UI server not responding. Request falling back to main Homebridge UI. Check server logs.';
                } else {
                    errorMessage = `Server error: ${responseText.substring(0, 100)}`;
                }
            }
            throw new Error(errorMessage);
        }
        
        // Get response text first to debug JSON parsing issues
        const responseText = await response.text();
        console.log('📄 Raw response text:', responseText);
        
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('✅ Request successful:', result);
        } catch (parseError) {
            console.error('❌ JSON Parse Error:', parseError);
            console.error('❌ Raw response that failed to parse:', responseText);
            throw new Error(`Invalid JSON response: ${parseError.message}. Response: ${responseText.substring(0, 200)}`);
        }
        
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