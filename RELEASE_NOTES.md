# Release Notes

## v1.2.28 - Improved User Experience & Documentation Alignment

### 🔧 Fixed Outdated Error Messages
- **Before**: Complex SSH instructions in error logs that nobody wanted to follow
- **After**: Direct Postman setup instructions that get you working in 2 minutes
- **Impact**: No more confusion when users see missing token errors

### 🎯 Enhanced Custom UI
- **New Section**: "Alternative: Quick Postman Setup" prominently displayed in green
- **Manual Token Entry**: Direct paste field for refresh tokens from Postman
- **Collapsible Guide**: Step-by-step Postman instructions built right into the UI
- **Visual Priority**: Manual approach now highlighted as "Recommended for Personal Use"

### 📋 What Users See Now
**Error Message (Old)**:
```
🔧 To get your refresh token, run the OAuth setup:
   1. SSH into your Raspberry Pi
   2. cd /usr/local/lib/node_modules/homebridge-volvo-ex30
   3. npm run oauth-setup
   ...
```

**Error Message (New)**:
```  
🔑 QUICK SETUP - Get your refresh token with Postman:
   1. Download Postman (https://www.postman.com/downloads/)
   2. Create new request → Authorization tab → OAuth 2.0
   3. Configure: Grant Type "Authorization Code (With PKCE)"
   ...
  10. Click "Get New Access Token" → Login → Copy refresh_token
```

### 💡 Why This Matters
- **Consistency**: Error messages now match the README's Method 3 approach
- **User Success**: No more "I don't know how to SSH" support requests
- **Quick Wins**: Users can get their EX30 in HomeKit within minutes, not hours
- **Less Friction**: Manual approach is now the obvious first choice

### 🚀 Three Setup Methods (In Order of Ease)
1. **Method 3 (Manual/Postman)** - ⭐ **Now prominently featured everywhere**
2. **Method 1 (Custom UI OAuth)** - Still available for automated flow
3. **Method 2 (SSH OAuth)** - Advanced users only

## v1.2.27 - Enhanced Token Rotation & Manual Setup

### 🔄 Token Rotation Revolution
- **Robust Token Rotation**: Full support for OAuth refresh token rotation with intelligent fallbacks
- **Dual Storage Strategy**: Tokens saved to both file storage AND config.json for maximum persistence
- **Smart Token Precedence**: Always uses the most recent token (stored > config) for seamless operation
- **Zero-Downtime Updates**: Token rotation happens automatically without breaking HomeKit connection

### 🔑 Manual Setup Approach (Quick Win!)
- **New Method 3**: Simple Postman-based token setup for personal use
- **10K Daily Calls**: More than enough API quota for personal EX30 monitoring
- **Hard-Code Friendly**: Just paste the refresh token and go!
- **Perfect vs Good**: Don't over-engineer - get your EX30 in HomeKit today

### 🛠️ Code Quality & Stability
- **Clean Codebase**: Removed all test files and development artifacts
- **ESLint Compliance**: Fixed all linting issues and improved Node.js environment support  
- **TypeScript Safety**: Resolved Logger type issues and enhanced type safety
- **Production Ready**: Streamlined for reliable long-term operation

### 💡 Why This Matters
Before v1.2.27, token rotation could break your HomeKit connection. Now:
- ✅ **Tokens rotate seamlessly** - Volvo rotates your refresh token? No problem!
- ✅ **Survives restarts** - Plugin restarts won't lose your tokens
- ✅ **Multiple backups** - Token stored in multiple locations for safety
- ✅ **Smart fallbacks** - If one method fails, others take over

### 🚀 Quick Start (New Users)
1. Use **Method 3** in README for fastest setup
2. Get your refresh token from Postman in 2 minutes  
3. Hard-code it in Homebridge config
4. Enjoy your EX30 in HomeKit!

## v1.2.7 - Enhanced Custom UI with PKCE Security

### 🔐 Security & Stability
- **Complete PKCE Support**: All OAuth flows now use PKCE (Proof Key for Code Exchange) for enhanced security
- **Custom UI PKCE**: Homebridge Config UI X custom interface now supports PKCE authentication
- **Legacy Scope Support**: Updated OAuth scopes to `conve:*` format for maximum compatibility
- **Enhanced Validation**: Better credential validation and error handling

### 🎯 What's Fixed
- ✅ **"code_challenge is required" Error**: Completely resolved across all OAuth methods
- ✅ **Custom UI OAuth**: Now works seamlessly with Volvo's PKCE requirements
- ✅ **Consistent Security**: All OAuth implementations (main code, CLI script, custom UI) use the same security standards
- ✅ **Better Error Messages**: Clear guidance for common OAuth issues

### 🛠️ Technical Improvements
- Web Crypto API-based PKCE generation in custom UI
- Synchronized OAuth scopes across all implementations  
- Enhanced error handling with specific OAuth failure detection
- Improved redirect URI consistency

### 🚀 User Experience
- Seamless OAuth setup in custom UI with proper security
- Better validation prevents common setup errors
- Clearer error messages guide users through OAuth issues
- One-stop credential entry with persistent storage

## v1.2.6 - OAuth Script PKCE Support
- Added PKCE support to standalone `npm run oauth-setup` script
- Synchronized PKCE implementation across TypeScript and JavaScript code
- Fixed discrepancy between different OAuth implementations

## v1.2.5 - Core PKCE Implementation  
- Added PKCE support to main TypeScript OAuth handler
- Enhanced OAuth security compliance with modern standards
- Fixed core "code_challenge is required" error

## v1.2.0 - Automatic OAuth Flow

### 🚀 Major Features
- **Automatic OAuth Callback Server**: No more manual code copying!
- **Zero-Click Token Capture**: Completely automated authorization flow
- **Real-Time Updates**: Live polling with automatic UI updates
- **Professional Success Page**: Beautiful authorization completion experience

### ✨ User Experience Revolution
- **Before**: 7 manual steps with technical complexity
- **After**: 2 clicks and done! ⚡

### 🛠️ How It Works
1. Click "Start OAuth" → Server starts on localhost:3000
2. Authorize in browser → Token appears automatically
3. Save configuration → You're done!

### 🎯 Problems Solved
- ❌ No more "where do I find the redirect URL?"
- ❌ No more manual code extraction
- ❌ No more SSH or terminal confusion
- ✅ Works on all devices (desktop, mobile, tablet)

## v1.1.1 - Changelog & Metadata Fix
- Fixed changelog detection in Homebridge Config UI X
- Added proper repository metadata
- Enhanced npm package information

## v1.1.0 - Custom Configuration UI
- Brand new web-based configuration interface
- Integrated OAuth setup directly in Homebridge Config UI X
- Visual step-by-step setup wizard
- Mobile-responsive design

## v1.0.3 - OAuth Compatibility Fix
- Fixed "tsc: not found" error in Homebridge environments
- Added pre-built JavaScript OAuth setup script

## v1.0.2 - Enhanced Documentation
- Detailed Raspberry Pi setup instructions
- Expanded troubleshooting guide
- OAuth-specific error solutions

## v1.0.1 - Error Handling Improvements
- Better error messages for missing refresh tokens
- Clear setup instructions in logs
- Improved user guidance

## v1.0.0 - Initial Release
- Complete Homebridge plugin for Volvo EX30
- Battery monitoring with HomeKit integration
- OAuth2 authentication with Volvo APIs
- Energy API client with rate limiting
- Multi-region support (EU/NA)