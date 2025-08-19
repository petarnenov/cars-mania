#!/bin/bash

# Check if backend is available and generate nginx config
BACKEND_URL=${BACKEND_URL:-http://backend:3001}
echo "Using BACKEND_URL: $BACKEND_URL"

# Extract host and port from BACKEND_URL using sed
BACKEND_HOST=$(echo "$BACKEND_URL" | sed -n 's|^http://\([^:]*\):\([0-9]*\)|\1|p')
BACKEND_PORT=$(echo "$BACKEND_URL" | sed -n 's|^http://\([^:]*\):\([0-9]*\)|\2|p')

if [ -n "$BACKEND_HOST" ] && [ -n "$BACKEND_PORT" ]; then
    echo "Backend host: $BACKEND_HOST, port: $BACKEND_PORT"
    
    # Check if backend is available
    if nc -z "$BACKEND_HOST" "$BACKEND_PORT" 2>/dev/null; then
        echo "Backend is available, enabling API proxy..."
                        # Replace the entire API location block with proxy configuration (only if not already configured)
                if ! grep -q "proxy_pass.*$BACKEND_URL" /etc/nginx/conf.d/default.conf; then
                    # Create a new nginx config with the proxy
                    cat > /etc/nginx/conf.d/default.conf << EOF
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass $BACKEND_URL/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 1s;
        proxy_send_timeout 1s;
        proxy_read_timeout 1s;
    }
}
EOF
                fi
    else
        echo "Backend not available, API calls will return 404"
    fi
else
    echo "Invalid BACKEND_URL format: $BACKEND_URL"
fi

# Start nginx
exec nginx -g "daemon off;"
