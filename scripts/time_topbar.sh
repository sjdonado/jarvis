#!/bin/bash

JARVIS_BIN="./jarvis"

date "+%H:%M:%S" | "$JARVIS_BIN" --stdin --layout topbar

echo "Time updated in topbar" 
