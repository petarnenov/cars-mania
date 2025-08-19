#!/bin/sh

# Database initialization script for Docker container
echo "Initializing database..."

# Ensure data directory exists
mkdir -p /data

# Run Prisma push to create schema (idempotent)
npx prisma db push --skip-generate

echo "Database initialization complete"
