# Homebridge Volvo EX30 Plugin Development Project

## Project Overview
Create a custom Homebridge plugin specifically for the Volvo EX30 using the modern Volvo Developer APIs. This plugin provides HomeKit integration for EX30 status monitoring and control.

## Official Volvo Developer Resources

### Primary References
- **Volvo Developer Portal**: https://developer.volvocars.com/
- **Official OAuth2 Sample**: https://github.com/volvo-cars/developer-portal-api-samples/tree/main/oauth2-code-flow-sample
- **Energy API v2 Specification**: Official specification confirms EX30 support
- **Developer Documentation**: https://developer.volvocars.com/apis/

### OAuth2 Implementation (Official Pattern)
Based on Volvo's official OAuth2 code flow sample:

#### Required Dependencies
```javascript
import * as client from "openid-client";
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
```

#### PKCE Flow Implementation
```javascript
// Generate PKCE parameters
let code_verifier = client.randomPKCECodeVerifier();
let code_challenge = await client.calculatePKCECodeChallenge(code_verifier);

// Discover OpenID configuration
let config = await client.discovery(
    new URL("https://volvoid.eu.volvocars.com"),
    clientId,
    clientSecret
);
```

#### Essential Endpoints
- **Authorization**: Discovered via `.well-known/openid_configuration`
- **Token Exchange**: Uses discovered token endpoint
- **OpenID Discovery**: `https://volvoid.eu.volvocars.com/.well-known/openid_configuration`

## EX30 API Support Status

### Energy API v2 (Primary API)
- ✅ **EX30 is officially supported** by Volvo's Energy API v2
- ✅ Base URL: `https://api.volvocars.com/energy/v2`
- ✅ Endpoints: `/vehicles/{vin}/capabilities`, `/vehicles/{vin}/state`
- ⚠️ **Requires specific OAuth scopes**: `energy:state:read energy:capability:read`

### Connected Vehicle API v2 (Legacy Support)
- ✅ Base URL: `https://api.volvocars.com/connected-vehicle/v2`
- ✅ Supports `conve:*` OAuth scopes
- ⚠️ Limited EX30 support (mainly for ICE vehicle compatibility)

### Approved OAuth Scopes (Production)
```
conve:fuel_status conve:climatization_start_stop conve:unlock 
conve:lock_status conve:lock openid energy:state:read 
energy:capability:read conve:battery_charge_level 
conve:diagnostics_engine_status conve:warnings
```

## Production vs Development Environment

### Development Environment
- **Access**: Demo vehicles only (`YV4952NA4F120DEMO`, `LPSEFAVS2NPOLDEMO`)
- **Vehicle Types**: ICE vehicles (2019 V60 II Diesel, etc.)
- **Limitations**: No real EX30 data, no Energy API v2 support for demo vehicles
- **Use Case**: OAuth flow testing, API structure validation

### Production Environment
- **Access**: Real customer vehicles (including EX30s)
- **Vehicle Types**: All vehicle types including electric vehicles
- **Requirements**: Production OAuth application with approved scopes
- **Use Case**: Real vehicle data, full Energy API v2 support

## Technical Architecture

### Core Components Implemented
1. ✅ **OAuth2 Authentication Handler** - Volvo ID authorization flow with PKCE
2. ✅ **API Client** - Energy API v2 and Connected Vehicle API v2 support
3. ✅ **HomeKit Service Mappings** - Battery, charging, locks, climate
4. ✅ **Configuration Schema** - Custom UI with OAuth setup
5. ✅ **Error Handling & Retry Logic** - Rate limits and API failures

### HomeKit Services Implemented

#### Battery Service
- Battery Level (SoC percentage from Energy API v2)
- Low Battery Warning (≤20%)
- Charging State (charging/not charging)

#### Lock Management  
- Current Lock State
- Target Lock State
- Lock/Unlock actions via Connected Vehicle API

#### Contact Sensors
- Door Status (Front Left, Front Right, Rear Left, Rear Right, Tailgate)
- Window Status
- Hood Status

#### Climate Control
- Current Temperature
- Target Temperature
- Heating/Cooling State
- Preclimatization Control

#### Vehicle Information
- Odometer Reading
- Electric Range
- Battery charge level and charging metrics

## API Implementation Details

### Energy API v2 Endpoints
```javascript
// Capabilities - Check what features are supported
GET https://api.volvocars.com/energy/v2/vehicles/{vin}/capabilities

// Energy State - Get current battery/charging status  
GET https://api.volvocars.com/energy/v2/vehicles/{vin}/state
```

### Required Headers
```javascript
{
    'Authorization': 'Bearer {access_token}',
    'vcc-api-key': '{your_vcc_api_key}',
    'Accept': 'application/json'
}
```

### Rate Limits
- **API Calls**: 100 requests/minute per user per application
- **Control Actions**: 10 requests/minute (lock/unlock, climate control)

## OAuth2 Flow for Production

### Step 1: Application Setup
1. Create production application in Volvo Developer Portal
2. Configure redirect URIs (cannot use localhost in production)
3. Request approval for required scopes
4. Obtain Client ID, Client Secret, and VCC API Key

### Step 2: Vehicle Registration
1. Vehicle owner must authenticate with their Volvo ID
2. Vehicle must be registered to the user's Volvo account
3. User must authorize the application to access their vehicle data

### Step 3: Token Management
1. Initial authorization code exchange for access/refresh tokens
2. Access tokens expire (typically 5 minutes)
3. Use refresh tokens to obtain new access tokens
4. Store refresh tokens securely for long-term access

## Development Status (Current)

### Phase 1: Foundation ✅ COMPLETED
- ✅ TypeScript project structure
- ✅ OAuth2 authentication flow with PKCE
- ✅ Energy API v2 client implementation
- ✅ API connectivity testing
- ✅ Configuration schema with custom UI

### Phase 2: Core Services ✅ COMPLETED  
- ✅ Battery Service with SoC monitoring
- ✅ Lock Management service implementation
- ✅ Contact Sensors for doors/windows
- ✅ Error handling and retry logic
- ✅ Rate limiting compliance

### Phase 3: Advanced Features ✅ COMPLETED
- ✅ Climate Control services
- ✅ Vehicle information sensors
- ✅ Comprehensive logging and debugging
- ✅ Configuration validation

### Phase 4: Production Readiness 🔄 IN PROGRESS
- ✅ OAuth2 flow following official Volvo pattern
- ✅ Custom UI server with proper session management
- 🔄 Production OAuth flow for real EX30 vehicles
- ⏳ Real vehicle testing and validation
- ⏳ User documentation updates

## Current Challenges & Solutions

### Challenge 1: Custom UI Server Loading
**Issue**: Homebridge not loading custom UI server, OAuth requests falling back to main UI
**Status**: ✅ RESOLVED - Updated to follow official Volvo OAuth2 pattern

### Challenge 2: Demo vs Production Vehicle Access
**Issue**: Developer account only has demo vehicles, not real EX30s
**Status**: 🔄 IN PROGRESS - Setting up production OAuth flow

### Challenge 3: Energy API v2 Authorization
**Issue**: Demo vehicles don't support Energy API v2 endpoints
**Status**: ⏳ PENDING - Requires production vehicle testing

## Next Steps

1. **Production OAuth Setup**: Configure production application for real EX30 access
2. **Real Vehicle Testing**: Test with actual EX30 vehicle (`YV4EK3ZL4SS150793`)
3. **Energy API v2 Validation**: Confirm full Energy API v2 support with real EX30
4. **User Documentation**: Create setup guide for end users
5. **Release Management**: Publish stable version for production use

## API Testing Commands

### Test Vehicle List
```bash
curl -X GET "https://api.volvocars.com/connected-vehicle/v2/vehicles" \
  -H "authorization: Bearer {access_token}" \
  -H "vcc-api-key: {vcc_api_key}"
```

### Test Energy API v2
```bash  
curl -X GET "https://api.volvocars.com/energy/v2/vehicles/{vin}/state" \
  -H "authorization: Bearer {access_token}" \
  -H "vcc-api-key: {vcc_api_key}"
```

### Test OAuth Token Generation
```bash
node test-oauth.js  # Generate authorization URLs
node test-oauth.js [CODE]  # Exchange code for tokens
```

## Security Considerations

### Production Requirements
- ✅ PKCE (Proof Key for Code Exchange) implementation
- ✅ State parameter for CSRF protection  
- ✅ Secure token storage and refresh
- ✅ Rate limiting compliance
- ⚠️ Production redirect URIs (no localhost)
- ⚠️ Secure client secret management

### Homebridge Integration
- ✅ Custom UI server with session management
- ✅ Configuration validation and sanitization
- ✅ Error handling for API failures
- ✅ Automatic token refresh capability

---

*Last Updated: 2025-08-12*
*Version: 1.2.25*