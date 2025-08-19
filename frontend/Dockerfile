# Build and serve static frontend with nginx
FROM node:20-alpine3.20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine3.20 AS runner
RUN apk --no-cache upgrade
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Healthcheck for CI readiness wait (optional)
HEALTHCHECK --interval=5s --timeout=3s --retries=12 CMD wget -qO- http://127.0.0.1/ || exit 1
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
