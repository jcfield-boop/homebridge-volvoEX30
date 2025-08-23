# Homebridge Volvo EX30

A comprehensive Homebridge plugin that integrates your Volvo EX30 with Apple HomeKit using the official Volvo Connected Vehicle API v2. Monitor battery status, control locks and climate, track doors and windows, and access vehicle diagnostics - all from the Home app.

## 🚀 v3.0.0 - MAJOR RELEASE - Enhanced Vehicle Monitoring & Command Polling

**MAJOR VERSION RELEASE!** This transformative update introduces real-time command status polling, advanced HomeKit services (Motion, Occupancy, Security), and a unified OAuth setup experience with functional QR codes.

### 🆕 **NEW: Command Status Polling System**
- **Real-Time Command Feedback**: Instant status updates for lock/unlock, climate control, and honk/flash commands
- **Smart Retry Logic**: Configurable timeout and retry handling for robust command execution
- **Command Queue Management**: Handle multiple concurrent commands with individual polling strategies
- **Enhanced User Experience**: Know immediately when commands succeed, fail, or timeout

### 🏠 **NEW: Enhanced HomeKit Services**
- **Motion Sensor**: Detects vehicle activity (door states, engine status, movement indicators)
- **Occupancy Sensor**: Intelligent occupancy detection using engine status and door activity
- **Security System**: Comprehensive vehicle security with lock status integration
- **Leak Sensor**: Monitors fluid warnings (washer fluid, coolant, oil, brake fluid)
- **Smoke Sensor**: Critical warning monitor for service alerts and multiple warnings

### ✨ **NEW: Unified OAuth Setup Tool**
- **Single OAuth Script**: Consolidated 4 scripts into one comprehensive tool (`npm run oauth`)
- **Interactive Menu**: 6 setup options including complete flow, troubleshooting, and help
- **Functional QR Codes**: Real QR codes for mobile OAuth setup (not placeholder ASCII art!)
- **Enhanced Error Handling**: Better messages, scope validation, and configuration generation

### 🔧 **Enhanced: Code Quality & TypeScript**
- **Eliminated All 'any' Types**: Strict TypeScript with proper interfaces (`OAuthError`, `TokenStorageInfo`)
- **Enhanced ESLint Rules**: Security and code quality improvements
- **Jest Testing Framework**: Complete testing infrastructure setup
- **Fixed Missing Enum Values**: Added `HONK_AND_FLASH` and proper interface extensions

### ⚠️ **BREAKING CHANGES**
- **Removed Deprecated OAuth Scripts**: Only `volvo-oauth.js` remains (old scripts deleted)
- **Enhanced HomeKit Services**: May require HomeKit database reset for full functionality
- **Updated OAuth Flow**: All setup now uses unified tool

**Upgrade**: `npm install -g homebridge-volvo-ex30@3.0.0` + restart Homebridge

**Result**: Professional-grade vehicle integration with real-time command feedback and comprehensive monitoring! 🚗🔄🏠

---

## 🚗 v2.3.14 - Command API Fixes & OAuth Spam Elimination

**DUAL CRITICAL FIXES!** This release fixes both OAuth spam issues and command API failures by implementing correct API endpoints and comprehensive command validation.

### 🔧 **Command API Fixes (v2.3.14)**
- **Fixed Honk/Flash 404 Error**: Corrected endpoint from `/commands/honk-flash` to `/commands/honk-and-flash`
- **Enhanced Command Validation**: Added vehicle-specific command availability checking before execution
- **Better Error Messages**: Clear feedback when commands aren't supported by specific vehicles
- **API Specification Compliance**: Updated to match official Connected Vehicle API v2 specification

### ✅ **OAuth Spam Elimination (v2.3.13)**

### ✅ **Zero OAuth Spam - Finally Fixed**
- **🔇 All OAuth Spam Eliminated** - Completely removed multiple "Token access already in progress" messages during startup
- **📡 Single Data Fetch** - Platform now fetches data once for all accessories instead of per-accessory fetching
- **🏗️ True Shared Polling** - Accessories no longer make individual API calls during setup
- **⚡ Faster Startup** - Single API call instead of multiple concurrent calls
- **🛡️ Improved Stability** - Eliminates race conditions during accessory setup

### 🔧 **Architecture Improvements**
- **Platform-Level Control** - Added single initial data fetch in `didFinishLaunching` callback
- **Fixed Callback System** - Eliminated duplicate `registerDataUpdateCallback()` calls that caused concurrent requests
- **Centralized Fetching** - Moved initial data fetch to platform level after device discovery
- **Better TypeScript Types** - Added proper type safety for callback management

### 🚀 **Performance & Reliability**
- **Lower Rate Limits** - Dramatic reduction in OAuth endpoint usage
- **Clean Startup Logs** - No more repetitive OAuth messages
- **Reduced API Calls** - True shared architecture prevents unnecessary API requests
- **Improved Token Management** - Enhanced token caching with 30-second expiry buffer

### 🔄 **Previous OAuth Improvements (v2.3.12)**
- **Enhanced Token Caching** - Tokens cached and reused for full 5-minute lifetime
- **Better Token Validation** - Only refresh when actually expired or expiring within 30 seconds
- **Improved Debug Logging** - Added "Reusing valid token" messages

**Upgrade**: `npm install -g homebridge-volvo-ex30@2.3.14` + restart Homebridge

**Result**: Fixed command errors + zero OAuth spam + true shared polling! 🚗💨🔧

---

## 🎯 v2.3.5 - Complete OAuth Spam & Climate Control Fix

**FINAL SOLUTION!** This release completely eliminates OAuth spam and fixes climate control command failures.

### ✅ **OAuth Spam Completely Eliminated**
- **🔇 Zero OAuth Spam** - Eliminated ALL individual API calls during accessory setup
- **📡 Single Data Fetch** - Platform makes exactly ONE API call during startup
- **🏎️ True Shared Architecture** - All accessories read from shared cache, never make API calls
- **🚀 Clean Startup** - No more repetitive log messages or token access conflicts

### 🌡️ **Climate Control Commands Fixed**
- **🔧 Proper UUID Format** - Fixed API operation IDs to use RFC 4122 UUIDs
- **✅ No More 422 Errors** - Resolved "Invalid UUID" errors from Volvo API
- **🎛️ All Commands Work** - Lock/unlock, climate control, and honk/flash fully functional

### 🛠️ **Technical Improvements**
- **Accessory Setup** - Removed individual `performInitialDataFetch()` calls
- **Data Access** - Modified `getUnifiedVehicleData()` to use shared data only
- **UUID Generation** - Replaced custom IDs with `crypto.randomUUID()`
- **Architecture** - True shared polling with zero concurrent API requests

**Upgrade**: `npm install -g homebridge-volvo-ex30@2.3.5` + restart Homebridge

**Result**: Perfect startup experience + fully working climate control! 🚗💨

---

## 🧠 v2.3.2 - Smart Token Management

**COMPLETE OAUTH SOLUTION!** This release introduces intelligent token management that finally solves all OAuth rotation and persistence issues.

### ✨ **Smart Token Intelligence**
- **🔍 Version Tracking** - Plugin tracks version changes for intelligent token migration
- **🎯 Smart Priority** - Always prefers stored rotated tokens over potentially stale config tokens
- **🔒 Config Protection** - Marks config tokens as used after rotation to prevent reuse
- **📦 Major Version Detection** - Only clears tokens on major version changes (2.3.x → 2.4.x)

### 🛠️ **Fixed Forever**
- ❌ **"Expired after 3 minutes"** - Config tokens no longer reused after rotation
- ❌ **OAuth spam at startup** - Shared polling eliminates concurrent token access
- ❌ **Token persistence failures** - Intelligent priority system handles all scenarios
- ❌ **Update token issues** - Version-aware cleanup only when necessary

### 🎉 **What You Get**
- **Zero Manual Token Management** - Plugin handles everything intelligently
- **Clean Startup Logs** - No more 50+ OAuth spam messages
- **Persistent Tokens** - Work across restarts, updates, and version changes
- **Smart Error Messages** - Clear guidance when manual intervention needed

---

## 🧹 v2.3.0 - Simplified Plugin (Fresh Token Strategy)

**MAJOR SIMPLIFICATION!** Custom UI server removed - now using reliable script-based token generation that works with Volvo's aggressive security rotation.

### 🗑️ **Removed Complexity**
- **Custom UI Server** - Eliminated entire homebridge-ui/ directory and OAuth server
- **20+ Debug Scripts** - Kept only 3 essential OAuth scripts for clean package
- **Complex Persistence** - Embraced Volvo's token rotation with simple regeneration

### ⚡ **Fresh Token Strategy**
```bash
cd /usr/local/lib/node_modules/homebridge-volvo-ex30
npm run oauth
# Follow prompts → Copy token → Update config → Restart
```

**Why This Works Better**: Volvo's aggressive token rotation makes fresh generation more reliable than complex persistence attempts.

---

## 🎯 v2.2.0+ - Individual Accessory Naming & Enhanced Services

**MAJOR HOMEKIT UPGRADE!** No more confusing "Volvo EX30" tiles everywhere! This release introduces individual named accessories with enhanced service types for professional HomeKit organization.

### 🏠 **Individual Named Accessories (NEW)**
- **"EX30 Battery"** - WindowCovering service (battery % as blind position) 🔋
- **"EX30 Lock"** - LockManagement service (proper security system) 🔒  
- **"EX30 Climate"** - Thermostat service (full temperature control) 🌡️
- **"EX30 Locate"** - Switch service (momentary honk & flash) 📍

### ✨ **Enhanced Service Types**
- **Battery**: WindowCovering (73% battery = 73% blind closed - much more visual!)
- **Climate**: Full Thermostat with temperature setting (15-25°C) + on/off control
- **Lock**: Proper LockManagement with SECURITY_SYSTEM category
- **Locate**: Momentary switch with auto-reset after activation

### ⚙️ **Configuration Control**
```json
{
  "accessoryNaming": "individual"  // "individual" (default) or "unified" (legacy)
}
```

**Upgrade**: `npm install -g homebridge-volvo-ex30@2.2.1` + restart Homebridge

## 🚨 v2.1.6 - TRUE OAuth Spam Elimination

**CRITICAL UPDATE REQUIRED!** This release provides the TRUE solution to OAuth spam by preventing concurrent HTTP requests entirely.

### 🐛 **Root Cause Finally Solved**
- **Token Pre-validation**: Added validation BEFORE Promise.allSettled() to prevent 14 concurrent HTTP requests
- **Architectural Fix**: Eliminates race condition by preventing concurrent requests when tokens are invalid
- **Timing Issue Resolved**: Previous versions checked flags AFTER requests started - v2.1.4 validates BEFORE
- **Zero Concurrent Failures**: Invalid tokens never reach HTTP layer, preventing all OAuth spam
- **Service Conflicts Fixed**: Resolved UUID conflicts in service setup

**Upgrade immediately**: `npm install -g homebridge-volvo-ex30@2.1.4`

## 🎯 v2.1.0 - Simplified Presentation & Enhanced Usability

**Clean, Simple HomeKit Experience!** This release introduces simplified presentation with exactly 4 core tiles for better user experience while maintaining full functionality for advanced users.

### ✨ **New in v2.1.0**
- **🎯 Simplified Presentation**: Default to 4 essential tiles - "Volvo Lock", "Volvo Climate", "Volvo Battery", "Volvo Locate"
- **📱 Clean Interface**: Plain naming convention for better HomeKit app experience
- **⚙️ Presentation Modes**: Choose between Simple (4 tiles) or Advanced (all sensors) via config
- **📍 Enhanced Locate**: Fixed honk/flash functionality for vehicle location
- **🔧 Improved Config**: Streamlined configuration options with backward compatibility

## 🚀 v2.0.0 - Major Connected Vehicle API Update

**Now with full Connected Vehicle API v2 support!** This major release transforms the plugin from basic battery monitoring into a comprehensive vehicle integration platform.

## Features

### 🔋 **Battery & Energy Management**
- **Native Battery Service**: Proper HomeKit battery service with level, charging state, and low battery alerts
- **Real-time Charging Status**: Accurate charging detection via Connected Vehicle API
- **Electric Range Display**: Current driving range available

### 🚗 **Vehicle Access & Control**
- **Remote Lock/Unlock**: Control vehicle locks directly from HomeKit
- **Climate Control**: Start/stop climatization remotely
- **Command Status**: Real-time feedback on remote command execution

### 🚪 **Door & Window Monitoring** 
- **Individual Door Sensors**: Front left/right, rear left/right doors
- **Window Status**: All windows including sunroof monitoring
- **Hood & Tailgate**: Complete vehicle access point tracking
- **Real-time Updates**: Instant notifications when doors/windows open

### 🔧 **Vehicle Diagnostics**
- **Service Warnings**: Immediate alerts for maintenance needs
- **Odometer Reading**: Current mileage tracking
- **Tyre Pressure**: Individual tyre pressure monitoring and warnings
- **Distance to Service**: Track maintenance schedule

### 🌐 **API & Connectivity**
- **Hybrid API Architecture**: Connected Vehicle API v2 primary, Energy API v2 fallback
- **Smart Fallback**: Automatic API switching for maximum reliability
- **Rate Limiting**: Respects API limits (100 requests/min, 10 commands/min)
- **Comprehensive Caching**: Optimized data fetching with intelligent cache management
- **OAuth2 Security**: PKCE-enabled authentication with automatic token refresh

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

🚀 🚀 **NEW in v2.0.0**: **Connected Vehicle API Integration** - Complete EX30 monitoring and control!

🔑 **Advanced OAuth Setup Tool**: New comprehensive OAuth setup with multiple options and troubleshooting

⚡ **Fresh Token Strategy**: Generate new tokens on major updates due to Volvo's security rotation

### Quick Setup (Recommended)

**🚀 NEW in v2.4.0**: Use the enhanced OAuth setup tool

1. **Install the plugin** via Homebridge Config UI X or command line
2. **Run the OAuth setup tool**:
   ```bash
   cd /usr/local/lib/node_modules/homebridge-volvo-ex30
   npm run oauth
   ```
3. **Choose from 6 options**:
   - **🎯 Complete OAuth Flow** (Recommended) - Full guided setup
   - **🔗 Generate OAuth URL Only** - For manual workflows  
   - **🔄 Manual Token Exchange** - If you have an authorization code
   - **🧪 Minimal Scope Test** - Troubleshooting with basic permissions
   - **🔍 Troubleshooting Tools** - Network tests and diagnostics
   - **❓ Help & Documentation** - Comprehensive usage guide

4. **Follow the interactive prompts**:
   - Select scope configuration (Full/Minimal/Testing)
   - Open the generated OAuth URL in your browser
   - Sign in with your Volvo ID and authorize
   - Paste the complete redirect URL back into the tool
   - Tool automatically tests API access and generates configuration

5. **Copy the configuration** to your Homebridge config.json
6. **Restart Homebridge**

### Alternative: Manual Setup

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

3. **Run the new OAuth setup tool**:
   ```bash
   npm run oauth
   ```

4. **Follow the interactive menu**:
   - Choose option **1** (Complete OAuth Flow) for guided setup
   - Select **Full scopes** for complete functionality
   - The tool uses pre-configured credentials (no manual entry needed)

5. **Complete browser authorization**:
   - The tool will display an OAuth authorization URL
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
npm run oauth
```

⚠️ **Important**: Keep your refresh token secure and do not share it. It provides access to your vehicle data.

## 🛠️ OAuth Setup Tool Features

The new `npm run oauth` command provides a comprehensive OAuth setup experience:

### **🎯 Complete OAuth Flow (Recommended)**
- Full interactive setup from URL generation to token exchange
- Automatic API testing and vehicle discovery
- Ready-to-use Homebridge configuration generation
- Support for Full (25), Minimal (6), or Testing (2) scope configurations

### **🔗 Generate OAuth URL Only**
- Creates PKCE-compliant OAuth URLs for manual workflows
- Saves code verifier and state parameters for later token exchange
- Useful for debugging or custom integration processes

### **🔄 Manual Token Exchange** 
- Exchange authorization codes for refresh tokens
- Supports codes generated from any OAuth URL
- Includes automatic API validation and configuration output

### **🧪 Minimal Scope Test**
- Quick testing with basic scopes only (battery, doors, locks)
- Ideal for troubleshooting permission issues
- Faster setup for basic functionality validation

### **🔍 Troubleshooting Tools**
- **Network Connectivity Test** - Validates connection to Volvo servers
- **Credentials Validation** - Confirms API keys and client settings
- **Scope Permissions Check** - Reviews available permission configurations
- **Common Issues Guide** - Solutions for frequent setup problems

### **❓ Help & Documentation**
- Comprehensive usage instructions
- Technical implementation details
- Support and contact information

### **✅ Legacy Script Migration (v3.0.0)**
All previous OAuth scripts have been replaced with the unified solution:
- ✅  `easy-oauth.js` → **REMOVED** - Use `npm run oauth` (option 1)
- ✅  `working-oauth.js` → **REMOVED** - Use `npm run oauth` (option 2) 
- ✅  `token-exchange.js` → **REMOVED** - Use `npm run oauth` (option 3)
- ✅  `oauth-setup.js` → **REMOVED** - Use `npm run oauth`

*All legacy scripts removed in v3.0.0 - unified tool is the only supported method*

## 🔄 Token Management Strategy

### **Fresh Token on Updates**
Due to Volvo's aggressive token rotation and security policies, we recommend **generating a fresh token on each major plugin update**:

1. **Plugin Update Available?** → Generate fresh token first
2. **Authentication Errors?** → Generate fresh token  
3. **After Long Downtime?** → Generate fresh token

### **Why Fresh Tokens Work Better**
- **Volvo's Security**: Tokens rotate frequently and aggressively
- **Update Survival**: Complex token persistence often fails during updates
- **Simple & Reliable**: Fresh token generation is fast and always works
- **User Control**: You know exactly when and how your tokens are created

### **Quick Token Generation**
```bash
cd /usr/local/lib/node_modules/homebridge-volvo-ex30
npm run oauth
# Follow prompts → Get token → Update config → Restart
```

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
      "presentationMode": "simple",
      "accessoryNaming": "individual",
      "enableHonkFlash": true,
      "enableAdvancedSensors": false
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
| `vccApiKey` | Yes | - | VCC API Key from Volvo Developer Portal (32 characters) |
| `initialRefreshToken` | No | - | Initial OAuth refresh token for first-time setup |
| `region` | No | `eu` | Your vehicle's region (`eu` or `na`) |
| `pollingInterval` | No | `5` | Update interval in minutes (1-60) |
| `presentationMode` | No | `simple` | Presentation mode: `simple` (4 core tiles) or `advanced` (all sensors) |
| `accessoryNaming` | No | `individual` | **NEW in v2.2.0+**: Accessory naming strategy: `individual` (separate named accessories) or `unified` (single accessory) |
| `enableHonkFlash` | No | `true` | Show locate (honk & flash) switch for finding your vehicle |
| `enableAdvancedSensors` | No | `false` | Show individual door/window sensors and diagnostics (Advanced mode only) |

### **Legacy Configuration (v2.0.x and earlier)**
For backward compatibility, the following options are still supported but deprecated:
| `enableBattery` | No | `true` | Show native battery service (deprecated - use presentationMode) |
| `enableClimate` | No | `true` | Show climate control service (deprecated - use presentationMode) |
| `enableLocks` | No | `true` | Show lock management service (deprecated - use presentationMode) |
| `enableDoors` | No | `true` | Show door/window contact sensors (deprecated - use presentationMode) |
| `enableDiagnostics` | No | `true` | Show diagnostic sensors (deprecated - use presentationMode) |

## HomeKit Services

### 🎯 **Individual Accessories (v2.2.0+ Default)**
The plugin now creates **individual named accessories** for better organization:

#### **EX30 Battery** 🔋 (WindowCovering Service)
- **Current Position**: Battery level (0-100% as blind position)
- **Target Position**: Read-only (automatically matches current level)  
- **Position State**: Stopped (battery doesn't "move")
- **Visual Representation**: 73% battery = 73% blind closed

#### **EX30 Lock** 🔒 (LockManagement Service)
- **Current Lock State**: Real-time lock status (Secured/Unsecured)
- **Target Lock State**: Remote lock/unlock control
- **Lock Control**: Tap to lock/unlock vehicle from Home app
- **Category**: Security System with proper lock icon

#### **EX30 Climate** 🌡️ (Thermostat Service)
- **Current Temperature**: Vehicle interior temperature (when available)
- **Target Temperature**: Temperature setting (15-25°C range)
- **Heating/Cooling State**: Current climate system status (OFF/HEAT)
- **Target Heating/Cooling**: Climate control (OFF/AUTO)
- **Full Control**: Complete thermostat functionality

#### **EX30 Locate** 📍 (Switch Service - Momentary)
- **Vehicle Locate**: Honk horn and flash lights to find your vehicle
- **Auto-Reset**: Automatically turns off after activation (1 second)
- **One-Touch**: Simple tap to trigger location assistance

### 🔄 **Legacy: Simple Presentation Mode**
Available with `"accessoryNaming": "unified"` - creates single "Volvo EX30" accessory with 4 services:

#### **Volvo Battery** 🔋
- **Battery Level**: Current state of charge (0-100%)
- **Charging State**: Whether the vehicle is currently charging  
- **Low Battery**: Alert when battery level is ≤20%

#### **Volvo Lock** 🔒
- **Current Lock State**: Real-time lock status (Secured/Unsecured)
- **Target Lock State**: Remote lock/unlock control
- **Lock Control**: Tap to lock/unlock vehicle from Home app

#### **Volvo Climate** 🌡️
- **Climate Switch**: Start/stop vehicle climatization
- **Remote Control**: Pre-condition vehicle before driving

#### **Volvo Locate** 📍
- **Locate Switch**: Honk horn and flash lights to find your vehicle
- **One-Touch Activation**: Automatically turns off after triggering

### ⚙️ **Advanced Presentation Mode (Optional)**
Enable `"presentationMode": "advanced"` for comprehensive monitoring:

### 🔋 Battery Service
- **Battery Level**: Current state of charge (0-100%)
- **Charging State**: Whether the vehicle is currently charging  
- **Low Battery**: Alert when battery level is ≤20%

### 🔒 Lock Management
- **Current Lock State**: Real-time lock status (Secured/Unsecured)
- **Target Lock State**: Remote lock/unlock control
- **Lock Control**: Tap to lock/unlock vehicle from Home app

### 🌡️ Climate Control
- **Climate Switch**: Start/stop vehicle climatization
- **Remote Control**: Pre-condition vehicle before driving

### 🚪 Door & Window Sensors (11 sensors)
- **Front Left/Right Doors**: Individual door status
- **Rear Left/Right Doors**: Individual door status
- **Hood**: Engine compartment access
- **Tailgate**: Rear cargo access
- **Front Left/Right Windows**: Window position monitoring
- **Rear Left/Right Windows**: Window position monitoring  
- **Sunroof**: Sunroof position monitoring

### 🔧 Diagnostic Sensors
- **Service Warning**: Maintenance alert sensor
- **Odometer**: Current mileage tracking (motion sensor)
- **Tyre Pressure**: Individual tyre pressure warnings

## API Architecture

### Connected Vehicle API v2 (Primary)
- **Rich Data**: 15+ endpoints providing comprehensive vehicle information
- **Real-time Control**: Lock/unlock, climate control commands
- **Full EX30 Support**: Native electric vehicle data and diagnostics
- **High Success Rate**: 100% reliability in testing

### Energy API v2 (Fallback)
- **Basic Data**: Battery level, charging status, electric range
- **Legacy Support**: Maintains compatibility with older implementations
- **Automatic Fallback**: Used when Connected Vehicle API unavailable

### Rate Limits
This plugin respects Volvo's API rate limits:
- **100 data requests per minute** per user per application
- **10 command requests per minute** for vehicle control actions
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
- Run `npm run oauth` in the plugin directory
- Choose option 1 (Complete OAuth Flow) for guided setup
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

**OAuth Log Spam (TRUE ELIMINATION in v2.1.4)**
- ✅ **v2.1.4 True Fix**: Eliminated OAuth spam by preventing 14 concurrent HTTP requests entirely
- ✅ **Token Pre-validation**: Added validation BEFORE Promise.allSettled() to prevent concurrent failures
- ✅ **Architectural Solution**: Fixed timing issue where flags were checked AFTER requests started
- ✅ **Root Cause Resolved**: Stack trace analysis revealed concurrent HTTP requests at axios level
- ✅ **Zero Spam Guarantee**: Plugin will either work or fail with exactly 3 log lines, then complete silence
- ✅ **Service Conflicts Fixed**: Resolved UUID conflicts that caused setup errors
- ✅ **Critical Update**: Update to v2.1.4+ immediately for TRUE OAuth spam elimination

**If you're on ANY previous version and experiencing OAuth spam:**
```bash
npm install -g homebridge-volvo-ex30@2.1.4
sudo systemctl restart homebridge
```

**Error: "OAuth token refresh failed" (FIXED in v1.2.41)**
- ✅ **Fixed in v1.2.30**: Improved token handling to use config values instead of cached tokens  
- ✅ **Fixed in v1.2.31**: Implemented aggressive proactive token refresh for Volvo's short-lived tokens
- ✅ **CRITICAL FIX in v1.2.32**: Serialized token refresh to prevent concurrent token exhaustion
- ✅ **CRITICAL FIX in v1.2.41**: Fixed false "expired" detection on valid tokens (even 4-hour-old tokens)
- ✅ **Root Cause Solved**: Fixed stored tokens being incorrectly flagged as expired immediately after loading
- **Key Discovery**: Plugin was treating missing access token expiry as "expired" instead of "needs refresh"
- **Result**: Valid tokens work immediately, no more false 7-day expiration messages

**Enhanced Token Storage System (v1.2.35+):**
- ✅ **Persistent token storage**: Refreshed tokens automatically saved to disk
- ✅ **Conflict-free storage**: Simple JSON file, no plugin conflicts
- ✅ **Survives restarts**: Stored tokens persist across Homebridge restarts
- ✅ **Survives updates**: Token storage survives plugin updates and system reboots
- ✅ **Smart fallback**: Uses stored token → config.json token → error
- ✅ **Storage location**: `~/.homebridge/volvo-ex30-tokens.json` (clean, isolated)
- ✅ **7-day lifecycle**: Tokens rotate properly with automatic persistence

**If you still see this error after v1.2.41:**
1. **Update immediately**: `npm update -g homebridge-volvo-ex30`  
2. **Check debug logs**: Look for detailed token expiry calculations and OAuth responses
3. **Restart Homebridge**: Existing tokens should work immediately
4. **Only if still failing**: Generate fresh token using Postman method

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

**If still showing house icon after v1.2.38+:**

**This is a known Apple Home app limitation** - the battery service works correctly but Apple's Home app shows it as "Not Supported" with a house icon.

**✅ SOLVED in v1.2.40+**: **Temperature Sensor Solution**
- **"EX30 Battery Level"**: Temperature sensor showing battery percentage (73° = 73% battery)
- **"EX30 Charging"**: Contact sensor showing charging state (Open=Charging, Closed=Not Charging)
- **Always Visible**: Battery level always displayed regardless of charging state
- **Perfect Apple Home Support**: Temperature sensors work flawlessly in Apple Home app

**Alternative Solutions:**
1. **Use Alternative HomeKit Apps**: 
   - **Controller for HomeKit** (iOS/macOS) - Displays battery services correctly
   - **Eve for HomeKit** (iOS) - Shows proper battery information
   - **Home Assistant** - Full HomeKit compatibility
   - **HomeKit Device Manager** - Developer tool with full service support

2. **Clear HomeKit Cache (if needed)**:
   - Remove EX30 accessory from Home app completely
   - Restart Homebridge - accessory rediscovered with temperature and contact sensors
   - Check logs for "🌡️ Battery temperature sensor configured" message

**Why This Was an Issue**: Apple's Home app has limited support for battery services. The temperature sensor solution provides perfect visibility and intuitive display.

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
- `npm run oauth` - Run OAuth setup tool
- `npm run test` - Run Jest unit tests
- `npm run test:coverage` - Run tests with coverage report

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