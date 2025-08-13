# Release Notes v1.2.33 - HomeKit Display Fix

## 🖼️ **HomeKit Display Issue Resolved**

This release fixes the persistent HomeKit display issue where the Volvo EX30 accessory showed as "Not Supported" with a house icon instead of a proper battery sensor.

## 🔍 **Issue Identification**

### **The Problem**
- Users with accessories cached from before v1.2.30 still saw house icon
- "Not Supported" text persisted despite previous fixes
- HomeKit wasn't recognizing the device as a battery sensor

### **Root Cause**
- **Cached Accessory Category**: HomeKit cached accessories before the v1.2.30 sensor category fix
- **Category Not Applied**: Existing cached accessories didn't get the proper `Categories.SENSOR` assignment
- **HomeKit Cache Persistence**: HomeKit retained old accessory configuration

## 🛠️ **The Fix**

### **Enhanced Accessory Restoration**
```typescript
// Now explicitly sets category for cached accessories
if (existingAccessory) {
  // Ensure proper category is set (fix for HomeKit display issues)
  existingAccessory.category = this.api.hap.Categories.SENSOR;
  this.log.debug('✅ Set accessory category to SENSOR for proper HomeKit display');
}
```

### **What's Fixed**
- ✅ **Cached Accessory Category**: Forces proper sensor category during cache restoration
- ✅ **Version Synchronization**: Updates accessory firmware/software versions to current
- ✅ **Universal Coverage**: Works for both new and existing cached accessories

## 🎯 **Expected Results**

### **After Updating to v1.2.33**
- **Restart Homebridge** to apply the fix
- Device should display as **battery sensor** instead of house icon
- **"Not Supported" text disappears** completely
- Battery level prominently displayed in HomeKit

### **What You'll See**
```
Before: 🏠 "Volvo EX30" - Not Supported
After:  🔋 "Volvo EX30" - 73% battery level
```

## 📋 **Compatibility**

### **Token Requirements**
- ✅ **No fresh token needed**: Uses existing working token
- ✅ **No OAuth changes**: Pure HomeKit display fix
- ✅ **Backward compatible**: No config changes required

### **Update Process**
1. **Update plugin**: `npm update -g homebridge-volvo-ex30`
2. **Restart Homebridge**: Apply cached accessory fix
3. **Check HomeKit**: Should show as battery sensor immediately

## 📊 **Documentation Updates**

### **Enhanced README**
- ✅ **Token storage behavior** clearly explained
- ✅ **HomeKit display troubleshooting** updated
- ✅ **Version progression** documented

### **Key Clarifications Added**
- **Token Storage**: Refreshed tokens stay in memory only (not written to config.json)
- **7-Day Lifecycle**: Original config.json token valid for 7 days with regular use
- **Restart Behavior**: Plugin uses original config token after Homebridge restart

## 🎉 **Summary**

**v1.2.33 completes the HomeKit integration fixes** by ensuring all accessories (new and cached) display properly as battery sensors. Combined with the v1.2.32 token serialization fix, your Volvo EX30 plugin should now work flawlessly!

---

**Full Changelog**: [View on GitHub](https://github.com/jcfield-boop/homebridge-volvoEX30/blob/main/CHANGELOG.md#1233---2025-08-13)