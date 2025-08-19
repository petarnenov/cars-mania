#!/bin/sh

# Database initialization script for Docker container
echo "Initializing database..."

# Ensure data directory exists
mkdir -p /data

# Run Prisma push to create schema (idempotent)
npx prisma db push --schema=/app/dist/generated/prisma/schema.prisma --skip-generate

echo "Database initialization complete"
