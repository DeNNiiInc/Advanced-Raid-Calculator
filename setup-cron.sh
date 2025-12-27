#!/bin/bash

# Get the absolute path to the sync script
SYNC_SCRIPT="$(pwd)/sync-and-restart.sh"

# Make scripts executable
chmod +x deploy.sh
chmod +x sync-and-restart.sh

# Add cron job to run every 5 minutes
# We use a temporary file to avoid messing up existing crontab
crontab -l > mycron
# Check if the job already exists to avoid duplicates
if grep -q "$SYNC_SCRIPT" mycron; then
    echo "Cron job already exists."
else
    echo "*/5 * * * * $SYNC_SCRIPT >> $(pwd)/cron.log 2>&1" >> mycron
    crontab mycron
    echo "Cron job added."
fi
rm mycron
