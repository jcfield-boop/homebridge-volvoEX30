# Release Notes v1.2.30

## 🔧 Major Fixes

### OAuth Token Handling
- **Fixed critical issue** where plugin used cached/old refresh tokens instead of current config values
- **Enhanced token debugging** with comprehensive logging for troubleshooting OAuth issues
- **Improved error handling** with specific guidance for different OAuth failure scenarios
- **Added test script** (`scripts/test-refresh-token.js`) for validating refresh token status

### HomeKit Display Issues
- **Resolved "Not Supported" status** by setting proper accessory category (SENSOR)
- **Fixed device icon** - no more generic "house" icon in HomeKit
- **Enhanced battery service** configured as primary service with proper characteristics
- **Improved device information** with correct manufacturer, model, and firmware details

### API & TypeScript Improvements
- **Fixed TypeScript compilation errors** related to missing refreshToken property
- **Enhanced API client** with proper token passing throughout the OAuth flow
- **Better custom UI** config loading with enhanced error handling and logging

## 🎯 What This Fixes

If you were experiencing:
- ❌ "OAuth token refresh failed" errors → ✅ **Fixed**
- ❌ Device showing as "Not Supported" in HomeKit → ✅ **Fixed**  
- ❌ Generic house icon instead of proper device icon → ✅ **Fixed**
- ❌ Plugin using old/cached tokens → ✅ **Fixed**

## 🚀 Upgrade Instructions

1. **Update the plugin:**
   ```bash
   npm update -g homebridge-volvo-ex30
   ```

2. **For HomeKit display issues:**
   - Remove the accessory from HomeKit
   - Restart Homebridge
   - Re-add the accessory for optimal display

3. **For OAuth issues:**
   - Verify your refresh token is valid:
     ```bash
     node scripts/test-refresh-token.js
     ```
   - If invalid, generate a new token using Postman (Method 3) or the OAuth setup script

## 🔍 Debugging Tools

New in this release:
- **Token validation script**: Test your refresh token status
- **Enhanced logging**: Better debugging information in Homebridge logs
- **Detailed error messages**: Specific guidance for different failure scenarios

## ⚡ Performance & Reliability

- Improved token caching and refresh logic
- Better error recovery for temporary API failures
- Enhanced rate limiting compliance
- More reliable HomeKit service discovery

---

**Full Changelog**: [View on GitHub](https://github.com/jcfield-boop/homebridge-volvoEX30/blob/main/CHANGELOG.md#1230---2025-08-13)