# Production Deployment Guide

This guide covers setting up and deploying Cars Mania to production with automatic updates.

## Overview

The production deployment system includes:
- **Auto-updating containers** that deploy when CI passes
- **Health checks** to ensure services are running properly
- **Rollback capability** in case of deployment issues
- **Monitoring** and logging for production environments

## Prerequisites

### Server Requirements
- Ubuntu 20.04+ or similar Linux distribution
- Docker and Docker Compose installed
- At least 2GB RAM
- 10GB+ disk space
- SSH access with key-based authentication

### GitHub Secrets Required
Set these secrets in your GitHub repository settings:

```
PROD_HOST=your-server-ip-or-domain
PROD_USER=your-ssh-username
PROD_SSH_KEY=your-private-ssh-key
PROD_PORT=22
```

## Initial Setup

### 1. Server Preparation

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create project directory
sudo mkdir -p /opt/cars-mania
sudo chown $USER:$USER /opt/cars-mania
```

### 2. Environment Configuration

```bash
cd /opt/cars-mania

# Copy environment template
cp production.env.example .env.production

# Edit environment file
nano .env.production
```

**Required environment variables:**
- `JWT_ACCESS_SECRET`: Generate a strong random string
- `JWT_REFRESH_SECRET`: Generate a strong random string
- `DATABASE_URL`: SQLite file path for production

### 3. Initial Deployment

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Start services
./scripts/deploy.sh start
```

## Automatic Deployment

### How It Works

1. **CI Pipeline**: When code is pushed to `main` branch, CI runs tests
2. **Success Trigger**: If CI passes, deployment workflow automatically triggers
3. **Image Building**: New Docker images are built and pushed to GitHub Container Registry
4. **Server Update**: Production server pulls new images and restarts services
5. **Health Check**: System verifies all services are healthy

### Deployment Workflow

The `.github/workflows/deploy.yml` workflow:
- Triggers on successful CI completion
- Builds and pushes Docker images
- Connects to production server via SSH
- Pulls latest images and restarts services
- Performs health checks
- Cleans up old images

## Manual Operations

### Using the Deployment Script

```bash
# Start all services
./scripts/deploy.sh start

# Stop all services
./scripts/deploy.sh stop

# Restart all services
./scripts/deploy.sh restart

# Update to latest images
./scripts/deploy.sh update

# Check service status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs

# Health check
./scripts/deploy.sh health
```

### Using Docker Compose Directly

```bash
cd /opt/cars-mania

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop services
docker-compose -f docker-compose.prod.yml down

# Pull latest images
docker-compose -f docker-compose.prod.yml pull
```

## Monitoring and Maintenance

### Health Checks

The system includes built-in health checks:
- Backend: `http://localhost:3001/api/health`
- Frontend: `http://localhost:80`

### Logs

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# View specific service logs
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs frontend

# Follow logs in real-time
docker-compose -f docker-compose.prod.yml logs -f
```

### Backup

```bash
# Backup database
cp /opt/cars-mania/prisma/production.db /opt/cars-mania/backups/$(date +%Y%m%d_%H%M%S)_production.db

# Backup uploads
tar -czf /opt/cars-mania/backups/$(date +%Y%m%d_%H%M%S)_uploads.tar.gz /opt/cars-mania/uploads/
```

## Troubleshooting

### Common Issues

1. **Services won't start**
   ```bash
   # Check logs
   ./scripts/deploy.sh logs
   
   # Check environment
   cat .env.production
   ```

2. **Health check fails**
   ```bash
   # Check service status
   ./scripts/deploy.sh status
   
   # Restart services
   ./scripts/deploy.sh restart
   ```

3. **Images not updating**
   ```bash
   # Force pull latest images
   docker-compose -f docker-compose.prod.yml pull --no-cache
   
   # Restart with new images
   ./scripts/deploy.sh update
   ```

### Rollback

If a deployment causes issues:

```bash
# Stop current services
./scripts/deploy.sh stop

# Pull previous image version
docker pull ghcr.io/petarnenov/cars-mania/backend:previous-tag
docker pull ghcr.io/petarnenov/cars-mania/frontend:previous-tag

# Start with previous images
./scripts/deploy.sh start
```

## Security Considerations

1. **Firewall**: Configure firewall to only allow necessary ports (80, 443, 22)
2. **SSL**: Use nginx with SSL certificates for HTTPS
3. **Secrets**: Store sensitive data in environment variables, never in code
4. **Updates**: Keep Docker and system packages updated
5. **Monitoring**: Set up monitoring for disk space, memory, and service health

## SSL Configuration (Optional)

To enable HTTPS:

1. **Obtain SSL certificates** (Let's Encrypt recommended)
2. **Configure nginx**:
   ```bash
   # Create nginx config
   mkdir -p /opt/cars-mania/nginx
   # Add your nginx.conf and SSL certificates
   ```

3. **Start with SSL profile**:
   ```bash
   docker-compose -f docker-compose.prod.yml --profile ssl up -d
   ```

## Performance Optimization

1. **Database**: Consider using PostgreSQL for production instead of SQLite
2. **Caching**: Add Redis for session storage and caching
3. **CDN**: Use a CDN for static assets
4. **Monitoring**: Add application performance monitoring (APM)

## Support

For deployment issues:
1. Check the logs: `./scripts/deploy.sh logs`
2. Verify environment: `cat .env.production`
3. Check service status: `./scripts/deploy.sh status`
4. Review GitHub Actions logs for deployment failures
