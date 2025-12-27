#!/bin/bash

# Ensure we are running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root"
  exit 1
fi

echo "Configuring Nginx Reverse Proxy..."

APP_NAME="advanced-raid-calculator"
PORT=4001

# Create Nginx config for the app
cat > /etc/nginx/sites-available/$APP_NAME <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name _;

    root /var/www/$APP_NAME;
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }

    location /api {
        proxy_pass http://localhost:$PORT;
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
rm -f /etc/nginx/sites-enabled/app

# Enable the new app configuration
ln -sf /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-enabled/$APP_NAME

# Restart Nginx to apply changes
if systemctl is-active --quiet nginx; then
    systemctl reload nginx
    echo "Nginx reloaded successfully."
else
    echo "Nginx is not running. Starting it..."
    systemctl start nginx
fi

echo "Proxy configuration complete. App should be accessible on port 80."
