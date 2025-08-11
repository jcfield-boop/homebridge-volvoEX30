# Release Notes

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