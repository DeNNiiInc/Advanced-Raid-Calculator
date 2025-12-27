#!/bin/bash

# Ensure we are in the project directory
cd "$(dirname "$0")"

echo "Deploying Advanced Raid Calculator..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Restart the application using PM2
if command -v pm2 &> /dev/null; then
    echo "Restarting with PM2..."
    # Check if the process is already running
    if pm2 list | grep -q "raid-calculator"; then
        pm2 reload raid-calculator
    else
        pm2 start server.js --name "raid-calculator"
    fi
    pm2 save
else
    echo "PM2 not found. Please install PM2 globally (npm install -g pm2)."
    # Fallback for testing without PM2, though PM2 is expected on the TurnKey template
    # node server.js
fi

# Run the proxy setup script
chmod +x setup-proxy.sh
./setup-proxy.sh

echo "Deployment complete."
