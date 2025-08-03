# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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