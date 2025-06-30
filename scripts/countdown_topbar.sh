#!/bin/bash

calculate_days() {
    local target_date=$1
    local current_date_val # Will be set to today's date for calculation

    current_date_val=$(date +%Y-%m-%d)

    # Convert dates to seconds since epoch
    local current_timestamp=$(date -d "$current_date_val" "+%s" 2>/dev/null)
    local target_timestamp=$(date -d "$target_date" "+%s" 2>/dev/null)

    # Check if date conversion was successful
    if [[ -z "$current_timestamp" || -z "$target_timestamp" ]]; then
        echo "0" # Return 0 if dates are invalid or conversion failed
        return
    fi

    local diff_seconds=$((target_timestamp - current_timestamp))
    local diff_days=$((diff_seconds / 86400))

    # If negative, the date has passed
    if [[ $diff_days -lt 0 ]]; then
        echo "0"
    else
        echo "$((diff_days + 1))"
    fi
}

# Get current year and month-day for various calculations
current_year=$(date +%Y)
current_month_day_num=$(date +%m%d) # Numeric format for comparison
# Remove leading zeros to avoid octal interpretation
current_month_day_num=$(echo $current_month_day_num | sed 's/^0*//')
# Handle edge case where all zeros become empty string
if [[ -z "$current_month_day_num" ]]; then
    current_month_day_num=0
fi

# Calculate days to the end of the current month
days_to_month_end="-"
first_day_current_month=$(date +%Y-%m-01)

if [[ -n "$first_day_current_month" ]]; then
    last_day_of_month_date=$(date -d "$first_day_current_month +1 month -1 day" "+%Y-%m-%d" 2>/dev/null)
    if [[ -n "$last_day_of_month_date" ]]; then
        days_to_month_end=$(calculate_days "$last_day_of_month_date")
    else
        echo "Warning: Could not determine the last day of the current month." >&2
    fi
else
    echo "Warning: Could not determine the first day of the current month." >&2
fi

# Astronomical Summer Start (Summer Solstice): June 20th
# Astronomical Summer End (Autumnal Equinox): September 22nd
summer_start_month_day=620   # June 20th as integer
summer_end_month_day=922     # September 22nd as integer

summer_target_date=""

if [[ "$current_month_day_num" -ge "$summer_start_month_day" && "$current_month_day_num" -le "$summer_end_month_day" ]]; then
    # If currently within summer, calculate days until summer ends
    summer_target_date="${current_year}-09-22"
elif [[ "$current_month_day_num" -gt "$summer_end_month_day" ]]; then
    # If past summer end, calculate days until next year's summer starts
    next_year=$((current_year + 1))
    summer_target_date="${next_year}-06-20"
else
    # If before summer starts (in spring), calculate days until current year's summer starts
    summer_target_date="${current_year}-06-20"
fi

# Calculate days remaining for summer (or until next summer starts)
summer_counter=$(calculate_days "$summer_target_date")

year_end_date="${current_year}-12-31"
year_days=$(calculate_days "$year_end_date")

# Format compact message for topbar with consistent padding (3 digits max)
summer_counter_padded=$(printf "%3d" "$summer_counter")
days_to_month_end_padded=$(printf "%2s" "$days_to_month_end")
year_days_padded=$(printf "%3d" "$year_days")

message="${summer_counter_padded} S | ${days_to_month_end_padded} M | ${year_days_padded} Y"
echo "$message" | jarvis --stdin --layout topbar

echo "Topbar countdown: $message"
