# Homebridge Volvo EX30

A Homebridge plugin that integrates your Volvo EX30 with Apple HomeKit using the official Volvo APIs.

## Features

- **Battery Monitoring**: View battery level, charging status, and low battery alerts in HomeKit
- **Real-time Updates**: Automatically polls your vehicle for status updates
- **Rate Limiting**: Respects Volvo API rate limits (100 requests/minute)
- **Secure Authentication**: Uses OAuth2 with PKCE (Proof Key for Code Exchange) for enhanced security
- **Legacy API Support**: Compatible with both modern and legacy Volvo API endpoints
- **Flexible OAuth**: Supports custom redirect URIs including GitHub repository URLs

## Requirements

- Homebridge v1.6.0 or higher
- Node.js 18.0.0 or higher
- Volvo EX30 with connected services
- Volvo Developer Portal account

## Installation

1. Install the plugin through Homebridge Config UI X or manually:
```bash
npm install -g homebridge-volvo-ex30
```

2. Add the plugin to your Homebridge configuration (see Configuration section below)

## Setup

⚡ **NEW in v1.2.7**: **Enhanced Custom UI** - Now with PKCE security support and improved OAuth flow!

✨ **UPDATED in v1.1.0**: **Custom Configuration UI** - Complete setup directly in Homebridge Config UI X!

### Method 1: Custom Configuration UI (Recommended)

1. **Install the plugin** via Homebridge Config UI X or command line
2. **Go to Plugin Settings** in Homebridge Config UI X
3. **Click "Settings"** on the Volvo EX30 plugin
4. **Use the custom interface** to:
   - Enter your API credentials
   - **NEW**: Use the "Quick Postman Setup" section for manual token entry
   - OR complete OAuth authorization with automated one-click flow
   - Configure all settings visually
   - Save directly to Homebridge

The custom UI now offers **both automated OAuth AND manual token entry** - choose what works best for you!

**✅ Security Features in v1.2.7:**
- PKCE (Proof Key for Code Exchange) support for enhanced security
- Input validation for API credentials  
- Better error handling with specific OAuth guidance
- Consistent OAuth implementation across all setup methods

### Method 2: Manual Setup

### 1. Volvo Developer Portal Setup

1. Go to [Volvo Developer Portal](https://developer.volvocars.com)
2. Create an account and sign in
3. Create a new application:
   - **Name**: Choose any name (e.g., "Homebridge EX30")  
   - **Description**: "Homebridge integration for EX30"
   - **Redirect URIs**: Add your desired redirect URI (e.g., `http://localhost:3000/callback` or your GitHub repository URL)
   - **Scopes**: Select the following scopes for full functionality:
     - `conve:fuel_status` - Battery and charging information
     - `conve:climatization_start_stop` - Climate control
     - `conve:unlock` / `conve:lock` / `conve:lock_status` - Door locks
     - `openid` - Authentication
     - `energy:state:read` / `energy:capability:read` - Energy data
     - `conve:battery_charge_level` - Battery level
     - `conve:diagnostics_engine_status` - Vehicle diagnostics
     - `conve:warnings` - Vehicle warnings
4. Note down your:
   - **Client ID**
   - **Client Secret** 
   - **VCC API Key** (Primary or Secondary)

### 2. OAuth Authentication

**For Raspberry Pi Users (Most Common Setup):**

1. **SSH into your Raspberry Pi**:
   ```bash
   ssh pi@your-raspberry-pi-ip
   ```

2. **Navigate to the plugin directory**:
   ```bash
   cd /usr/local/lib/node_modules/homebridge-volvo-ex30
   ```

3. **Run the OAuth setup**:
   ```bash
   npm run oauth-setup
   ```

4. **Follow the interactive prompts**:
   - Enter your **Client ID** from Volvo Developer Portal
   - Enter your **Client Secret** from Volvo Developer Portal  
   - Enter your **region** (`eu` for Europe/Middle East/Africa, `na` for North America/Latin America)
   - Enter your **Redirect URI** (default: `http://localhost:3000/callback`, or your custom URI from the developer portal)

5. **Complete browser authorization**:
   - The setup will display an authorization URL
   - **Copy this URL** and open it in your browser (on your computer/phone)
   - **Sign in** with your Volvo ID account
   - **Authorize** the application
   - You'll be redirected to your configured redirect URI with a code parameter (e.g., `?code=ABC123&state=xyz`)
   - **Copy the `code` parameter** from the URL (e.g., `ABC123`)

6. **Enter the authorization code**:
   - Return to your SSH session
   - **Paste the authorization code** when prompted
   - The setup will exchange it for a refresh token

7. **Save the refresh token**:
   - The setup will display your refresh token
   - **Copy this token** - you'll need it for your Homebridge configuration

**For Other Installations:**

```bash
# Navigate to your plugin installation directory
cd /path/to/homebridge-volvo-ex30
npm run oauth-setup
```

⚠️ **Important**: Keep your refresh token secure and do not share it. It provides access to your vehicle data.

### Method 3: Manual Token Approach (Recommended for Personal Use)

🔑 **Quick Win for Personal Use**

Since this is for personal use with the test API access (10,000 calls/day - more than enough), the simplest approach is to get a refresh token manually using Postman.

**Option 1: Use Postman**

1. Download [Postman](https://www.postman.com/downloads/)
2. Create a new request
3. Go to **Authorization** tab
4. Select **OAuth 2.0**
5. Configure with these settings:
   - **Token Name**: `Volvo EX30`
   - **Grant Type**: `Authorization Code (With PKCE)`
   - **Callback URL**: `https://oauth.pstmn.io/v1/callback`
   - **Auth URL**: `https://volvoid.eu.volvocars.com/as/authorization.oauth2`
   - **Access Token URL**: `https://volvoid.eu.volvocars.com/as/token.oauth2`
   - **Client ID**: `dc-s68ezw2gmvo5nmrmfre3j4c28`
   - **Client Secret**: `AAZIK89F1JF1BKCiJ3yuaW`
   - **Scope**: `openid`
   - **State**: (leave empty)
   - **Client Authentication**: `Send as Basic Auth header`
6. Click **"Get New Access Token"**
7. Login with your Volvo ID
8. Copy the `refresh_token` from the response

**Option 2: Hard-code the Refresh Token**

Once you get the refresh token from Postman:
1. Copy the refresh token value
2. Add it directly to your Homebridge config (see Configuration section below)
3. The simplified plugin will handle token refresh automatically

💡 **Why this works**: The test API has generous limits (10,000 calls/day), manual token setup is perfectly fine for personal use, and you can always improve the OAuth flow later.

### 3. Configuration

Add the plugin to your Homebridge `config.json`:

```json
{
  "platforms": [
    {
      "platform": "VolvoEX30",
      "name": "My EX30",
      "vin": "YV1A2345678901234",
      "clientId": "your-client-id",
      "clientSecret": "your-client-secret",
      "vccApiKey": "your-vcc-api-key",
      "initialRefreshToken": "your-initial-refresh-token",
      "region": "eu",
      "pollingInterval": 5,
      "enableBattery": true,
      "enableClimate": false,
      "enableLocks": false,
      "enableDoors": false
    }
  ]
}
```

### Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `name` | Yes | - | Display name for your vehicle |
| `vin` | Yes | - | 17-character VIN of your EX30 |
| `clientId` | Yes | - | Client ID from Volvo Developer Portal |
| `clientSecret` | Yes | - | Client Secret from Volvo Developer Portal |
| `vccApiKey` | Yes | - | VCC API Key from Volvo Developer Portal |
| `initialRefreshToken` | No | - | Initial OAuth refresh token for first-time setup (plugin manages tokens automatically after initial setup) |
| `region` | No | `eu` | Your vehicle's region (`eu` or `na`) |
| `pollingInterval` | No | `5` | Update interval in minutes (1-60) |
| `enableBattery` | No | `true` | Show battery service |
| `enableClimate` | No | `true` | Show climate service (requires Connected Vehicle API) |
| `enableLocks` | No | `true` | Show lock service (requires Connected Vehicle API) |
| `enableDoors` | No | `true` | Show door sensors (requires Extended Vehicle API) |

## HomeKit Services

### Battery Service
- **Battery Level**: Current state of charge (0-100%)
- **Charging State**: Whether the vehicle is currently charging
- **Low Battery**: Alert when battery level is ≤20%

## API Usage and Rate Limits

This plugin respects Volvo's API rate limits:
- **100 requests per minute** per user per application
- **10 requests per minute** for invocation methods (future lock/unlock, climate control)

The plugin includes:
- Intelligent caching to minimize API calls
- Rate limiting protection  
- **Aggressive automatic token refresh** (v1.2.31+)
- Error handling and retry logic

### Token Management (v1.2.31+ → v1.2.35 COMPLETE SOLUTION)

**Volvo's Token Rotation System**: Volvo implements **automatic refresh token rotation** for security - each refresh creates a new token and invalidates the old one.

**Evolution of Token Handling:**
- **v1.2.32**: Fixed concurrent token refresh conflicts with serialization
- **v1.2.34**: Added persistent token storage for complete lifecycle management
- **v1.2.35**: Eliminated plugin conflicts with conflict-free JSON storage

**How the Plugin Handles This (v1.2.35+):**
- **Conflict-Free Storage**: Tokens saved to isolated JSON file `~/.homebridge/volvo-ex30-tokens.json`
- **Serialized Refresh**: All concurrent requests wait for single token refresh
- **Smart Recovery**: Uses stored tokens after restarts, falls back to config.json
- **7-Day Lifecycle**: Tokens rotate and persist properly for entire lifecycle
- **No Plugin Conflicts**: Simple file storage eliminates node-persist conflicts

**What You'll See in Logs:**
```
💾 Token storage file: /var/lib/homebridge/volvo-ex30-tokens.json
🔄 Token rotated by Volvo - storing new refresh token  
💾 Stored refresh token for VIN YV4EK3ZL... (oxSNqaNqP...)
✅ Successfully refreshed OAuth tokens
```

**Complete Solution:** After v1.2.35, tokens work continuously across restarts and updates without any manual intervention or plugin conflicts.

## Token Expiration and 7-Day Limit

### Understanding Volvo's 7-Day Token Expiration

**When Tokens Expire:**
- Refresh tokens expire after **7 days of inactivity** if not rotated
- This only happens when Homebridge is completely offline for 7+ consecutive days
- Normal operation keeps tokens fresh indefinitely through automatic rotation

**Normal Operation (No Expiration Issues):**
- ✅ **Daily Use**: Plugin polls every 5 minutes, tokens refresh regularly, never expires
- ✅ **Weekend Away**: No problem (well under 7 days)
- ✅ **Week Vacation**: Usually fine if system stays online
- ✅ **Regular Restarts**: Tokens persist and continue working

**When Re-authentication Is Needed:**
- ❌ **Extended Outage**: Homebridge offline for 7+ consecutive days
- ❌ **Long Vacation + Power Outage**: System down for over a week
- ❌ **Hardware Failure**: Extended system downtime

**What Happens After 7 Days:**
- Plugin will show "invalid refresh token" or "token expired" errors
- You'll need to generate a new initial refresh token using the same Postman method
- Add the new token to your config as `initialRefreshToken`
- Plugin will resume normal operation and manage tokens automatically

**This is Volvo's security policy** - there's no way to extend the 7-day limit. However, for most users with normally running Homebridge systems, this limitation never becomes an issue because regular API polling keeps tokens fresh through automatic rotation.

## Storage Migration Cleanup (v1.2.34 → v1.2.35+)

### **If Other Plugins Are Failing After v1.2.34**

**Problem**: v1.2.34 created a persist directory that breaks other plugins like `homebridge-gpio-electromagnetic-lock`

**Solution**: Clean up the old storage directory

#### **Automatic Cleanup (Recommended)**
```bash
# Navigate to plugin directory
cd /usr/local/lib/node_modules/homebridge-volvo-ex30
# Run cleanup script
./scripts/cleanup-old-storage.sh
```

#### **Manual Cleanup**
```bash
# Remove problematic directory
sudo rm -rf /var/lib/homebridge/persist/volvo-ex30

# Restart Homebridge
sudo systemctl restart homebridge
```

#### **What This Fixes**
- ✅ **Electromagnetic lock plugin** works normally
- ✅ **Other node-persist plugins** function correctly  
- ✅ **Volvo plugin** continues using new JSON storage
- ✅ **No token loss** - automatic migration from config.json

## Troubleshooting

### Configuration Field Update (v1.2.37+)

**If updating from v1.2.36 or earlier:**
- ✅ **Config field renamed**: `refreshToken` → `initialRefreshToken`
- ✅ **Before updating**: Change field name in your config.json manually
- ✅ **Keep same token value**: Just rename the field, don't change the token
- ✅ **Why the change**: Makes it clear this is for initial setup only

**Example config update:**
```json
// OLD (v1.2.36 and earlier)
"refreshToken": "your-token-here"

// NEW (v1.2.37+)  
"initialRefreshToken": "your-token-here"
```

### OAuth Setup Issues

**Error: "code_challenge is required"**
- This is a PKCE requirement from Volvo's OAuth server
- ✅ **Fixed in v1.2.7**: All OAuth methods now support PKCE
- Make sure you're using the latest version: `npm update -g homebridge-volvo-ex30`
- If still getting this error, try clearing browser cache and restart OAuth setup

**Error: "Missing initialRefreshToken in configuration"**
- This is expected on first setup
- Follow the step-by-step OAuth setup instructions above
- Make sure to add the initial refresh token to your Homebridge config after getting it

**Error: "No tokens available. Please complete OAuth flow first."**
- You're missing the `initialRefreshToken` field in your configuration
- Run `npm run oauth-setup` in the plugin directory
- Copy the initial refresh token to your Homebridge config

**OAuth setup command not found:**
```bash
# Make sure you're in the right directory
cd /usr/local/lib/node_modules/homebridge-volvo-ex30
# Or find your global npm modules
npm list -g --depth=0 | grep homebridge-volvo-ex30
```

**Browser authorization not working:**
- Make sure you copy the **entire URL** from the terminal
- Open it in any browser (computer, phone, tablet)
- The redirect URL will show an error page - that's normal
- Just copy the `code=` parameter from the URL bar

### Authentication Issues

1. **Invalid credentials**: Verify your Client ID, Client Secret, and VCC API Key
2. **Expired refresh token**: Run the OAuth setup again to get a new refresh token
3. **Region mismatch**: Ensure your region setting matches your vehicle's region

**Error: "OAuth token refresh failed" (FIXED in v1.2.32)**
- ✅ **Fixed in v1.2.30**: Improved token handling to use config values instead of cached tokens  
- ✅ **Fixed in v1.2.31**: Implemented aggressive proactive token refresh for Volvo's short-lived tokens
- ✅ **CRITICAL FIX in v1.2.32**: Serialized token refresh to prevent concurrent token exhaustion
- ✅ **Root Cause Solved**: Fixed multiple API calls invalidating each other's refresh tokens
- **Key Discovery**: Volvo rotates refresh tokens on every use - v1.2.32 handles this properly
- **Result**: Tokens should now work continuously for 7-day lifecycle without manual intervention

**Enhanced Token Storage System (v1.2.35+):**
- ✅ **Persistent token storage**: Refreshed tokens automatically saved to disk
- ✅ **Conflict-free storage**: Simple JSON file, no plugin conflicts
- ✅ **Survives restarts**: Stored tokens persist across Homebridge restarts
- ✅ **Survives updates**: Token storage survives plugin updates and system reboots
- ✅ **Smart fallback**: Uses stored token → config.json token → error
- ✅ **Storage location**: `~/.homebridge/volvo-ex30-tokens.json` (clean, isolated)
- ✅ **7-day lifecycle**: Tokens rotate properly with automatic persistence

**If you still see this error after v1.2.32:**
1. **Update immediately**: `npm update -g homebridge-volvo-ex30`  
2. **Get ONE fresh token** using Postman or OAuth script
3. **Restart Homebridge** and monitor for serialization logs
4. **Wait 24 hours** for proper token rotation to establish

**If updating from v1.2.34 and other plugins are failing:**
1. **Update to v1.2.35+**: `npm update -g homebridge-volvo-ex30`
2. **Clean up old storage**: Run cleanup script to remove problematic directory
3. **Restart Homebridge**: All plugins should work normally

### HomeKit Display Issues

**Device shows as "Not Supported" with house icon (Fixed in v1.2.30, Enhanced in v1.2.37+)**
- ✅ **Fixed in v1.2.30**: Set proper accessory category and primary service configuration
- ✅ **Enhanced in v1.2.33**: Fixed cached accessory category for existing installations  
- ✅ **Enhanced in v1.2.37+**: Force battery service recognition with initial values
- **What you should see**: Battery icon with charging state and percentage

**If still showing house icon after v1.2.37:**
1. **Update to latest version**: `npm update -g homebridge-volvo-ex30`
2. **Restart Homebridge**: `sudo systemctl restart homebridge`
3. **Clear HomeKit cache (if needed)**:
   - In Home app: Remove EX30 accessory completely
   - Restart Homebridge - accessory will be rediscovered with proper battery icon
4. **Check logs**: Look for "🔋 Battery service configured as primary service" message

### API Errors

1. **Rate limit exceeded**: Increase polling interval or reduce API calls
2. **Vehicle not supported**: Ensure your EX30 has connected services enabled
3. **Network issues**: Check your internet connection and Homebridge logs

### Debug Logging

Enable debug logging in Homebridge to see detailed API calls:

```json
{
  "platforms": [
    {
      "platform": "VolvoEX30",
      "name": "My EX30",
      "_bridge": {
        "debugMode": true
      }
    }
  ]
}
```

## Development

### Building from Source

```bash
git clone https://github.com/yourusername/homebridge-volvo-ex30
cd homebridge-volvo-ex30
npm install
npm run build
```

### Scripts

- `npm run build` - Compile TypeScript
- `npm run watch` - Watch for changes and recompile
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint
- `npm run oauth-setup` - Run OAuth setup helper

## Supported Regions

- **Europe/Middle East/Africa**: `eu`
- **North America/Latin America**: `na`

## Privacy and Security

- All API communication uses HTTPS
- OAuth2 tokens are stored securely in Homebridge
- No vehicle data is transmitted to third parties
- API keys and tokens are only used for Volvo API communication

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This plugin is not affiliated with, endorsed by, or sponsored by Volvo Car Corporation. Volvo and EX30 are trademarks of Volvo Car Corporation.

Use at your own risk. The authors are not responsible for any damage or issues that may arise from using this plugin.