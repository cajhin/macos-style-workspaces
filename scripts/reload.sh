#!/bin/bash
# Quick reload script for extension development

EXT_UUID="fullscreen-to-empty-workspace2@cajhin"

echo "Reloading extension: $EXT_UUID"
gnome-extensions disable "$EXT_UUID" 2>&1
sleep 0.5
gnome-extensions enable "$EXT_UUID" 2>&1

echo ""
echo "Checking for NEW errors (last 5 seconds):"
journalctl -b --since "5 seconds ago" 2>&1 | grep -i "cajhin\|fullscreen-to-empty\|error.*extension" | tail -10
if [ $? -ne 0 ]; then
    echo "No new errors found!"
fi
