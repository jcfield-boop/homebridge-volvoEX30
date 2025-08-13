# Release Notes v1.2.31 - Critical Token Refresh Fix

## 🔄 **Major Token Management Improvements**

This release addresses the critical issue where Volvo's refresh tokens expire much faster than expected, causing frequent "token refresh failed" errors.

### **Root Cause Analysis**
Volvo's OAuth tokens appear to have very short lifespans (possibly minutes instead of the typical hours), requiring much more aggressive refresh strategies than standard OAuth implementations.

### **Fixed Issues**
- ❌ **"Refresh token is invalid or expired"** errors → ✅ **Fixed with aggressive refresh**
- ❌ **Token refresh failures during normal operation** → ✅ **Fixed with proactive refresh**
- ❌ **Plugin requiring manual token refresh** → ✅ **Fixed with automatic management**

## 🛠️ **Technical Improvements**

### **Proactive Token Refresh**
- **Before**: Only refreshed tokens when they expired (too late)
- **After**: Proactively refreshes tokens 3 minutes before expiry
- **Result**: Prevents token expiration during API calls

### **Aggressive Refresh Strategy**
- **Increased buffer**: From 5 to 15 minutes before expiry
- **Shorter refresh window**: Refresh when tokens have 3+ minutes left
- **Better detection**: More reliable token expiry detection

### **Enhanced Error Recovery**
- **Invalid token handling**: Automatically clears bad refresh tokens
- **Clean re-authentication**: Forces fresh auth flow when needed
- **Detailed logging**: Better debugging information for token operations

### **Smart Refresh Logic**
```
Token Lifetime: ~5 minutes (Volvo's actual behavior)
├── 0-2 minutes: Fresh token, no action needed
├── 2-3 minutes: Proactive refresh triggered
├── 3-4 minutes: Aggressive refresh if previous failed
└── 4+ minutes: Expired, force refresh
```

## 🚀 **What You'll See**

### **In Logs (Debug Level)**
```
🔄 Refreshing token - reason: proactive refresh (Volvo tokens are short-lived)
✅ Token refreshed successfully
```

### **Improved Reliability**
- Fewer "token refresh failed" errors
- Smoother API operations
- Less manual intervention required

## 📋 **Upgrade Instructions**

1. **Update the plugin:**
   ```bash
   npm update -g homebridge-volvo-ex30
   ```

2. **Get a fresh refresh token ONE MORE TIME:**
   - Use Postman method (recommended)
   - Or run the OAuth setup script
   - This should be the LAST manual token refresh needed

3. **Monitor the logs:**
   - Should see successful proactive refreshes every few minutes
   - No more "invalid or expired" token errors

4. **For HomeKit display issues:**
   - Remove accessory from HomeKit app
   - Restart Homebridge
   - Re-add accessory for proper icon/status

## 🔍 **Advanced Configuration**

If you're still experiencing token issues, you can enable debug logging:
```json
{
  "platforms": [
    {
      "platform": "VolvoEX30",
      "_bridge": {
        "username": "...",
        "port": 12345
      }
    }
  ],
  "accessories": [],
  "disableIpc": false
}
```

## 🎯 **Expected Results**

After this update:
- ✅ Plugin should run continuously without token errors
- ✅ Automatic token refresh every 2-3 minutes
- ✅ No more manual token management required
- ✅ Stable API connectivity to your EX30

## 🔗 **Related Issues**

This release specifically addresses:
- OAuth token refresh failures
- Short-lived Volvo token handling
- Automatic token lifecycle management
- API reliability improvements

---

**⚠️ Note**: This is a critical stability fix. Update is highly recommended for all users experiencing token refresh issues.

**Full Changelog**: [View on GitHub](https://github.com/jcfield-boop/homebridge-volvoEX30/blob/main/CHANGELOG.md#1231---2025-08-13)