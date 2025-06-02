#!/bin/bash

# Time display script for jarvis topbar
# Shows current time in the topbar

JARVIS_BIN="./jarvis"

# Get current time and pipe it to jarvis
date "+%H:%M:%S" | "$JARVIS_BIN" --stdin --layout topbar

echo "Time updated in topbar" 