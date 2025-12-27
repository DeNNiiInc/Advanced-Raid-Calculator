#!/bin/bash

# Ensure we are in the project directory
cd "$(dirname "$0")"

# Fetch the latest changes from the remote
git remote update

# Check if local is behind remote (UPSTREAM)
UPSTREAM=${1:-'@{u}'}
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse "$UPSTREAM")
BASE=$(git merge-base @ "$UPSTREAM")

if [ $LOCAL = $REMOTE ]; then
    echo "Up-to-date"
elif [ $LOCAL = $BASE ]; then
    echo "Need to pull"
    git pull
    # Re-run deploy to handle deps, service updates, and permissions
    ./deploy.sh
elif [ $REMOTE = $BASE ]; then
    echo "Need to push"
else
    echo "Diverged"
fi
