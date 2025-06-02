#!/bin/bash

calculate_days() {
    local target_date=$1
    local current_date_val # Will be set to today's date for calculation

    # Get current date in YYYY-MM-DD format.
    # The original script used 'date +%Y-%m-%d' which is fine,
    # but for consistency within this function, we can re-fetch or pass it.
    # For simplicity, fetching it here.
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
        echo "$diff_days"
    fi
}

# Get current year and month-day for various calculations
current_year=$(date +%Y)
current_month_day=$(date +%m-%d) # Used for summer date logic

# Calculate days to the end of the current month
days_to_month_end="N/A"
# Get the first day of the current month
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


# Define end date for Summer (Northern Hemisphere meteorological)
summer_end_date="$current_year-09-22"

# If we're past September 22nd this year, calculate for next year's summer
if [[ "$current_month_day" > "09-22" ]]; then
    next_year=$((current_year + 1))
    summer_end_date="$next_year-09-22"
fi

# Define end date for the specific year 2025 (as per original script)
year_end_date="2025-12-31"

# Calculate days remaining for summer and 2025
summer_days=$(calculate_days "$summer_end_date")
year_days=$(calculate_days "$year_end_date") # Days until end of 2025

# Format compact message for topbar
message="S: ${summer_days} | M: ${days_to_month_end} | Y: ${year_days}"

# Display on jarvis topbar
echo "$message" | jarvis --stdin --layout topbar

# Echo to standard output as well
echo "Topbar countdown: $message"
