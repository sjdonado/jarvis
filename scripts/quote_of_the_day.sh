#!/bin/bash

JARVIS_BIN="/home/sjdonado/jarvis/jarvis"

# Make the API call and store the response
# Added -sS for silent operation (no progress meter) but still show errors
api_response=$(curl -sS -X GET 'https://zenquotes.io/api/today')

# Check if curl command was successful and response is not empty
if [ -z "$api_response" ]; then
  echo "Error: API call failed or returned empty response."
  # Optionally send an error to Jarvis
  # echo "Error: Could not fetch quote" | "$JARVIS_BIN" --stdin --layout topbar
  exit 1
fi

# Extract the quote and author using jq.
# The -r flag outputs the raw string.
# We access the first element of the array .[0] and then the fields .q and .a
quote=$(echo "$api_response" | jq -r '.[0].q')
author=$(echo "$api_response" | jq -r '.[0].a')

# Check if jq successfully extracted the quote and author
if [ -z "$quote" ] || [ "$quote" == "null" ] || [ -z "$author" ] || [ "$author" == "null" ]; then
  echo "Error: Could not parse quote or author from API response."
  echo "API Response was:"
  echo "$api_response" # For debugging
  # Optionally send an error to Jarvis
  # echo "Error: Could not parse quote/author" | "$JARVIS_BIN" --stdin --layout topbar
  exit 1
fi

# Create the message in "quote - author" format
message_to_display="\"$quote\" - $author"

# Display the formatted message on jarvis topbar
echo "$message_to_display" | "$JARVIS_BIN" --stdin --layout main

# Echo to standard output as well
echo "Topbar message: $message_to_display"
