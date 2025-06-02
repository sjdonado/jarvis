#!/bin/bash

JARVIS_BIN="/home/sjdonado/jarvis/jarvis"

calculate_days() {
    local target_date=$1
    local current_date=$(date +%Y-%m-%d)
    
    # Convert dates to seconds since epoch
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        local current_timestamp=$(date -j -f "%Y-%m-%d" "$current_date" "+%s" 2>/dev/null)
        local target_timestamp=$(date -j -f "%Y-%m-%d" "$target_date" "+%s" 2>/dev/null)
    else
        # Linux
        local current_timestamp=$(date -d "$current_date" "+%s" 2>/dev/null)
        local target_timestamp=$(date -d "$target_date" "+%s" 2>/dev/null)
    fi
    
    # Check if date conversion was successful
    if [[ -z "$current_timestamp" || -z "$target_timestamp" ]]; then
        echo "0"
        return
    fi
    
    local diff_seconds=$((target_timestamp - current_timestamp))
    local diff_days=$((diff_seconds / 86400))
    
    # If negative, the date has passed
    if [[ $diff_days -lt 0 ]]; then
        echo "0"
    else
        echo "$diff_days"
    fi
}

# Get current year
current_year=$(date +%Y)
current_month_day=$(date +%m-%d)

# Define end dates
summer_end_date="$current_year-09-22"

# If we're past September 22nd this year, calculate for next year
if [[ "$current_month_day" > "09-22" ]]; then
    next_year=$((current_year + 1))
    summer_end_date="$next_year-09-22"
fi

year_end_date="2025-12-31"

# Calculate days remaining
summer_days=$(calculate_days "$summer_end_date")
year_days=$(calculate_days "$year_end_date")

# Format compact message for topbar
message="Summer: ${summer_days}d | 2025: ${year_days}d"

# Display on jarvis topbar
echo "$message" | "$JARVIS_BIN" --stdin --layout topbar

echo "Topbar countdown: $message" 
