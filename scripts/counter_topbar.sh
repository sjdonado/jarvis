#!/bin/bash

# Counter script for jarvis topbar
# This script maintains a counter and displays it in the topbar

COUNTER_FILE="/tmp/jarvis_counter.txt"
JARVIS_BIN="./jarvis"

# Initialize counter if file doesn't exist
if [[ ! -f "$COUNTER_FILE" ]]; then
    echo "0" > "$COUNTER_FILE"
fi

# Read current counter value
COUNTER=$(cat "$COUNTER_FILE")

# Increment counter
COUNTER=$((COUNTER + 1))

# Save new counter value
echo "$COUNTER" > "$COUNTER_FILE"

# Display counter in topbar
echo "Count: $COUNTER" | "$JARVIS_BIN" --stdin --layout topbar

echo "Counter updated to: $COUNTER" 