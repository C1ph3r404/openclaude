#!/usr/bin/env bash

set -e

# Step 1: Build
echo "Running build..."
npm run build

rm -rf ./debug/debug.txt

# Step 2: Run openclaude in background
echo "Starting openclaude..."
bin/openclaude test --debug-file debug/debug.txt > /dev/null 2>&1 &
PID=$!

# Let it run for a bit (adjust if needed)
sleep 20

# Kill the process after waiting
kill $PID 2>/dev/null || true

# Step 3: Check debug file
LOG_FILE="debug/debug.txt"

if grep -qE "Edit tool input error|file_path.*missing|old_string.*missing|new_string.*missing" "$LOG_FILE"; then
  echo "FAILURE"
  exit 1
else
  echo "SUCCESS"
  exit 0
fi