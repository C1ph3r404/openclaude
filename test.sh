#!/usr/bin/env bash

set -e

LOG_FILE="../BrowserLLM/debug/log.txt"
DEBUG_FILE="debug/debug.txt"

# Step 1: Build
echo "Running build..."
npm run build


rm -rf "$LOG_FILE"
rm -rf "$DEBUG_FILE"

# Step 2: Run openclaude in background
echo "Starting openclaude..."
script -q -c "exec bin/openclaude test --debug-file $DEBUG_FILE" /dev/null </dev/null > /dev/null 2>&1 &
PID=$!

sleep 5 # Wait for the server to start and write to the log file

kill -INT $PID 2>/dev/null || true
wait $PID 2>/dev/null || true

reset

# Step 3: Check debug file

if grep -i "x-agent-id" "$LOG_FILE"; then
  echo "SUCCESS: Found 'x-agent-id' in log file."
  exit 1
else
  echo "FAILURE: 'x-agent-id' not found in log file."
  exit 0
fi