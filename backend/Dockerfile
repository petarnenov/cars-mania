# ===== Builder =====
FROM node:20-alpine AS builder
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

# ===== Runner =====
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Copy production node_modules
COPY --from=builder /app/node_modules ./node_modules
# Copy built app and prisma assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
# Create data and uploads directories (mounted in docker-compose)
RUN mkdir -p /data /app/uploads
EXPOSE 3001
CMD ["node", "dist/index.js"]
