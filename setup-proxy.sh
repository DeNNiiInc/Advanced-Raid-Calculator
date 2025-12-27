#!/bin/bash

# Ensure we are running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root"
  exit 1
fi

echo "Configuring Nginx Reverse Proxy..."

# Create Nginx config for the app
cat > /etc/nginx/sites-available/app <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Remove default TurnKey/Nginx configurations if they exist
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-enabled/tkl-default
rm -f /etc/nginx/sites-enabled/node

# Enable the new app configuration
ln -sf /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app

# Restart Nginx to apply changes
if systemctl is-active --quiet nginx; then
    systemctl restart nginx
    echo "Nginx restarted successfully."
else
    echo "Nginx is not running. Starting it..."
    systemctl start nginx
fi

echo "Proxy configuration complete. App should be accessible on port 80."
