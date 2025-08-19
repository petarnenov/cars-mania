# ===== Builder =====
FROM node:22-alpine3.20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
# Generate Prisma client (outputs to src/generated/prisma per schema)
RUN npx prisma generate
# Build TypeScript
RUN npm run build
# Copy generated Prisma client next to compiled JS (dist expects ../generated/prisma)
RUN mkdir -p dist/generated && cp -r src/generated/prisma dist/generated/prisma

# ===== Runner =====
FROM node:22-alpine3.20 AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk --no-cache upgrade
# Copy production node_modules
COPY --from=builder /app/node_modules ./node_modules
# Copy built app and prisma assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
# Create data and uploads directories (mounted in docker-compose)
RUN mkdir -p /data /app/uploads
EXPOSE 3001
HEALTHCHECK --interval=5s --timeout=3s --retries=12 CMD wget -qO- http://127.0.0.1:3001/health || exit 1
CMD ["node", "dist/index.js"]
