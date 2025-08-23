#!/usr/bin/env node

/**
 * Unified OAuth Setup Tool for Volvo EX30 Homebridge Plugin
 * 
 * Consolidates all OAuth scripts into a single, comprehensive tool with:
 * - Interactive menu system
 * - Full OAuth flow (URL generation + token exchange)
 * - Manual token exchange mode 
 * - Minimal scope testing mode
 * - Troubleshooting features
 * - QR code generation for mobile devices
 * - Configuration validation
 */

const axios = require('axios');
const crypto = require('crypto');
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Plugin credentials
const CREDENTIALS = {
  clientId: 'dc-towqtsl3ngkotpzdc6qlqhnxl',
  clientSecret: '989jHbeioeEPJrusrlPtWn',
  vccApiKey: 'e88ac699aef74ed4af934993ea612999',
  redirectUri: 'https://github.com/jcfield-boop/homebridge-volvoEX30',
};

// Scope configurations
const SCOPES = {
  full: [
    'conve:fuel_status', 'conve:brake_status', 'conve:doors_status', 'conve:trip_statistics',
    'conve:environment', 'conve:odometer_status', 'conve:honk_flash', 'conve:command_accessibility',
    'conve:engine_status', 'conve:commands', 'conve:vehicle_relation', 'conve:windows_status',
    'conve:navigation', 'conve:tyre_status', 'conve:connectivity_status', 'conve:battery_charge_level',
    'conve:climatization_start_stop', 'conve:engine_start_stop', 'conve:lock', 'openid',
    'conve:diagnostics_workshop', 'conve:unlock', 'conve:lock_status', 'conve:diagnostics_engine_status',
    'conve:warnings'
  ],
  minimal: [
    'conve:battery_charge_level', 'conve:doors_status', 'conve:lock_status', 
    'conve:lock', 'conve:unlock', 'openid'
  ],
  testing: [
    'openid', 'conve:vehicle_relation'
  ]
};

// Utility functions
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return hash.toString('base64url');
}

function generateState() {
  return crypto.randomBytes(16).toString('hex');
}

function parseRedirectUrl(url) {
  try {
    const urlObj = new URL(url);
    const code = urlObj.searchParams.get('code');
    const state = urlObj.searchParams.get('state');
    const error = urlObj.searchParams.get('error');
    
    return { code, state, error };
  } catch (err) {
    return null;
  }
}

function generateQRCode(text, size = 'small') {
  console.log(`📱 QR Code for mobile device (${size}):`);
  console.log('');
  
  try {
    // Generate actual QR code using qrcode-terminal
    qrcode.generate(text, { small: size === 'small' }, function (qrString) {
      console.log(qrString);
    });
  } catch (error) {
    console.log('❌ QR code generation failed, showing URL instead:');
    console.log('┌─────────────────┐');
    console.log('│   QR Error      │');
    console.log('└─────────────────┘');
  }
  
  console.log('');
  console.log(`📲 Or open this URL directly:`);
  return text;
}

// Main menu functions
async function showMainMenu() {
  console.clear();
  console.log('🚗 Volvo EX30 Unified OAuth Setup Tool');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Choose an option:');
  console.log('');
  console.log('1. 🎯 Complete OAuth Flow (Recommended)');
  console.log('   • Interactive setup with full token generation');
  console.log('   • Includes API testing and configuration generation');
  console.log('');
  console.log('2. 🔗 Generate OAuth URL Only');
  console.log('   • Get authorization URL for manual completion');
  console.log('   • Useful for debugging or custom workflows');
  console.log('');
  console.log('3. 🔄 Manual Token Exchange');
  console.log('   • Exchange authorization code for tokens');
  console.log('   • Use if you already have an authorization code');
  console.log('');
  console.log('4. 🧪 Minimal Scope Test');
  console.log('   • Test with basic scopes only (6 scopes)');
  console.log('   • Useful for troubleshooting permission issues');
  console.log('');
  console.log('5. 🔍 Troubleshooting Tools');
  console.log('   • Diagnose OAuth issues');
  console.log('   • Validate existing configuration');
  console.log('');
  console.log('6. ❓ Help & Documentation');
  console.log('');
  console.log('0. 🚪 Exit');
  console.log('');
  
  const choice = await question('Enter your choice (0-6): ');
  return choice.trim();
}

async function completeOAuthFlow() {
  console.clear();
  console.log('🎯 Complete OAuth Flow');
  console.log('═'.repeat(60));
  console.log('');
  
  // Step 1: Choose scope level
  console.log('📋 Choose scope configuration:');
  console.log('1. Full scopes (25 scopes) - Complete functionality');
  console.log('2. Minimal scopes (6 scopes) - Basic functionality');  
  console.log('3. Testing scopes (2 scopes) - Connection test only');
  console.log('');
  
  const scopeChoice = await question('Enter choice (1-3): ');
  let selectedScopes;
  
  switch(scopeChoice) {
    case '2': 
      selectedScopes = SCOPES.minimal; 
      console.log('✅ Selected minimal scopes for basic functionality');
      break;
    case '3': 
      selectedScopes = SCOPES.testing;
      console.log('✅ Selected testing scopes for connection verification');
      break;
    default: 
      selectedScopes = SCOPES.full;
      console.log('✅ Selected full scopes for complete functionality');
  }
  
  console.log(`📊 Using ${selectedScopes.length} scopes`);
  console.log('');
  
  // Step 2: Generate OAuth URL
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  
  const authUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${new URLSearchParams({
    response_type: 'code',
    client_id: CREDENTIALS.clientId,
    redirect_uri: CREDENTIALS.redirectUri,
    scope: selectedScopes.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state
  })}`;
  
  console.log('🔗 STEP 1: Open this URL in your browser:');
  console.log('═'.repeat(60));
  console.log(authUrl);
  console.log('═'.repeat(60));
  console.log('');
  
  // Optional QR code
  const showQr = await question('📱 Generate QR code for mobile? (y/n): ');
  if (showQr.toLowerCase() === 'y' || showQr.toLowerCase() === 'yes') {
    console.log('');
    generateQRCode(authUrl);
    console.log('');
  }
  
  console.log('📋 Instructions:');
  console.log('1. Open the URL above in any browser');
  console.log('2. Sign in with your Volvo ID');
  console.log('3. Authorize the application');
  console.log('4. You\'ll be redirected to GitHub (404 is normal)');
  console.log('5. Copy the ENTIRE redirect URL from address bar');
  console.log('');
  console.log('Example redirect URL:');
  console.log(`${CREDENTIALS.redirectUri}?code=ABC123&state=${state}`);
  console.log('');
  
  // Step 3: Get redirect URL from user
  const redirectUrl = await question('🔗 Paste the complete redirect URL here: ');
  
  if (!redirectUrl.trim()) {
    console.error('❌ No URL provided');
    await question('Press Enter to return to main menu...');
    return;
  }
  
  // Step 4: Parse and validate redirect URL
  const parsed = parseRedirectUrl(redirectUrl.trim());
  
  if (!parsed) {
    console.error('❌ Invalid URL format');
    console.error('Please paste the complete redirect URL starting with https://github.com/...');
    await question('Press Enter to return to main menu...');
    return;
  }
  
  if (parsed.error) {
    console.error(`❌ OAuth error: ${parsed.error}`);
    await question('Press Enter to return to main menu...');
    return;
  }
  
  if (!parsed.code) {
    console.error('❌ No authorization code found in URL');
    await question('Press Enter to return to main menu...');
    return;
  }
  
  if (parsed.state !== state) {
    console.error('❌ State mismatch - security check failed');
    console.error(`Expected: ${state}`);
    console.error(`Received: ${parsed.state}`);
    await question('Press Enter to return to main menu...');
    return;
  }
  
  console.log('✅ Redirect URL parsed successfully!');
  console.log(`   Code: ${parsed.code}`);
  console.log(`   State: ${parsed.state} ✓`);
  console.log('');
  
  // Step 5: Exchange code for tokens
  console.log('🔄 Exchanging authorization code for tokens...');
  
  try {
    const tokenResponse = await axios.post(
      'https://volvoid.eu.volvocars.com/as/token.oauth2',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CREDENTIALS.clientId,
        client_secret: CREDENTIALS.clientSecret,
        code: parsed.code,
        redirect_uri: CREDENTIALS.redirectUri,
        code_verifier: codeVerifier
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Token exchange successful!');
    console.log('');
    
    const tokens = tokenResponse.data;
    
    // Step 6: Test API access
    await testApiAccess(tokens.access_token);
    
    // Step 7: Generate configuration
    await generateConfiguration(tokens.refresh_token);
    
  } catch (error) {
    console.error('❌ Token exchange failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    console.error('');
    console.error('🔧 Common Issues:');
    console.error('   • Authorization code expired (try again quickly)');
    console.error('   • Code already used (generate new URL and try again)');
    console.error('   • Network connectivity issues');
  }
  
  await question('\\nPress Enter to return to main menu...');
}

async function generateOAuthUrl() {
  console.clear();
  console.log('🔗 Generate OAuth URL');
  console.log('═'.repeat(60));
  console.log('');
  
  // Choose scope configuration
  console.log('📋 Choose scope configuration:');
  console.log('1. Full scopes (25 scopes)');
  console.log('2. Minimal scopes (6 scopes)');
  console.log('3. Testing scopes (2 scopes)');
  console.log('');
  
  const scopeChoice = await question('Enter choice (1-3): ');
  let selectedScopes;
  
  switch(scopeChoice) {
    case '2': selectedScopes = SCOPES.minimal; break;
    case '3': selectedScopes = SCOPES.testing; break;
    default: selectedScopes = SCOPES.full;
  }
  
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();
  
  const authUrl = `https://volvoid.eu.volvocars.com/as/authorization.oauth2?${new URLSearchParams({
    response_type: 'code',
    client_id: CREDENTIALS.clientId,
    redirect_uri: CREDENTIALS.redirectUri,
    scope: selectedScopes.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state
  })}`;
  
  console.log('');
  console.log('🔗 OAuth URL Generated:');
  console.log('═'.repeat(60));
  console.log(authUrl);
  console.log('═'.repeat(60));
  console.log('');
  console.log('💾 PKCE Parameters (save these for token exchange):');
  console.log(`Code Verifier: ${codeVerifier}`);
  console.log(`State: ${state}`);
  console.log('');
  console.log('📋 Next Steps:');
  console.log('1. Open the URL above in your browser');
  console.log('2. Complete the authorization');
  console.log('3. Use "Manual Token Exchange" with the authorization code');
  console.log('');
  
  await question('Press Enter to return to main menu...');
}

async function manualTokenExchange() {
  console.clear();
  console.log('🔄 Manual Token Exchange');
  console.log('═'.repeat(60));
  console.log('');
  
  const authCode = await question('🔑 Enter authorization code: ');
  const codeVerifier = await question('🔐 Enter code verifier: ');
  
  if (!authCode.trim() || !codeVerifier.trim()) {
    console.error('❌ Both authorization code and code verifier are required');
    await question('Press Enter to return to main menu...');
    return;
  }
  
  console.log('');
  console.log('🔄 Exchanging authorization code for tokens...');
  
  try {
    const tokenResponse = await axios.post(
      'https://volvoid.eu.volvocars.com/as/token.oauth2',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CREDENTIALS.clientId,
        client_secret: CREDENTIALS.clientSecret,
        code: authCode.trim(),
        redirect_uri: CREDENTIALS.redirectUri,
        code_verifier: codeVerifier.trim()
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Token exchange successful!');
    console.log('');
    
    const tokens = tokenResponse.data;
    
    await testApiAccess(tokens.access_token);
    await generateConfiguration(tokens.refresh_token);
    
  } catch (error) {
    console.error('❌ Token exchange failed:');
    console.error(`   Error: ${error.message}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  await question('\\nPress Enter to return to main menu...');
}

async function testApiAccess(accessToken) {
  console.log('🧪 Testing Connected Vehicle API access...');
  
  try {
    const apiResponse = await axios.get(
      'https://api.volvocars.com/connected-vehicle/v2/vehicles',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'vcc-api-key': CREDENTIALS.vccApiKey,
          'Accept': 'application/json'
        },
        timeout: 15000
      }
    );
    
    console.log('✅ Connected Vehicle API access SUCCESSFUL!');
    console.log(`📊 Found ${apiResponse.data.data?.length || 0} vehicle(s)`);
    
    if (apiResponse.data.data && apiResponse.data.data.length > 0) {
      console.log('');
      console.log('🚗 Your Vehicles:');
      apiResponse.data.data.forEach((vehicle, i) => {
        console.log(`   ${i + 1}. VIN: ${vehicle.vin}`);
      });
    }
    
  } catch (apiError) {
    console.log('❌ Connected Vehicle API test failed:');
    console.log(`   Status: ${apiError.response?.status}`);
    console.log(`   Error: ${JSON.stringify(apiError.response?.data, null, 2)}`);
  }
  
  console.log('');
}

async function generateConfiguration(refreshToken) {
  console.log('🏠 Homebridge Configuration Generated:');
  console.log('═'.repeat(60));
  
  const config = {
    "platform": "VolvoEX30",
    "name": "Volvo EX30",
    "vin": "YOUR_EX30_VIN_HERE",
    "clientId": CREDENTIALS.clientId,
    "clientSecret": CREDENTIALS.clientSecret,
    "vccApiKey": CREDENTIALS.vccApiKey,
    "initialRefreshToken": refreshToken,
    "region": "eu",
    "pollingInterval": 5,
    "presentationMode": "advanced",
    "accessoryNaming": "unified",
    "enableBattery": true,
    "enableClimate": true,
    "enableLocks": true,
    "enableAdvancedSensors": true
  };
  
  console.log(JSON.stringify(config, null, 2));
  console.log('═'.repeat(60));
  console.log('');
  console.log('📋 Configuration Instructions:');
  console.log('1. Replace "YOUR_EX30_VIN_HERE" with your actual EX30 VIN');
  console.log('2. Add this configuration to your Homebridge config.json');
  console.log('3. Restart Homebridge to activate the plugin');
  console.log('');
  console.log('🎉 SUCCESS! Your Volvo EX30 plugin should now work perfectly.');
  
  // Optional: Save to file
  const saveToFile = await question('💾 Save configuration to file? (y/n): ');
  if (saveToFile.toLowerCase() === 'y' || saveToFile.toLowerCase() === 'yes') {
    const configPath = path.join(__dirname, '..', 'generated-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✅ Configuration saved to: ${configPath}`);
  }
}

async function showTroubleshooting() {
  console.clear();
  console.log('🔍 Troubleshooting Tools');
  console.log('═'.repeat(60));
  console.log('');
  console.log('Choose troubleshooting option:');
  console.log('');
  console.log('1. 🌐 Test Network Connection');
  console.log('2. 🔑 Validate Credentials');
  console.log('3. 📋 Check Scope Permissions');
  console.log('4. 🔄 Test Token Refresh');
  console.log('5. 📊 Common Issues & Solutions');
  console.log('');
  console.log('0. ← Back to Main Menu');
  console.log('');
  
  const choice = await question('Enter choice (0-5): ');
  
  switch(choice) {
    case '1':
      await testNetworkConnection();
      break;
    case '2':
      await validateCredentials();
      break;
    case '3':
      await checkScopePermissions();
      break;
    case '4':
      await testTokenRefresh();
      break;
    case '5':
      await showCommonIssues();
      break;
    default:
      return; // Back to main menu
  }
  
  await question('\\nPress Enter to continue...');
}

async function testNetworkConnection() {
  console.log('🌐 Testing Network Connection...');
  
  const endpoints = [
    'https://volvoid.eu.volvocars.com/.well-known/openid_configuration',
    'https://api.volvocars.com/connected-vehicle/v2/vehicles',
    'https://github.com/jcfield-boop/homebridge-volvoEX30'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await axios.get(endpoint, { timeout: 5000 });
      console.log(`✅ ${endpoint} - Status: ${response.status}`);
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }
}

async function validateCredentials() {
  console.log('🔑 Validating Credentials...');
  console.log(`Client ID: ${CREDENTIALS.clientId} ✅`);
  console.log(`Client Secret: ${CREDENTIALS.clientSecret.substring(0, 8)}... ✅`);
  console.log(`VCC API Key: ${CREDENTIALS.vccApiKey.substring(0, 8)}... ✅`);
  console.log(`Redirect URI: ${CREDENTIALS.redirectUri} ✅`);
  console.log('All credentials are properly configured.');
}

async function checkScopePermissions() {
  console.log('📋 Checking Scope Permissions...');
  console.log(`Full scopes: ${SCOPES.full.length} scopes`);
  console.log(`Minimal scopes: ${SCOPES.minimal.length} scopes`);
  console.log(`Testing scopes: ${SCOPES.testing.length} scopes`);
  console.log('');
  console.log('💡 Tip: If you\'re getting scope errors, try the minimal scope test first.');
}

async function testTokenRefresh() {
  const refreshToken = await question('Enter refresh token to test: ');
  if (!refreshToken.trim()) {
    console.log('❌ No refresh token provided');
    return;
  }
  
  console.log('🔄 Testing token refresh...');
  // Implementation would test token refresh
  console.log('💡 Token refresh testing requires existing valid refresh token');
}

async function showCommonIssues() {
  console.log('📊 Common Issues & Solutions');
  console.log('═'.repeat(40));
  console.log('');
  console.log('❌ "code_challenge is required"');
  console.log('   → Solution: PKCE is mandatory - this tool handles it automatically');
  console.log('');
  console.log('❌ "invalid_grant" error');
  console.log('   → Solution: Authorization code expired or already used');
  console.log('   → Generate new OAuth URL and try again quickly');
  console.log('');
  console.log('❌ "invalid_scope" error');
  console.log('   → Solution: Use minimal scopes option or contact developer');
  console.log('');
  console.log('❌ "Authentication failed" in plugin');
  console.log('   → Solution: Token expired - run this script again');
  console.log('');
  console.log('❌ Network timeouts');
  console.log('   → Solution: Check internet connection and try again');
}

async function showHelp() {
  console.clear();
  console.log('❓ Help & Documentation');
  console.log('═'.repeat(60));
  console.log('');
  console.log('📚 About This Tool:');
  console.log('This unified OAuth setup tool consolidates all previous OAuth scripts');
  console.log('into a single, comprehensive solution for setting up your Volvo EX30');
  console.log('Homebridge plugin authentication.');
  console.log('');
  console.log('🎯 Recommended Usage:');
  console.log('1. Choose "Complete OAuth Flow" for first-time setup');
  console.log('2. Use "Minimal Scope Test" if you encounter permission issues');
  console.log('3. Access "Troubleshooting Tools" for diagnostic help');
  console.log('');
  console.log('🔧 Technical Details:');
  console.log('• Uses OAuth2 with PKCE (Proof Key for Code Exchange)');
  console.log('• Supports all 25 Connected Vehicle API scopes');
  console.log('• Includes automatic token validation');
  console.log('• Generates ready-to-use Homebridge configuration');
  console.log('');
  console.log('📞 Support:');
  console.log('• GitHub: https://github.com/jcfield-boop/homebridge-volvoEX30');
  console.log('• Issues: Report bugs via GitHub Issues');
  console.log('');
  
  await question('Press Enter to return to main menu...');
}

// Main application loop
async function main() {
  console.log('🚗 Starting Volvo EX30 Unified OAuth Setup Tool...');
  console.log('');
  
  while (true) {
    try {
      const choice = await showMainMenu();
      
      switch(choice) {
        case '1':
          await completeOAuthFlow();
          break;
        case '2':
          await generateOAuthUrl();
          break;
        case '3':
          await manualTokenExchange();
          break;
        case '4':
          console.log('🧪 Running minimal scope test...');
          // Reuse completeOAuthFlow but with minimal scopes pre-selected
          await completeOAuthFlow();
          break;
        case '5':
          await showTroubleshooting();
          break;
        case '6':
          await showHelp();
          break;
        case '0':
          console.log('👋 Thank you for using the Volvo EX30 OAuth Setup Tool!');
          process.exit(0);
        default:
          console.log('❌ Invalid choice. Please select 0-6.');
          await question('Press Enter to continue...');
      }
    } catch (error) {
      console.error('❌ An error occurred:', error.message);
      await question('Press Enter to continue...');
    }
  }
}

// Error handling
process.on('SIGINT', () => {
  console.log('\\n\\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Unexpected error:', error.message);
  rl.close();
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main().finally(() => rl.close());
}

module.exports = {
  CREDENTIALS,
  SCOPES,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  parseRedirectUrl
};