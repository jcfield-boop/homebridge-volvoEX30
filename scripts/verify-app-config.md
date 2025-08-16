# Volvo Developer Portal Application Configuration Verification

Since all OAuth URLs fail with "invalid request", there's likely a fundamental configuration issue. Please verify these exact settings in your Volvo Developer Portal:

## Critical Settings to Verify

### 1. Application Status
- **Current Status**: _______ (Draft/Published/Approved/etc.)
- **Expected**: Must be "Published" or "Approved"

### 2. Client Credentials
- **Displayed Client ID**: _______________________
- **Expected**: dc-towqtsl3ngkotpzdc6qlqhnxl
- **Match**: ☐ Exact match ☐ Different

### 3. Redirect URIs Configuration
**Listed Redirect URIs in your application:**
- URI 1: _______________________
- URI 2: _______________________
- URI 3: _______________________

**Expected**: Exactly `https://github.com/jcfield-boop/homebridge-volvoEX30`

**Common Issues:**
- ☐ Trailing slash: `https://github.com/jcfield-boop/homebridge-volvoEX30/`
- ☐ HTTP instead of HTTPS: `http://github.com/jcfield-boop/homebridge-volvoEX30`
- ☐ Case sensitivity: Different capitalization
- ☐ Extra parameters or fragments

### 4. Application Type
- **Current Type**: _______ (Web App/Native App/SPA/etc.)
- **Expected**: Web Application

### 5. OAuth Configuration
**Grant Types Enabled:**
- ☐ Authorization Code
- ☐ Implicit
- ☐ Client Credentials
- ☐ Other: _______

**Response Types Enabled:**
- ☐ code
- ☐ token
- ☐ id_token
- ☐ Other: _______

### 6. PKCE Settings
- **PKCE Required**: ☐ Yes ☐ No ☐ Optional
- **Code Challenge Methods**: _______ (S256/plain/both)

### 7. Scopes Status
For each scope, check the status:

**conve: scopes (24 total)**
- conve:fuel_status: ☐ Approved ☐ Pending ☐ Rejected
- conve:brake_status: ☐ Approved ☐ Pending ☐ Rejected
- conve:doors_status: ☐ Approved ☐ Pending ☐ Rejected
- conve:trip_statistics: ☐ Approved ☐ Pending ☐ Rejected
- conve:environment: ☐ Approved ☐ Pending ☐ Rejected
- conve:odometer_status: ☐ Approved ☐ Pending ☐ Rejected
- conve:honk_flash: ☐ Approved ☐ Pending ☐ Rejected
- conve:command_accessibility: ☐ Approved ☐ Pending ☐ Rejected
- conve:engine_status: ☐ Approved ☐ Pending ☐ Rejected
- conve:commands: ☐ Approved ☐ Pending ☐ Rejected
- conve:vehicle_relation: ☐ Approved ☐ Pending ☐ Rejected
- conve:windows_status: ☐ Approved ☐ Pending ☐ Rejected
- conve:navigation: ☐ Approved ☐ Pending ☐ Rejected
- conve:tyre_status: ☐ Approved ☐ Pending ☐ Rejected
- conve:connectivity_status: ☐ Approved ☐ Pending ☐ Rejected
- conve:battery_charge_level: ☐ Approved ☐ Pending ☐ Rejected
- conve:climatization_start_stop: ☐ Approved ☐ Pending ☐ Rejected
- conve:engine_start_stop: ☐ Approved ☐ Pending ☐ Rejected
- conve:lock: ☐ Approved ☐ Pending ☐ Rejected
- conve:diagnostics_workshop: ☐ Approved ☐ Pending ☐ Rejected
- conve:unlock: ☐ Approved ☐ Pending ☐ Rejected
- conve:lock_status: ☐ Approved ☐ Pending ☐ Rejected
- conve:diagnostics_engine_status: ☐ Approved ☐ Pending ☐ Rejected
- conve:warnings: ☐ Approved ☐ Pending ☐ Rejected

**openid scope**
- openid: ☐ Approved ☐ Pending ☐ Rejected

### 8. Environment/Region
- **Environment**: ☐ Sandbox ☐ Production ☐ Development
- **Region**: ☐ EU ☐ US ☐ Global ☐ Other: _______

### 9. Additional Restrictions
**Any additional restrictions or requirements?**
- IP whitelisting: ☐ Yes ☐ No
- Domain restrictions: ☐ Yes ☐ No  
- Rate limits: ☐ Yes ☐ No
- Approval pending: ☐ Yes ☐ No
- Other requirements: _______________________

## Common Issues That Cause "Invalid Request"

### Most Likely Causes:
1. **Application Status**: Still in "Draft" mode, not actually published
2. **Client ID Mismatch**: Copy/paste error or wrong application
3. **Redirect URI Exact Match**: Even a trailing slash difference fails
4. **Scopes Not Actually Approved**: Status shows "Pending" not "Approved"

### Less Common Causes:
5. **Environment Mismatch**: Using sandbox credentials in production endpoints
6. **PKCE Requirements**: Application requires PKCE but we're not using it properly
7. **Grant Type**: Authorization code grant not enabled
8. **Application Type**: Wrong type selected (should be Web Application)

## Next Steps

**If everything above looks correct:**
1. Try creating a completely new application
2. Use the simplest possible configuration
3. Test with minimal scopes first
4. Contact Volvo Developer Portal support

**Most likely fix:**
- Application is still in "Draft" status
- Client ID doesn't match exactly
- Redirect URI has subtle difference