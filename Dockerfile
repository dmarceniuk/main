FROM nginx:alpine

# Copy static assets to nginx html root
COPY . /usr/share/nginx/html

# Custom nginx configuration with CORS and proper MIME types
RUN cat <<'EOF' > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Enable CORS for all assets
    add_header Access-Control-Allow-Origin * always;
    add_header Access-Control-Allow-Methods 'GET, POST, OPTIONS' always;
    add_header Access-Control-Allow-Headers 'X-Requested-With, Content-Type, Range' always;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location = /msx/start.json {
        sub_filter_types application/json;
        sub_filter_once off;
        default_type application/json;
    }
}
EOF

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
