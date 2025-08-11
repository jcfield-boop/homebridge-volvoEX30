# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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