#!/bin/sh

# Check if backend is available and generate nginx config
BACKEND_URL=${BACKEND_URL:-http://backend:3001}
echo "Using BACKEND_URL: $BACKEND_URL"

# Extract host and port from BACKEND_URL
if [[ "$BACKEND_URL" =~ ^http://([^:]+):([0-9]+) ]]; then
    BACKEND_HOST="${BASH_REMATCH[1]}"
    BACKEND_PORT="${BASH_REMATCH[2]}"
    echo "Backend host: $BACKEND_HOST, port: $BACKEND_PORT"
    
    # Check if backend is available
    if nc -z "$BACKEND_HOST" "$BACKEND_PORT" 2>/dev/null; then
        echo "Backend is available, enabling API proxy..."
        # Replace the API location block with proxy configuration
        sed -i "s|location /api/ {|location /api/ {\n        proxy_pass $BACKEND_URL/api/;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade \$http_upgrade;\n        proxy_set_header Connection \"upgrade\";\n        proxy_set_header Host \$host;\n        proxy_cache_bypass \$http_upgrade;\n        proxy_connect_timeout 1s;\n        proxy_send_timeout 1s;\n        proxy_read_timeout 1s;|" /etc/nginx/conf.d/default.conf
    else
        echo "Backend not available, API calls will return 404"
    fi
else
    echo "Invalid BACKEND_URL format: $BACKEND_URL"
fi

# Start nginx
exec nginx -g "daemon off;"
