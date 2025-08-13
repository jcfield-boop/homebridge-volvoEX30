#!/bin/bash

# Cleanup Script for Volvo EX30 Plugin Storage Migration
# This script removes the old persist directory that was breaking other plugins

echo "🧹 Volvo EX30 Plugin Storage Cleanup"
echo "===================================="

# Set the homebridge directory (adjust if needed)
HOMEBRIDGE_DIR="/var/lib/homebridge"
OLD_PERSIST_DIR="$HOMEBRIDGE_DIR/persist/volvo-ex30"
NEW_TOKEN_FILE="$HOMEBRIDGE_DIR/volvo-ex30-tokens.json"

echo ""
echo "Checking for old storage directory..."

if [ -d "$OLD_PERSIST_DIR" ]; then
    echo "❌ Found problematic directory: $OLD_PERSIST_DIR"
    echo "   This directory was created by v1.2.34 and breaks other plugins"
    echo ""
    
    # Check if there are any token files in the old directory
    if [ -n "$(ls -A "$OLD_PERSIST_DIR" 2>/dev/null)" ]; then
        echo "📁 Directory contents:"
        ls -la "$OLD_PERSIST_DIR"
        echo ""
        echo "⚠️  Note: Any tokens in this directory will be migrated automatically"
        echo "   when the plugin starts (using config.json as fallback)"
    else
        echo "📁 Directory is empty"
    fi
    
    echo ""
    read -p "❓ Remove the problematic directory? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing $OLD_PERSIST_DIR..."
        rm -rf "$OLD_PERSIST_DIR"
        
        if [ ! -d "$OLD_PERSIST_DIR" ]; then
            echo "✅ Successfully removed old persist directory"
        else
            echo "❌ Failed to remove directory (check permissions)"
            exit 1
        fi
    else
        echo "⏩ Skipping removal"
        exit 0
    fi
else
    echo "✅ No problematic directory found"
fi

echo ""
echo "Checking for new storage file..."

if [ -f "$NEW_TOKEN_FILE" ]; then
    echo "✅ New token storage file exists: $NEW_TOKEN_FILE"
    echo "📊 File size: $(stat -f%z "$NEW_TOKEN_FILE" 2>/dev/null || stat -c%s "$NEW_TOKEN_FILE" 2>/dev/null || echo "unknown") bytes"
else
    echo "ℹ️  New token file doesn't exist yet (will be created on first token refresh)"
fi

echo ""
echo "🎉 Cleanup complete!"
echo ""
echo "Next steps:"
echo "1. Restart Homebridge"
echo "2. Verify Volvo EX30 plugin starts without errors"
echo "3. Verify other plugins (electromagnetic lock) work normally"
echo "4. Plugin will automatically migrate tokens from config.json"
echo ""
echo "If you see any issues, check the Homebridge logs for details."