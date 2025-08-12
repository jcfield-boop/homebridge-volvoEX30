# Production OAuth Setup Guide for Real EX30 Vehicles

This guide walks you through setting up OAuth authentication for your **real Volvo EX30** vehicle, not demo vehicles.

## Prerequisites

### 1. Volvo Account Requirements
- ✅ Your EX30 must be registered to your Volvo ID account
- ✅ Your EX30 must have connected services enabled
- ✅ You must have access to your Volvo ID credentials

### 2. Volvo Developer Portal Requirements
- ✅ **PRODUCTION** application (not developer/sandbox)
- ✅ Application approved for **production use**
- ✅ Energy API v2 scopes approved
- ✅ Production redirect URI configured (no localhost)

## Step 1: Create Production Application

1. **Log into Volvo Developer Portal**: https://developer.volvocars.com/
2. **Create NEW Application** (separate from any existing developer/sandbox apps)
3. **Select "Production" Environment** (not "Sandbox" or "Developer")
4. **Configure Application Settings**:
   - Name: "Homebridge EX30 Plugin - Production"
   - Description: "HomeKit integration for personal EX30 vehicle"
   - Application Type: "Web Application"

### Required OAuth Scopes
Request approval for these scopes:
```
openid
energy:state:read
energy:capability:read
conve:fuel_status
conve:battery_charge_level
conve:lock_status
conve:lock
conve:unlock
conve:climatization_start_stop
conve:diagnostics_engine_status
conve:warnings
```

### Redirect URI Configuration
**IMPORTANT**: Production applications cannot use `localhost` redirect URIs.

Options:
1. **Use your own domain**: `https://yourdomain.com/oauth/callback`
2. **Use GitHub Pages**: `https://yourusername.github.io/oauth-callback`
3. **Use the plugin's GitHub repo**: `https://github.com/jcfield-boop/homebridge-volvoEX30`

## Step 2: Application Approval Process

1. **Submit for Review**: After creating your application, submit it for production approval
2. **Wait for Approval**: This can take several business days
3. **Receive Credentials**: Once approved, you'll get:
   - Production Client ID
   - Production Client Secret  
   - Production VCC API Key

## Step 3: Configure Production OAuth

### Option A: Environment Variables (Recommended)
```bash
export VOLVO_PROD_CLIENT_ID="your_production_client_id"
export VOLVO_PROD_CLIENT_SECRET="your_production_client_secret"
export VOLVO_PROD_VCC_API_KEY="your_production_vcc_api_key"
export VOLVO_REDIRECT_URI="https://yourdomain.com/oauth/callback"
export VOLVO_VIN="YV4EK3ZL4SS150793"
export VOLVO_REGION="eu"
```

### Option B: Edit Script Directly
Edit `scripts/production-oauth-setup.js` and replace:
```javascript
const PRODUCTION_CONFIG = {
    clientId: 'your_actual_production_client_id',
    clientSecret: 'your_actual_production_client_secret', 
    vccApiKey: 'your_actual_production_vcc_api_key',
    vin: 'YV4EK3ZL4SS150793',
    region: 'eu',
    redirectUri: 'https://yourdomain.com/oauth/callback'
};
```

## Step 4: Run Production OAuth Setup

### Generate Authorization URL
```bash
cd "/path/to/homebridge-volvoEX30"
node scripts/production-oauth-setup.js
```

This will:
1. ✅ Validate your production configuration
2. ✅ Discover OAuth endpoints for your region
3. ✅ Generate PKCE parameters 
4. ✅ Create production authorization URL
5. ✅ Save session data for token exchange

### Authorize Application
1. **Open the generated URL** in your browser
2. **Sign in with your Volvo ID** (the account your EX30 is registered to)
3. **Review permissions** and authorize the application
4. **Get redirected** to your configured redirect URI
5. **Extract the code** parameter from the redirect URL

Example redirect:
```
https://yourdomain.com/oauth/callback?code=abc123xyz&state=def456
```
Copy the `code` value: `abc123xyz`

### Exchange Code for Tokens
```bash
node scripts/production-oauth-setup.js abc123xyz
```

This will:
1. ✅ Exchange authorization code for access/refresh tokens
2. ✅ Test API access with your real EX30
3. ✅ Verify Energy API v2 connectivity
4. ✅ Display your refresh token for Homebridge

## Step 5: Configure Homebridge

1. **Open Homebridge Config UI X**
2. **Find the Volvo EX30 plugin**
3. **Configure with production credentials**:
   - **VIN**: `YV4EK3ZL4SS150793`
   - **Client ID**: Your production client ID
   - **Client Secret**: Your production client secret
   - **VCC API Key**: Your production VCC API key
   - **Refresh Token**: From the OAuth setup output
   - **Region**: `eu` or `na`

## Troubleshooting

### "Configuration Issues Found"
- ❌ Make sure you're using **production** credentials, not developer/sandbox
- ❌ Verify all environment variables are set correctly
- ❌ Check that redirect URI is not localhost

### "Your EX30 not found in vehicle list"
- ❌ EX30 not registered to your Volvo account
- ❌ EX30 not connected to Volvo services
- ❌ Wrong Volvo ID account used for authorization
- ❌ Application not approved for your specific vehicle

### "Energy API v2 failed (403)"
- ❌ Missing `energy:state:read` scope approval
- ❌ Application still in sandbox/developer mode
- ❌ EX30 not enrolled in energy services
- ❌ Application not approved for Energy API v2

### "Invalid redirect URI"
- ❌ Redirect URI contains localhost (not allowed in production)
- ❌ Redirect URI doesn't match exactly what's registered
- ❌ Application not properly configured for production

## Production vs Developer Differences

| Aspect | Developer/Sandbox | Production |
|--------|------------------|------------|
| **Vehicle Access** | Demo vehicles only | Your real EX30 |
| **API Support** | Limited demo data | Full Energy API v2 |
| **Redirect URIs** | localhost allowed | Real domains only |
| **Approval Process** | Automatic | Manual review required |
| **Rate Limits** | Relaxed | Production limits |
| **Data Quality** | Simulated | Real vehicle data |

## Security Considerations

### Production Requirements
- ✅ Never commit production credentials to git
- ✅ Use environment variables for sensitive data
- ✅ Secure your redirect URI endpoint
- ✅ Rotate client secrets periodically
- ✅ Monitor API usage and rate limits

### Token Management
- ✅ Refresh tokens are long-lived (store securely)
- ✅ Access tokens expire quickly (~5 minutes)
- ✅ Homebridge plugin handles automatic token refresh
- ✅ Revoke tokens if compromised

## Support

### If OAuth Setup Fails
1. **Check Volvo Developer Portal** for application status
2. **Verify EX30 is registered** to your Volvo account
3. **Confirm scopes are approved** for production use
4. **Test with demo vehicles first** (if available)

### If Homebridge Integration Fails
1. **Verify refresh token** is correctly entered
2. **Check Homebridge logs** for specific errors
3. **Test API access** independently with production script
4. **Validate plugin configuration** in Config UI X

---

**Need Help?** 
- Volvo Developer Portal: https://developer.volvocars.com/support
- Plugin Issues: https://github.com/jcfield-boop/homebridge-volvoEX30/issues