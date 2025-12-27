#!/bin/bash

# Ensure we are in the project directory
cd "$(dirname "$0")"

APP_NAME="advanced-raid-calculator"
INSTALL_DIR="/var/www/$APP_NAME"
SERVICE_NAME="$APP_NAME.service"

echo "Deploying $APP_NAME..."

# Ensure install directory exists (if running for the first time outside of it, though git clone usually does this)
# If we are running this script FROM the repo, we assume we are already in the right place or we are setting it up.
# This script assumes it is being run inside the destination directory /var/www/advanced-raid-calculator

# Install dependencies
echo "Installing dependencies..."
npm install

# Setup Systemd Service
echo "Configuring Systemd Service..."
if [ -f "$SERVICE_NAME" ]; then
    cp "$SERVICE_NAME" "/etc/systemd/system/$SERVICE_NAME"
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    systemctl restart "$SERVICE_NAME"
    echo "Service restarted."
else
    echo "Error: $SERVICE_NAME not found!"
    exit 1
fi

# Run the proxy setup script
chmod +x setup-proxy.sh
./setup-proxy.sh

# Fix permissions (ensure www-data owns the web dir)
chown -R www-data:www-data "$INSTALL_DIR"

echo "Deployment complete."
