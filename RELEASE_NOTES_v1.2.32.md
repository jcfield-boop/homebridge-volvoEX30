# Release Notes v1.2.32 - CRITICAL Token Rotation Fix

## 🚨 **URGENT CRITICAL FIX**

This release addresses a **critical token exhaustion bug** that was causing immediate refresh token failures. This is a **must-update release** for all users.

## 🔍 **Root Cause Discovery**

After analyzing Volvo's official OAuth documentation, we discovered the real issue:

### **Volvo's Token Rotation System**
- **Volvo rotates refresh tokens on EVERY use** (security feature)
- **Each successful refresh invalidates the old token**
- **Refresh tokens are valid for 7 days** if properly rotated
- **Multiple concurrent API calls = token exhaustion**

### **The Problem Pattern**
```
1. Plugin starts up
2. Makes multiple concurrent API calls (capabilities, energy state, etc.)
3. Each call tries to refresh the same token simultaneously
4. First refresh succeeds → invalidates token
5. All other concurrent refreshes fail with "invalid token"
6. User sees "token expired immediately"
```

## 🛠️ **The Fix: Token Refresh Serialization**

### **What We Implemented**
- **Promise-based queuing**: All concurrent refresh attempts wait for single refresh
- **Serialized token operations**: Only one refresh at a time
- **Enhanced logging**: Better visibility into token rotation process

### **Technical Implementation**
```typescript
// Before: Multiple concurrent refreshes (BAD)
call1: refreshAccessToken(token) // ✅ Success, token rotated
call2: refreshAccessToken(token) // ❌ Fails - token invalidated
call3: refreshAccessToken(token) // ❌ Fails - token invalidated

// After: Serialized refresh queue (GOOD) 
call1: refreshAccessToken(token) // ✅ Success, token rotated
call2: await refreshPromise     // ✅ Waits, gets fresh token
call3: await refreshPromise     // ✅ Waits, gets fresh token
```

## 🎯 **What This Fixes**

### **Before v1.2.32**
- ❌ "Token refresh failed" errors within seconds
- ❌ Plugin requiring constant manual token updates  
- ❌ Tokens appearing to "expire immediately"
- ❌ Multiple concurrent refresh attempts

### **After v1.2.32**
- ✅ **Stable token rotation** following Volvo's 7-day lifecycle
- ✅ **Automatic token management** - no manual intervention needed
- ✅ **Proper concurrent request handling**
- ✅ **Serialized refresh operations**

## 📊 **Expected Behavior**

### **What You'll See in Logs**
```bash
# Multiple concurrent calls now properly queue:
🔄 Starting token refresh request...
🔄 Token refresh already in progress, waiting for completion...
🔄 Token refresh already in progress, waiting for completion...
✅ Successfully refreshed OAuth tokens
```

### **Long-term Operation**
- **Tokens rotate properly** every few API calls
- **7-day lifecycle** managed automatically  
- **No manual token refresh** required
- **Stable continuous operation**

## 🚀 **Upgrade Instructions**

### **Critical Update Required**
```bash
npm update -g homebridge-volvo-ex30
```

### **Get ONE Fresh Token**
1. **Use Postman method** (recommended) or OAuth script
2. **Update your config** with the fresh refresh token
3. **Restart Homebridge** 
4. **This should be the LAST manual token refresh needed**

### **Verify the Fix**
Monitor logs for:
- ✅ `Token refresh already in progress, waiting for completion...`
- ✅ `Successfully refreshed OAuth tokens`
- ❌ No more "token refresh failed" cascades

## 🔧 **Technical Details**

### **OAuth Flow Changes**
- **Added**: `refreshPromise: Promise<OAuthTokens> | null` 
- **Added**: Serialization logic to prevent concurrent refreshes
- **Enhanced**: Error handling and logging for token operations
- **Fixed**: Token exhaustion due to concurrent refresh attempts

### **Compatibility**
- ✅ **Backward compatible** - no config changes needed
- ✅ **Existing tokens work** - just need one fresh token to start
- ✅ **No breaking changes** - drop-in replacement

## ⚠️ **Important Notes**

### **For Users Still Experiencing Issues**
1. **Ensure you're on v1.2.32**: `npm list -g homebridge-volvo-ex30`
2. **Get a fresh token**: Old tokens may be exhausted
3. **Monitor logs**: Look for serialization messages
4. **Wait 24 hours**: Allow proper token rotation to establish

### **Known Limitations**
- **Still requires initial valid token**: Plugin can't generate tokens from nothing
- **7-day maximum**: Volvo's limit - tokens expire after 7 days of non-use
- **Manual re-auth needed**: If tokens expire completely

## 📈 **Performance Impact**

- **Positive**: Eliminates token refresh failures
- **Neutral**: Minimal overhead from promise queuing  
- **Improved**: More efficient API usage
- **Stable**: Predictable token lifecycle management

---

## 🎉 **Bottom Line**

**v1.2.32 should COMPLETELY solve the token refresh issues** by properly handling Volvo's token rotation system. After this update with a fresh token, the plugin should run continuously without manual token management.

**This is the fix we've been working toward - update immediately!**

---

**Full Changelog**: [View on GitHub](https://github.com/jcfield-boop/homebridge-volvoEX30/blob/main/CHANGELOG.md#1232---2025-08-13)