# Build and serve static frontend with nginx
FROM node:22-alpine3.20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine3.20 AS runner
RUN apk --no-cache upgrade
RUN apk add --no-cache netcat-openbsd bash
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/conf.d/default.conf
COPY start-nginx.sh /start-nginx.sh
RUN chmod +x /start-nginx.sh
# Healthcheck for CI readiness wait (optional)
HEALTHCHECK --interval=5s --timeout=3s --retries=12 CMD wget -qO- http://127.0.0.1/ || exit 1
EXPOSE 80
ENV BACKEND_URL=http://backend:3001
CMD ["/start-nginx.sh"]
