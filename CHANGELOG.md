# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2025-08-14

### Removed
- **Confusing HomeKit Representations**: Removed temperature sensor that displayed battery percentage as temperature degrees
- **Contact Sensor for Charging**: Removed contact sensor that showed charging state (Open=Charging, Closed=Not Charging)

### Changed
- **Battery Service**: Made battery service the primary HomeKit service for cleaner representation
- **User Experience**: Simplified HomeKit interface to use only proper battery service with standard characteristics

### Technical Details
- **HomeKit Services**: Removed `setupBatteryTemperatureService()` and `setupChargingContactService()` methods
- **Service Updates**: Eliminated temperature and contact sensor characteristic updates from polling loop
- **Primary Service**: Battery service now set as primary instead of secondary service
- **Code Cleanup**: Removed 85+ lines of confusing service implementation code

### Why This Change?
- **User Feedback**: Temperature sensor showing "73°" for 73% battery was confusing in HomeKit
- **Intuitive Interface**: Contact sensors for charging state were not intuitive (Open/Closed states)
- **Standard Compliance**: Battery service provides proper battery level, low battery alerts, and charging status
- **Cleaner UI**: Users now see a single, clear battery representation in HomeKit

### Migration
- **No Action Required**: Existing refresh tokens and authentication continue to work
- **Automatic Cleanup**: Old services will be removed automatically when plugin updates
- **Same Functionality**: All battery monitoring features still available through proper battery service

### Result
- ✅ **Cleaner HomeKit**: Single battery service shows level, charging status, and low battery warnings
- ✅ **No Confusion**: Eliminated confusing temperature and contact sensor representations
- ✅ **Standard Interface**: Uses HomeKit's intended battery service characteristics
- ✅ **Same Data**: All battery information still available, just presented properly

## [1.2.45] - 2025-08-14

### Fixed
- **CLI OAuth Script**: Fixed "axios is not defined" error in oauth-setup.js script
- **Missing Dependencies**: Restored axios and crypto imports in CLI script
- **Regression Fix**: CLI OAuth setup now works correctly again

### Technical Details
- **Import Issue**: Previous update accidentally removed axios import from CLI script
- **Dependency Restoration**: Added back required axios and crypto imports
- **Fallback Support**: CLI now gracefully handles both shared and built-in OAuth implementations
- **Error Prevention**: Added proper error handling for missing shared modules

### Result
- ✅ **CLI OAuth Works**: `npm run oauth-setup` now functions correctly
- ✅ **Custom UI Works**: Both Custom UI and CLI OAuth methods available
- ✅ **No Regressions**: All existing functionality preserved
- ✅ **Error Handling**: Clear messaging when dependencies are missing

## [1.2.44] - 2025-08-14

### Fixed
- **Custom UI Server Loading**: Fixed Custom UI server falling back to main Homebridge UI
- **OAuth Handler Import**: Added fallback OAuth implementation when shared handler fails to load
- **Module Dependencies**: Enhanced error handling for missing compiled modules
- **Server Initialization**: Improved server startup with graceful fallback for dependencies

### Added
- **Fallback OAuth Methods**: Built-in OAuth implementation when shared module unavailable
- **Enhanced Error Handling**: Better error reporting when modules fail to load
- **Debug Logging**: Added logging for OAuth handler loading status
- **Dependency Resilience**: Server starts successfully even with missing optional dependencies

### Technical Details
- **Import Safety**: Wrapped shared OAuth handler import in try-catch with fallback
- **PKCE Implementation**: Ensured PKCE compliance in both shared and fallback implementations
- **Axios Import**: Added missing axios dependency for fallback token exchange
- **Session Management**: Maintained session handling regardless of OAuth implementation used

### Result
- ✅ **Custom UI Loads**: Server starts successfully regardless of shared module status
- ✅ **OAuth Works**: Either shared handler or fallback implementation provides OAuth functionality
- ✅ **Error Recovery**: Clear logging when shared modules fail to load
- ✅ **Backward Compatibility**: Existing setups continue working without issues

## [1.2.43] - 2025-08-14

### Fixed
- **Custom UI Configuration**: Fixed config.json handling to properly read/write platforms array
- **OAuth Integration**: Integrated Custom UI with shared OAuth handler for consistency with CLI
- **Config Loading Reliability**: Enhanced frontend config loading with better retry logic and error handling
- **Server Implementation**: Updated to use proper Homebridge config APIs instead of plugin-specific methods
- **Error Reporting**: Improved error messages and user feedback throughout Custom UI

### Added
- **Shared OAuth Handler**: New shared OAuth implementation used by both Custom UI and CLI scripts
- **Enhanced Frontend**: Better loading states, error handling, and user feedback in Custom UI
- **Config Validation**: Improved validation and error reporting for configuration issues
- **Debug Logging**: Enhanced logging throughout Custom UI server for better troubleshooting

### Changed
- **Config Structure**: Custom UI now properly handles Homebridge platforms array
- **OAuth Consistency**: Both Custom UI and CLI now use identical OAuth implementation
- **Error Handling**: More informative error messages with specific guidance for users
- **User Experience**: Streamlined config loading with visual feedback and retry mechanisms

### Technical Implementation
- **Platforms Array**: Proper manipulation of config.json platforms array instead of plugin config
- **Shared OAuth**: Extracted OAuth logic to shared TypeScript module for consistency
- **Error Recovery**: Enhanced retry logic with exponential backoff for config loading
- **Type Safety**: Improved TypeScript types and error handling throughout

### Result
- ✅ **Config Persistence**: Custom UI now correctly saves/loads configuration to config.json
- ✅ **OAuth Reliability**: Consistent OAuth behavior between Custom UI and CLI methods
- ✅ **Error Clarity**: Clear error messages help users troubleshoot setup issues
- ✅ **User Experience**: Smooth config loading with proper loading states and feedback
- ✅ **Multiple Vehicles**: Proper support for multiple EX30 vehicle configurations

### Migration Notes
- Existing configurations will be automatically migrated to proper platforms array structure
- Custom UI now works reliably for both new setups and existing configurations
- No user action required - improvements are automatic on upgrade

## [1.2.42] - 2025-08-14

### Updated
- **Documentation**: Updated README with comprehensive temperature sensor solution guidance
- **Troubleshooting**: Enhanced error resolution steps for v1.2.41 token fixes
- **Feature Highlights**: Added prominent temperature sensor solution section
- **User Guide**: Clear explanation of always-visible battery display solution

### Documentation Improvements
- **Temperature Sensor Prominence**: Featured temperature sensor solution at top of README
- **Apple Home Solution**: Clear documentation that house icon issue is solved
- **Token Fix Documentation**: Updated troubleshooting to reflect v1.2.41 fixes
- **User Experience**: Enhanced feature descriptions with real-world examples

### Result
- ✅ **Clear User Guidance**: Users understand the temperature sensor solution immediately
- ✅ **Updated Troubleshooting**: Reflects latest token fixes and solutions
- ✅ **Feature Visibility**: Temperature sensor solution prominently featured
- ✅ **Comprehensive Guide**: All issues and solutions clearly documented

## [1.2.41] - 2025-08-14

### Fixed
- **Token Expiration Bug**: Fixed false "expired" detection causing unnecessary refresh attempts on valid tokens
- **Debug Logging**: Added detailed token expiry debug logging to identify refresh issues
- **Initial Token Flow**: Improved handling of stored refresh tokens to avoid false expiration triggers
- **Error Logging**: Enhanced OAuth error logging with token prefix for better debugging

### Technical Details
- Fixed issue where stored refresh tokens were incorrectly flagged as expired immediately after loading
- Added debug logging for token expiry calculations and OAuth response details
- Improved initial token refresh flow to return immediately after successful refresh
- Enhanced error reporting to show actual HTTP status and response data from Volvo

### Result
- ✅ **Tokens work correctly**: No more false expiration on valid 4-hour-old tokens
- ✅ **Better debugging**: Clear logs show actual token expiry times and refresh reasons
- ✅ **Proper error handling**: Real OAuth errors are logged instead of generic 7-day messages
- ✅ **Temperature sensor ready**: Plugin ready for temperature sensor testing once tokens work

## [1.2.40] - 2025-08-14

### Added
- **Temperature Sensor for Battery Display**: Added "EX30 Battery Level" temperature sensor where temperature = battery percentage
- **Contact Sensor for Charging State**: Added "EX30 Charging" contact sensor (Open=Charging, Closed=Not Charging)
- **Always-Visible Battery Level**: Temperature display shows battery percentage regardless of charging state (73° = 73% battery)
- **Dual Visual Indicators**: Both battery level (temperature) and charging status (contact) always visible

### Fixed
- **Lightbulb Service Visibility Issue**: Replaced problematic lightbulb approach (brightness invisible when off)
- **Battery Level Always Visible**: Temperature sensor ensures battery percentage is always displayed
- **Charging State Display**: Contact sensor provides clear visual charging indication

### Changed
- **Primary Service**: Temperature sensor now primary service for always-visible battery level
- **Service Strategy**: Replaced humidity sensor with temperature sensor for better visibility
- **Visual Display**: Temperature = battery level, contact = charging state for optimal HomeKit display

### Technical Implementation
- **Temperature Service**: CurrentTemperature characteristic displays battery percentage (0-100° = 0-100%)
- **Contact Service**: ContactSensorState shows charging status (DETECTED=charging, NOT_DETECTED=not charging)
- **Primary Service**: Temperature sensor set as primary with proper naming
- **Polling Updates**: Both temperature and contact sensors update during polling cycle

### User Experience
- ✅ **Always Visible**: 73° temperature always shows 73% battery, regardless of charging state
- ✅ **Clear Charging Indication**: Contact sensor opens when charging, closes when not charging
- ✅ **No Confusion**: No on/off states that hide information like lightbulb brightness
- ✅ **Intuitive Display**: Temperature number directly corresponds to battery percentage

### Result
- ✅ **Perfect Visibility**: Battery level always displayed as temperature
- ✅ **Charging Status**: Contact sensor clearly shows charging state
- ✅ **No Apple Limitations**: Temperature sensors work perfectly in Apple Home app
- ✅ **User Approved**: Solves "shows how full it is and if it's charging" requirement

## [1.2.39] - 2025-08-13

### Added
- **Humidity Sensor Workaround**: Added "EX30 Battery %" humidity sensor for proper HomeKit display
- **Dual Service Approach**: Both battery service AND humidity sensor for maximum compatibility
- **Alternative HomeKit Apps**: Documented apps that display battery services correctly (Controller, Eve, etc.)
- **Enhanced Custom UI Retry Logic**: Config loading now retries up to 3 times with increasing delays

### Fixed
- **Apple Home App Limitation**: Humidity sensor displays battery percentage with proper sensor icon
- **HomeKit House Icon Issue**: Multiple solutions including workaround and alternative apps
- **Custom UI Config Loading**: Improved reliability with retry logic and better error handling
- **Service Recognition**: Humidity sensor as primary service for better HomeKit display

### Changed
- **Primary Service**: Humidity sensor now primary, battery service secondary for better icon display
- **Accessory Category**: Back to SENSOR category optimized for humidity sensor display
- **Custom UI Reliability**: Enhanced config loading with exponential backoff retry strategy

### Technical Implementation
- **Humidity Sensor Service**: CurrentRelativeHumidity characteristic displays battery percentage (0-100%)
- **Dual Updates**: Both services update with real battery data during polling
- **Service Configuration**: Humidity sensor set as primary with proper naming and configuration
- **Retry Logic**: 1s, 2s delays for empty config; 1.5s, 3s delays for errors

### Documentation Updates
- **Apple Limitation Explanation**: Clear explanation this is Apple Home app issue, not plugin issue
- **Multiple Solutions**: Alternative HomeKit apps, workaround sensor, cache clearing steps
- **User-Friendly Guidance**: Step-by-step solutions for different user scenarios
- **App Recommendations**: Specific alternative HomeKit apps that work properly

### Result
- ✅ **Proper Sensor Icon**: "EX30 Battery %" shows with sensor icon instead of house icon
- ✅ **Real Battery Data**: Both services display actual EX30 battery percentage and status
- ✅ **Multiple Display Options**: Works in Apple Home (humidity) and other HomeKit apps (battery)
- ✅ **Reliable Config Loading**: Custom UI consistently loads existing configuration
- ✅ **User Education**: Clear understanding of Apple limitation and available solutions

### Migration Notes
- Existing users will see both battery service (may show house icon) AND new humidity sensor
- Humidity sensor displays same battery data with proper sensor icon
- No configuration changes needed - automatic dual service setup

## [1.2.38] - 2025-08-13

### Fixed
- **HomeKit House Icon**: Enhanced battery service configuration to force proper HomeKit recognition
- **Battery Display**: Added immediate initial values (50%, Normal, Not Charging) to help HomeKit identify as battery device
- **Service Recognition**: Added ConfiguredName characteristic for better HomeKit identification
- **Category Configuration**: Changed from SENSOR to OTHER category for improved HomeKit display

### Added
- **Enhanced Logging**: Added "🔋 Battery service configured as primary service" log message for debugging
- **Cache Clearing Instructions**: Added HomeKit cache clearing steps for persistent house icon issues
- **Troubleshooting Guide**: Clear steps for resolving HomeKit display issues

### Technical Implementation
- **Initial Characteristic Values**: Set BatteryLevel, StatusLowBattery, ChargingState immediately on service creation
- **Service Configuration**: Enhanced primary service setup with ConfiguredName for better identification
- **Category Optimization**: Use OTHER category instead of SENSOR for more reliable HomeKit recognition

### Result
- ✅ **Immediate Battery Recognition**: HomeKit should recognize device as battery immediately on setup
- ✅ **Proper Icon Display**: Should show battery icon instead of house icon
- ✅ **Clear Troubleshooting**: Users have clear steps if cache clearing is needed

## [1.2.37] - 2025-08-13

### Changed
- **Config Field Renamed**: `refreshToken` → `initialRefreshToken` for better clarity
- **Clearer Purpose**: Field name now indicates it's for initial setup only (plugin manages tokens automatically after)
- **OAuth Setup Script**: Fixed default redirect URI from localhost (rejected by Volvo) to GitHub repository URL
- **Custom UI**: Updated to use `initialRefreshToken` field throughout HTML, JavaScript, and server code

### Fixed
- **OAuth Setup Issues**: No more localhost rejection errors from Volvo OAuth server
- **Custom UI Compatibility**: All UI components now work with renamed config field
- **Error Messages**: Updated to reference `initialRefreshToken` for consistency
- **Documentation**: Comprehensive updates explaining field rename and 7-day token expiration

### Added
- **7-Day Token Expiration Documentation**: Complete explanation of when tokens expire (7+ days offline only)
- **Migration Guide**: Clear instructions for updating config.json field name
- **Better Error Handling**: Improved OAuth error messages explaining token expiration scenarios

### Technical Implementation
- **Config Schema**: Updated to use `initialRefreshToken` with descriptive help text
- **TypeScript Interface**: Updated `VolvoEX30Config` interface for new field name
- **Platform Code**: All platform initialization uses new field name
- **Custom UI Server**: Full update of server endpoints and validation

### Migration Required
- **IMPORTANT**: Existing users must rename `refreshToken` to `initialRefreshToken` in config.json before updating
- **No Token Loss**: Same token value, just renamed field
- **Why**: Makes purpose clear - this token is only for initial setup, plugin manages rotation automatically

## [1.2.36] - 2025-08-13

### Added
- **Cleanup Script**: Added automated cleanup script for v1.2.34 storage migration issues
- **Migration Documentation**: Comprehensive guide for fixing plugin conflicts from v1.2.34
- **Storage Troubleshooting**: Enhanced documentation for electromagnetic lock plugin conflicts

### Fixed
- **v1.2.34 Migration Issues**: Provides tools to remove problematic persist directory
- **Plugin Conflict Resolution**: Clear instructions for fixing broken plugins after v1.2.34
- **Documentation**: Added specific section for storage migration cleanup

### Technical Implementation
- **cleanup-old-storage.sh**: Interactive script to remove problematic `/persist/volvo-ex30/` directory
- **Automatic Detection**: Script detects and safely removes old storage causing conflicts
- **Migration Safety**: Preserves tokens through config.json fallback during cleanup

### Result
- ✅ **Easy Cleanup**: Simple script to fix v1.2.34 migration issues
- ✅ **Clear Instructions**: Step-by-step guide for fixing plugin conflicts
- ✅ **Safe Migration**: No token loss during cleanup process
- ✅ **Plugin Compatibility**: Ensures all plugins work after migration

## [1.2.35] - 2025-08-13

### Fixed
- **CRITICAL: Plugin Conflicts**: Eliminated node-persist dependency causing conflicts with other plugins
- **Storage Conflicts**: Resolved electromagnetic lock plugin and other node-persist collisions
- **HomeKit Display**: Enhanced accessory category assignment with default Garage room

### Changed
- **Storage System**: Migrated from node-persist to simple JSON file storage
- **Storage Location**: Now uses isolated `~/.homebridge/volvo-ex30-tokens.json` file
- **No External Dependencies**: Removed node-persist and @types/node-persist dependencies
- **Conflict-Free**: Each plugin can use its own storage approach without interference

### Technical Implementation
- **Simple JSON Storage**: Native Node.js fs operations, no external libraries
- **Same Functionality**: All token persistence features preserved
- **Migration**: Automatic migration from old storage to new JSON file
- **Isolated Storage**: Single file approach eliminates shared directory conflicts

### Dependencies Removed
- **Removed**: `node-persist@^3.1.3` (causing plugin conflicts)
- **Removed**: `@types/node-persist@^3.1.8` (no longer needed)

### Result
- ✅ **No Plugin Conflicts**: Eliminates interference with other Homebridge plugins
- ✅ **Smaller Package**: Reduced dependencies and package size
- ✅ **Same Features**: All token rotation and persistence functionality maintained
- ✅ **Better Isolation**: Clean separation from other plugin storage systems

## [1.2.34] - 2025-08-13

### Added
- **Persistent Token Storage**: Refreshed tokens now automatically saved to disk using node-persist
- **Smart Token Management**: Uses stored tokens > config.json tokens > error fallback
- **Token Storage Location**: `~/.homebridge/persist/volvo-ex30/` (survives plugin updates)
- **Token Storage API**: New TokenStorage class for robust token persistence

### Fixed
- **Token Persistence**: Solved restart issue where plugin reverted to old config.json tokens
- **Complete Token Lifecycle**: 7-day token rotation now works seamlessly across restarts
- **Update Survival**: Tokens persist through plugin updates and system reboots

### Changed
- **OAuth Handler**: Enhanced to integrate with persistent token storage
- **API Client**: Updated to pass VIN and storage directory for token management
- **Platform**: Added token storage initialization and debugging

### Technical Implementation
- **Storage Pattern**: Plugin-specific directory using standard Homebridge storage location
- **Token Rotation**: Automatic storage of rotated refresh tokens from Volvo
- **Graceful Fallback**: Continues working even if storage fails (uses config tokens)
- **VIN-based Storage**: Supports multiple vehicles with separate token storage

### Dependencies
- **Added**: `node-persist@^3.1.3` for persistent storage
- **Added**: `@types/node-persist@^3.1.8` for TypeScript support

### Result
- ✅ **Complete Solution**: No more manual token management needed
- ✅ **Restart Safe**: Tokens work immediately after Homebridge restart
- ✅ **Update Safe**: Plugin updates don't affect stored tokens
- ✅ **7-Day Lifecycle**: Full token rotation without manual intervention

## [1.2.33] - 2025-08-13

### Fixed
- **HomeKit Display**: Fixed cached accessory category for existing installations showing as "Not Supported"
- **Cached Accessory Handling**: Ensure proper sensor category is set when restoring accessories from cache
- **Version Synchronization**: Updated accessory firmware/software versions to current release

### Changed
- **Accessory Category**: Now explicitly sets Categories.SENSOR for both new and cached accessories
- **Version Display**: Accessory information now shows current plugin version (1.2.32 → 1.2.33)

### Technical Details
- **Issue**: HomeKit cached accessories from before v1.2.30 still showed house icon
- **Solution**: Force proper category assignment during cache restoration
- **Result**: All accessories now display as battery sensors regardless of cache state

## [1.2.32] - 2025-08-13

### Fixed
- **CRITICAL: Token Exhaustion Fix**: Serialize concurrent refresh attempts to prevent token invalidation
- **Token Rotation Conflicts**: Fixed multiple simultaneous API calls exhausting single-use refresh tokens
- **Concurrent Request Handling**: Added promise-based queuing for token refresh operations

### Technical Details
- **Root Cause**: Volvo rotates refresh tokens on every use, invalidating previous tokens
- **Issue**: Multiple concurrent API calls each tried to refresh tokens simultaneously
- **Solution**: Serialize all refresh attempts through single promise queue
- **Result**: Only one refresh attempt per token rotation cycle

### Added
- **Refresh Promise Queue**: Prevents concurrent token refresh attempts
- **Enhanced Logging**: Detailed token refresh serialization logging
- **Better Error Handling**: Improved debugging for token rotation conflicts

## [1.2.31] - 2025-08-13

### Fixed
- **Aggressive Token Refresh**: Implemented proactive token refresh for Volvo's short-lived tokens
- **Token Refresh Strategy**: Reduced refresh window from 5 to 3 minutes before expiry
- **Token Expiry Buffer**: Increased buffer from 5 to 15 minutes for more aggressive refresh
- **Invalid Token Handling**: Clear cached tokens when refresh tokens become invalid

### Changed
- **Token Lifecycle**: Much more aggressive refresh strategy to handle Volvo's very short token lifespans
- **Error Recovery**: Better handling when refresh tokens expire, forcing clean re-authentication
- **Logging**: Enhanced debug logging for token refresh operations and failure scenarios

## [1.2.30] - 2025-08-13

### Fixed
- **OAuth Token Handling**: Fixed issue where plugin used cached/old refresh tokens instead of config values
- **HomeKit Display**: Resolved "Not Supported" status by setting proper accessory category and primary service
- **Token Refresh**: Fixed token refresh failures by properly passing refresh token to API client
- **TypeScript Compilation**: Fixed build errors related to missing refreshToken property

### Added
- **Enhanced Error Handling**: Detailed OAuth error messages with specific troubleshooting guidance
- **Token Debugging**: Added comprehensive logging for token operations and debugging
- **Test Script**: New `test-refresh-token.js` script for validating refresh token status
- **Custom UI Improvements**: Better config loading with enhanced error handling and logging

### Changed
- **Accessory Category**: Set to SENSOR for proper HomeKit recognition instead of default
- **Battery Service**: Configured as primary service with enhanced characteristics and properties
- **Device Information**: Improved manufacturer, model, and firmware version reporting
- **API Client**: Enhanced token passing and error handling throughout the OAuth flow

## [1.2.28] - 2025-08-12

### Fixed
- **Outdated Error Messages**: Updated platform error messages to show Method 3 (Postman) setup instead of complex SSH instructions
- **User Experience**: Error logs now provide immediate, actionable Postman setup instructions
- **Documentation Alignment**: Error messages now match the recommended Method 3 approach in README

### Added
- **Enhanced Custom UI**: New "Alternative: Quick Postman Setup" section in Homebridge Config UI X
- **Manual Token Entry**: Direct token input field in custom UI for users who get tokens via Postman
- **Collapsible Instructions**: Detailed step-by-step Postman setup guide within the UI
- **Visual Hierarchy**: Green-highlighted section emphasizing the manual approach as recommended

### Changed
- **Error Message Content**: Platform startup errors now show 10-step Postman process instead of 5-step SSH process
- **Custom UI Layout**: Added prominent manual setup section alongside existing automated OAuth flow
- **User Guidance**: Clear explanation of why manual setup works well for personal use (10K daily API calls)

### Technical Implementation
- Updated platform.ts error messages with complete Postman OAuth2 configuration
- Added manual token validation and integration in custom UI JavaScript
- Enhanced UI with Bootstrap accordion for organized instruction display
- Maintained backward compatibility with existing OAuth flows

## [1.2.27] - 2025-08-12

### Added
- **Robust Token Rotation**: Full support for OAuth refresh token rotation with dual storage strategy
- **Manual Setup Guide**: New "Method 3" in README for quick Postman-based token setup
- **Enhanced Token Storage**: Automatic backup of refresh tokens to both file and config.json
- **Smart Token Precedence**: Intelligent token selection (stored > config) for seamless rotation

### Fixed
- **ESLint Configuration**: Resolved all linting issues and improved Node.js environment support
- **TypeScript Compilation**: Fixed Logger type issues and improved type safety
- **Token Persistence**: Ensures refresh tokens survive plugin restarts and Homebridge updates
- **Code Quality**: Fixed trailing commas, unused variables, and type assertions

### Changed
- **README Structure**: Added comprehensive manual token approach for personal use
- **Development Workflow**: Cleaned up test files and streamlined development setup
- **Token Management**: Improved error handling and fallback strategies for token refresh

### Removed
- **Test Files**: Cleaned up temporary OAuth test scripts and development artifacts
- **Debug Code**: Removed unused diagnostic and test files from working directory

### Technical Implementation
- Dual token storage strategy (JSON file + optional config.json update)
- Token precedence logic: stored tokens take priority over config tokens
- Automatic config.json updates when refresh tokens rotate
- Enhanced error handling with graceful fallbacks

## [1.2.26] - 2025-08-12

### Added
- **PRODUCTION OAuth Setup**: Complete production OAuth flow for real EX30 vehicles
- **Production Setup Script**: `scripts/production-oauth-setup.js` for real vehicle authentication
- **Comprehensive Documentation**: Updated CLAUDE.md with official Volvo reference material
- **Production Setup Guide**: Detailed guide for accessing real EX30 vehicles vs demo vehicles

### Fixed
- **Developer vs Production Separation**: Clear distinction between sandbox and production environments
- **Real Vehicle Access**: Tools and documentation for connecting to actual EX30 vehicles
- **Production Requirements**: Comprehensive guide for production application approval

### Changed
- **Documentation Structure**: Updated CLAUDE.md with official Volvo OAuth2 patterns and API specifications
- **Security Guidelines**: Enhanced security considerations for production use
- **Environment Configuration**: Support for production credentials via environment variables

### Technical Implementation
- Production OAuth script with endpoint discovery and PKCE compliance
- Comprehensive validation for production vs developer configuration
- Real vehicle testing with Energy API v2 validation
- Enhanced error handling and troubleshooting for production issues

### Developer Resources
- Official Volvo OAuth2 sample integration patterns
- Energy API v2 specification compliance
- Production application setup requirements
- Comprehensive troubleshooting guide for real vehicle integration

This release provides the complete toolchain for transitioning from demo/sandbox testing to production use with real EX30 vehicles.

## [1.2.25] - 2025-08-12

### Fixed
- **CRITICAL**: Updated custom UI server OAuth2 flow to follow official Volvo implementation pattern
- Enhanced PKCE implementation with proper RFC 7636 compliance
- Added OpenID Connect endpoint discovery following Volvo's official sample
- Improved session management and error handling in custom UI server
- Added health check endpoint (`/health`) for better debugging

### Changed
- OAuth2 flow now uses discovered endpoints from Volvo ID `.well-known/openid_configuration`
- Enhanced authorization URL generation with proper endpoint discovery
- Token exchange now uses discovered token endpoint for better reliability
- Improved debugging and logging throughout OAuth flow

### Technical Implementation
- Follows official Volvo developer portal OAuth2 sample pattern
- Added endpoint discovery via OpenID Connect well-known configuration
- Enhanced PKCE code verifier and challenge generation with better compliance
- Better session data management including discovered endpoints
- Comprehensive error handling and logging for debugging custom UI server loading issues

## [1.2.23] - 2025-08-12

### Changed
- **BREAKING**: Migrated from legacy Connected Vehicle API v1 to modern Energy API v2
- API base URL updated to `https://api.volvocars.com/energy/v2`
- Endpoints updated to `/vehicles/{vin}/capabilities` and `/vehicles/{vin}/state`
- Removed legacy API mapping code in favor of native Energy API v2 responses

### Improved
- **Performance**: Direct Energy API v2 integration eliminates response mapping overhead
- **Data Quality**: Access to complete energy state data structure as designed by Volvo
- **Feature Support**: Full support for all Energy API v2 features including charging power, connection status, and advanced charging metrics
- **API Compliance**: Implementation now matches official Volvo Energy API specification exactly

### Technical Details
- Energy state endpoint now returns native API response with proper status/value/updatedAt structure
- Capabilities endpoint provides accurate feature support detection per vehicle
- Enhanced logging shows complete API responses for better debugging
- Maintained OAuth scopes compatibility with both legacy `conve:*` and modern `energy:*` scopes

This release aligns the plugin with Volvo's official Energy API v2 specification and should provide more reliable and comprehensive vehicle data.

## [1.2.22] - 2025-08-11

### Fixed
- **DEBUG**: Added raw response text logging before JSON parsing
- **DEBUG**: Enhanced server-side request/response logging 
- **DEBUG**: Better error messages for JSON parsing failures
- **DEBUG**: Shows exact response content that fails to parse

### Root Cause Investigation  
- Server IS responding (status 200) but response isn't valid JSON
- Added detailed logging to see what server actually returns
- Enhanced debugging to identify JSON parsing issues vs server loading issues

## [1.2.21] - 2025-08-11

### Fixed
- **DEBUG**: Added custom UI server connectivity test on page load
- **DEBUG**: Enhanced error handling to detect HTML vs JSON responses
- **DEBUG**: Better error messages when custom server isn't loading
- **DEBUG**: Identifies when requests fall back to main Homebridge UI

### Root Cause Investigation
- Server loading issue persists despite Mercedes pattern implementation
- Added diagnostics to help identify if server.js is being executed at all
- Enhanced client-side debugging to show actual server responses

## [1.2.20] - 2025-08-11

### Fixed
- **CRITICAL**: Complete refactor to Mercedes plugin pattern with current plugin-ui-utils v1.0.3
- Simplified server.js to follow proven working patterns from homebridge-mercedesme
- Replaced complex callback server with simple manual OAuth code entry
- Removed all complex polling, callback handling, and error wrappers
- Two-step OAuth flow: /authCode generates URL → /authToken exchanges code

### Changed
- OAuth flow now matches Mercedes plugin: generate URL → manual code entry → token exchange
- Simplified request handlers use modern async/return pattern for v1.0.3 compatibility
- Removed HTTP callback server in favor of reliable manual code extraction
- Frontend simplified to clear two-step process with better user guidance

### Technical Implementation
- Server class follows working Mercedes pattern with direct instantiation
- Endpoints: /authCode, /authToken, /config, /test for debugging
- PKCE implementation maintained for Volvo API security requirements
- Enhanced logging throughout for better debugging of server loading issues

## [1.2.18] - 2025-08-11

### Fixed
- **CRITICAL**: Added missing `displayName` field in package.json required for custom UI plugins
- Custom UI server should now be loaded by Homebridge properly
- Added funding metadata for better npm package information

### Root Cause
- Homebridge was not loading our custom UI server because package.json was missing required fields
- This caused all OAuth requests to fall back to main Homebridge UI (returning HTML instead of JSON)

## [1.2.17] - 2025-08-11

### Added
- Diagnostic `/test` endpoint to verify custom UI server initialization
- Test endpoint returns JSON status to confirm server is running

### Fixed
- Identified issue: custom plugin UI server may not be initializing properly
- Server falling back to main Homebridge UI instead of custom endpoints

## [1.2.16] - 2025-08-11

### Added
- Server-side error handling wrapper for all OAuth endpoints
- Initialization logging to track plugin UI server startup
- Enhanced error logging with full stack traces for debugging

### Fixed
- Server crashes now return JSON error responses instead of HTML pages
- "Unrecognized token '<'" JSON parsing errors caused by HTML error pages
- OAuth endpoints now properly handle and report server-side errors

## [1.2.15] - 2025-08-11

### Added
- Detailed debugging for JSON parsing errors in OAuth flow
- Raw server response logging to identify response format issues
- Content-type header logging to debug non-JSON responses
- Enhanced error handling for server responses that aren't valid JSON

### Fixed
- Better error messages when server returns HTML instead of JSON
- Improved debugging for "The string did not match the expected pattern" errors

## [1.2.14] - 2025-08-11

### Changed
- Simplified OAuth implementation with targeted debugging for better troubleshooting
- Removed excessive validation and logging that was interfering with OAuth flow
- Enhanced client-side and server-side debugging to identify specific failure points

### Fixed
- OAuth token exchange debugging now shows session storage, state verification, and token exchange details
- Streamlined authorization request handling while maintaining security
- Improved error identification for OAuth troubleshooting

## [1.2.13] - 2025-08-11

### Added
- Comprehensive debugging for OAuth UI server initialization and request handling
- Request interceptor to log all incoming requests
- Enhanced error handling around server initialization

## [1.2.12] - 2025-08-11

### Fixed
- OAuth validation debugging and relaxed validation rules
- Reduced minimum length validation for client credentials
- Added detailed logging for OAuth authorization requests

## [1.2.11] - 2025-08-11

### Changed
- VIN input placeholder in configuration UI changed from example VIN to generic text for privacy

## [1.2.10] - 2025-08-11

### Fixed
- OAuth token exchange error "The string did not match the expected pattern"
- Missing `redirectUri` variable in server-side token exchange function
- Base64url encoding compatibility with older Node.js versions

### Security
- Enhanced PKCE implementation with manual base64url encoding for broader compatibility
- Improved OAuth session validation and error handling

## [1.2.9] - 2025-08-11

### Changed
- CHANGELOG.md format restructured to comply with Keep a Changelog v1.0.0 standard
- Reorganized changelog entries to use proper sections (Added, Changed, Fixed, Removed, Security)

### Fixed
- Changelog format compliance issues
- Duplicate entries and inconsistent formatting in previous versions

## [1.2.8] - 2025-08-11

### Changed
- CHANGELOG.md format restructured to comply with Keep a Changelog v1.0.0 standard
- Reorganized changelog entries to use proper sections (Added, Changed, Fixed, Removed, Security)
- Removed custom non-standard sections for better tooling compatibility

### Fixed
- Changelog format compliance issues
- Duplicate entries and inconsistent formatting in previous versions

## [1.2.7] - 2025-08-11

### Added
- Web Crypto API-based PKCE generation to custom UI frontend
- Enhanced credential format validation to prevent common setup errors
- Better error messages for OAuth issues (expired codes, PKCE requirements)

### Changed
- Updated custom UI to use correct `conve:*` OAuth scopes matching main codebase
- Enhanced validation and error handling for API credentials in custom UI
- Improved user experience with seamless, secure OAuth setup in custom UI

### Fixed
- Complete PKCE implementation in Homebridge Config UI X custom interface
- Custom UI now properly generates and uses PKCE parameters for secure authentication
- Redirect URI handling consistency across all OAuth implementations
- "code_challenge is required" error in custom UI OAuth flow

### Security
- All OAuth flows (main code, standalone script, custom UI) now use PKCE for enhanced security
- Updated custom UI server endpoints to support PKCE token exchange
- Synchronized OAuth scopes across all implementations

## [1.2.6] - 2025-08-11

### Added
- PKCE support to `scripts/oauth-setup.js` standalone script

### Changed
- Synchronized PKCE implementation across all OAuth handlers

### Fixed
- OAuth setup script now includes PKCE support
- Discrepancy between compiled TypeScript and standalone JavaScript OAuth code
- Script consistency - OAuth setup script now matches main codebase implementation

## [1.2.5] - 2025-08-11

### Added
- PKCE (Proof Key for Code Exchange) support to OAuth flow
- Crypto-based PKCE parameter generation (code_verifier, code_challenge)
- Required PKCE parameters to authorization URL
- Code verifier parameter to token exchange

### Changed
- Enhanced OAuth security with proper PKCE parameter generation
- Improved OAuth security compliance with modern standards

### Fixed
- "code_challenge is required" error from Volvo OAuth
- OAuth authentication flow now properly generates PKCE parameters for secure authentication

## [1.2.4] - 2025-08-04

### Added
- Compatibility with legacy Connected Vehicle API scopes
- Support for custom redirect URIs including GitHub repository URLs
- Graceful fallback from modern Energy API v2 to legacy Connected Vehicle API v1
- Legacy API response mapping to maintain interface compatibility
- Enhanced error handling for unsupported legacy API features

### Changed
- OAuth scopes updated from modern format to legacy `conve:*` format for broader compatibility
- API endpoints now use Connected Vehicle API v1 endpoints with fallback capability
- OAuth setup process now prompts for custom redirect URIs
- Backward compatibility maintained for existing configurations

### Fixed
- OAuth scope compatibility updated to match `conve:*` format for approved Volvo applications
- Legacy API integration now maps responses to modern format for seamless compatibility
- Custom redirect handling enhanced for non-localhost redirect URIs

## [1.2.3] - 2025-08-03

### Changed
- OAuth scopes updated to match exact scopes approved in Volvo Developer Portal application
- Scope names changed to: `openid energy:state:read energy:capability:read`

### Fixed
- OAuth authorization request validation errors (400 Bad Request)
- Removed unsupported scopes that were causing OAuth failures

## [1.2.2] - 2025-08-03

### Changed
- OAuth redirect URI changed from localhost to GitHub repository URL to comply with Volvo API requirements
- Restored manual code entry flow since Volvo doesn't allow localhost redirects
- Enhanced UI with step-by-step guidance for code extraction from browser address bar

### Fixed
- Redirect URI updated to meet Volvo Developer Portal publishing requirements

### Removed
- Automatic callback polling (not compatible with non-localhost redirects)

## [1.2.1] - 2025-08-03

### Added
- **RELEASE_NOTES.md**: Added dedicated release notes file for Homebridge Config UI X
- **GitHub Release Notes**: Enhanced GitHub release with comprehensive release information
- **Release Documentation**: Better formatted release notes for plugin managers

### Improved
- **Homebridge Integration**: Better compatibility with Homebridge Config UI X release note display
- **Documentation Structure**: Clearer separation between changelog and release notes

## [1.2.0] - 2025-08-03

### Added
- **Automatic OAuth Callback Server**: Runs temporary localhost:3000 server during OAuth setup
- **Zero-Click Token Capture**: Automatically captures authorization code without user intervention
- **Real-time OAuth Status**: Live polling and automatic UI updates during authorization
- **Beautiful Success Page**: Custom success page displayed after authorization
- **Smart Error Handling**: Automatic detection and display of OAuth errors
- **Auto-timeout Protection**: OAuth server automatically stops after 10 minutes

### Improved
- **User Experience**: Completely eliminates manual code copying and pasting
- **Setup Flow**: Streamlined from 4 steps to 2 steps with automation
- **Error Prevention**: No more "paste the wrong code" or "where do I find the URL" issues
- **Mobile Friendly**: Works seamlessly with phone/tablet authorization
- **Professional Feel**: Enterprise-grade OAuth flow experience

### Technical Features
- **Callback Server**: HTTP server on localhost:3000 for OAuth redirects
- **Event-Driven Updates**: Real-time UI updates via server-sent events
- **Polling Mechanism**: Checks for callback every 2 seconds
- **Resource Management**: Automatic cleanup of servers and intervals
- **Error Recovery**: Graceful handling of server conflicts and timeouts

### User Flow (New)
1. **Click "Start OAuth"** → Server starts automatically
2. **Click authorization URL** → Authorize in browser
3. **Done!** → Token appears automatically, no manual steps

This release transforms the OAuth experience from a technical process requiring manual code extraction to a completely automated, professional-grade authorization flow.

## [1.1.1] - 2025-08-03

### Fixed
- **Changelog Detection**: Added proper package.json metadata for Homebridge Config UI X
- **Repository Links**: Added repository, bugs, and homepage URLs
- **File Manifest**: Explicitly included CHANGELOG.md in published package files
- **Metadata Compliance**: Enhanced package.json for better npm and Homebridge integration

## [1.1.0] - 2025-08-03

### Added
- **Custom Configuration UI**: Brand new web-based configuration interface
- **Integrated OAuth Flow**: Complete OAuth setup directly in Homebridge Config UI X
- **Visual Setup Wizard**: Step-by-step guided configuration process
- **One-Click Authorization**: Generate and handle OAuth URLs within the UI
- **Real-time Validation**: Instant feedback on configuration inputs
- **Token Management**: Secure refresh token generation and storage

### Features
- **Browser-Based Setup**: No more command-line OAuth setup required
- **Visual Progress**: Clear step indicators for OAuth process
- **Auto-Configuration**: Automatically saves settings to Homebridge config
- **Error Handling**: User-friendly error messages and troubleshooting
- **Mobile Friendly**: Responsive design works on all devices

### Improved
- **User Experience**: Eliminated need for SSH or terminal access
- **Setup Process**: Reduced setup time from ~10 minutes to ~2 minutes
- **Documentation**: Added custom UI guidance to configuration schema

## [1.0.3] - 2025-08-03

### Fixed
- **OAuth Setup Compatibility**: Fixed "tsc: not found" error in Homebridge environments
- **Build Dependencies**: OAuth setup no longer requires TypeScript compilation
- **Runtime Compatibility**: Added pre-built JavaScript version of OAuth setup script

### Changed
- OAuth setup now uses `scripts/oauth-setup.js` instead of building TypeScript source
- Removed build dependency from `npm run oauth-setup` command
- Improved compatibility with restricted Homebridge environments

## [1.0.2] - 2025-08-03

### Improved
- **Documentation**: Enhanced README with detailed Raspberry Pi OAuth setup instructions
- **OAuth Setup Guide**: Added step-by-step process for SSH access and token generation
- **Troubleshooting**: Expanded troubleshooting section with OAuth-specific error solutions
- **User Experience**: Clearer guidance for browser authorization and code extraction

### Added
- Raspberry Pi specific setup instructions with exact commands
- OAuth troubleshooting section with common error solutions
- Browser authorization workflow documentation
- Token security warnings and best practices

## [1.0.1] - 2025-08-03

### Fixed
- **OAuth Flow Error Handling**: Added proper error messages and setup instructions when refresh token is missing
- **Platform Initialization**: Improved logging to help users understand OAuth setup requirements
- **Token Management**: Fixed issue where missing refresh token would cause silent failures

### Added
- Clear instructions in logs for running OAuth setup on Raspberry Pi
- Better error messages pointing to setup documentation
- Automatic token refresh initialization when refresh token is provided

### Improved
- Enhanced logging output with emojis and formatted instructions
- More helpful error messages for missing configuration

## [1.0.0] - 2025-08-03

### Added
- **Initial Release**: Complete Homebridge plugin for Volvo EX30 integration
- **Battery Monitoring**: HomeKit integration showing battery level, charging status, and low battery alerts
- **Energy API Client**: Full integration with Volvo Energy API v2
- **OAuth2 Authentication**: Secure authentication with Volvo ID using official APIs
- **Rate Limiting**: Built-in protection against API rate limits (100 requests/minute)
- **Multi-Region Support**: Support for EU and NA regions
- **Configuration Schema**: Homebridge Config UI X integration with form-based setup
- **OAuth Setup Helper**: Interactive command-line tool for obtaining refresh tokens
- **Comprehensive Documentation**: Complete setup guide and troubleshooting information

### Features
- Battery level monitoring (0-100%)
- Charging state detection (charging/not charging)
- Low battery alerts when ≤20%
- Configurable polling intervals (1-60 minutes)
- Intelligent caching to minimize API calls
- Automatic token refresh handling
- Error handling and retry logic

### Requirements
- Homebridge v1.6.0 or higher
- Node.js 18.0.0 or higher
- Volvo EX30 with connected services
- Volvo Developer Portal account with API credentials