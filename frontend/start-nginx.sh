#!/bin/sh

# Check if backend is available and generate nginx config
if nc -z backend 3001 2>/dev/null; then
    echo "Backend is available, enabling API proxy..."
    # Replace the API location block with proxy configuration
    sed -i 's|location /api/ {|location /api/ {\n        proxy_pass http://backend:3001/api/;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n        proxy_set_header Host $host;\n        proxy_cache_bypass $http_upgrade;\n        proxy_connect_timeout 1s;\n        proxy_send_timeout 1s;\n        proxy_read_timeout 1s;|' /etc/nginx/conf.d/default.conf
else
    echo "Backend not available, API calls will return 404"
fi

# Start nginx
exec nginx -g "daemon off;"
