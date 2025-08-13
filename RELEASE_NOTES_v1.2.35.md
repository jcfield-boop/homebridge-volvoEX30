# Release Notes v1.2.35 - Eliminate Plugin Conflicts

## 🚨 **CRITICAL FIX: Plugin Conflicts Resolved**

This release eliminates plugin conflicts that were causing system-wide Homebridge issues, while maintaining all token persistence functionality.

## 🔍 **Problem Identified**

### **The Conflict Issue**
- ❌ Multiple plugins using **different versions of node-persist**
- ❌ **Shared storage directories** causing interference
- ❌ **Electromagnetic lock plugin** and others experiencing storage errors
- ❌ **System-wide Homebridge instability** from storage conflicts

### **Root Cause**
```
homebridge-gpio-electromagnetic-lock/node_modules/node-persist
homebridge-volvo-ex30/node_modules/node-persist
```
Different plugins with different node-persist versions interfering with each other's storage operations.

## 🛠️ **The Complete Solution**

### **Conflict-Free Storage System**
- ✅ **Removed node-persist dependency** completely
- ✅ **Simple JSON file storage** using native Node.js fs operations
- ✅ **Isolated storage file**: `~/.homebridge/volvo-ex30-tokens.json`
- ✅ **Zero external dependencies** for storage

### **New Storage Architecture**
```
Before (Problematic):
~/.homebridge/persist/volvo-ex30/ (shared directory conflicts)

After (Clean):
~/.homebridge/volvo-ex30-tokens.json (isolated file)
```

## 🔧 **Technical Implementation**

### **Migration Strategy**
- **Automatic Migration**: Existing tokens automatically work with new system
- **No Manual Steps**: Plugin handles transition seamlessly
- **Graceful Fallback**: Uses config.json token if no stored token exists

### **Storage Format**
```json
{
  "refresh_token_YV4EK3ZL4SS150793": {
    "refreshToken": "TUofCkatt6jn...",
    "vin": "YV4EK3ZL4SS150793",
    "updatedAt": "2025-08-13T19:23:46.181Z",
    "source": "volvo-oauth-rotation"
  }
}
```

### **Dependencies Removed**
- ❌ `node-persist@^3.1.3` (causing conflicts)
- ❌ `@types/node-persist@^3.1.8` (no longer needed)

## 🎯 **Benefits**

### **System Stability**
- ✅ **No more plugin conflicts** with other Homebridge plugins
- ✅ **Eliminates storage errors** affecting electromagnetic lock and other plugins
- ✅ **Cleaner Homebridge environment** with isolated storage
- ✅ **Reduced system instability** from storage interference

### **Package Improvements**
- ✅ **Smaller package size** (removed dependencies)
- ✅ **Faster installation** (fewer dependencies to download)
- ✅ **Cleaner dependency tree** (native Node.js operations only)
- ✅ **Better compatibility** (no version conflicts)

### **Functionality Preserved**
- ✅ **All token persistence features** maintained
- ✅ **7-day token lifecycle** continues working
- ✅ **Automatic token rotation** unchanged
- ✅ **Restart safety** preserved

## 🚀 **HomeKit Improvements**

### **Enhanced Display**
- ✅ **Better accessory category** assignment for proper icons
- ✅ **Default Garage room** assignment for new accessories
- ✅ **Improved cached accessory** handling

### **Expected Results**
- 🔋 **Proper battery sensor icon** (working toward eliminating house icon)
- 🏠 **Default Garage assignment** for better organization

## 📊 **What You'll See**

### **New Log Messages**
```
💾 Token storage file: /var/lib/homebridge/volvo-ex30-tokens.json
✅ Token storage initialized successfully
💾 Stored refresh token for VIN YV4EK3ZL... (TUofCkatt6jn...)
```

### **Conflict Resolution**
- ✅ **No more node-persist errors** from other plugins
- ✅ **Clean Homebridge startup** without storage conflicts
- ✅ **Stable system operation** with isolated plugin storage

## 🔄 **Migration Process**

### **Automatic Migration**
1. **Update plugin**: `npm update -g homebridge-volvo-ex30`
2. **Restart Homebridge**: Plugin automatically migrates tokens
3. **First API call**: Triggers token refresh to new storage system
4. **Future operations**: Use new conflict-free storage

### **No Fresh Token Needed**
- ✅ **Existing config.json token** works for migration
- ✅ **Seamless transition** from old to new storage
- ✅ **Zero manual intervention** required

## 🎯 **Compatibility**

### **Homebridge Versions**
- ✅ **All supported versions**: Homebridge 1.6.0+
- ✅ **All Node.js versions**: 18.0.0+ supported
- ✅ **All operating systems**: Linux, macOS, Windows

### **Existing Installations**
- ✅ **Backward compatible**: No config changes needed
- ✅ **Existing tokens**: Continue working seamlessly
- ✅ **Old storage**: Can be safely deleted after migration

## 🧪 **Testing**

### **Verified Functionality**
- ✅ **Token storage and retrieval**
- ✅ **Token rotation and persistence**
- ✅ **Config fallback behavior**
- ✅ **Conflict-free operation**

Run test: `node scripts/test-token-storage.js`

## 🎉 **Bottom Line**

**v1.2.35 eliminates plugin conflicts** while maintaining all the token persistence functionality that makes the Volvo EX30 plugin reliable and maintenance-free.

### **For Users:**
- ✅ **Stable Homebridge** without plugin conflicts
- ✅ **Same great functionality** for your Volvo EX30
- ✅ **Zero maintenance** token management
- ✅ **Better system performance** with cleaner storage

### **For System Admins:**
- ✅ **Cleaner plugin environment** without storage conflicts
- ✅ **Easier troubleshooting** with isolated storage
- ✅ **Better system stability** with reduced plugin interference

**This is the definitive solution to plugin storage conflicts!**

---

**Full Changelog**: [View on GitHub](https://github.com/jcfield-boop/homebridge-volvoEX30/blob/main/CHANGELOG.md#1235---2025-08-13)