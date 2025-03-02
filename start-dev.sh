#!/bin/bash

# Start vectorization API in background
echo "Starting vectorization API..."
cd matching-algorithm

# Activate virtual environment
source venv/bin/activate

python3 vectorization-api.py &
VECTORIZATION_PID=$!

# Give the API time to start
sleep 2
echo "Vectorization API running with PID: $VECTORIZATION_PID"

# Change back to the root directory
cd ..

# Start the main app
echo "Starting main app..."
bun dev

# When the main app is closed, stop the vectorization API
echo "Stopping vectorization API..."
kill $VECTORIZATION_PID

# Deactivate virtual environment
deactivate