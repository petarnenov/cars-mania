#!/bin/bash

# Production Debug Script
# Usage: ./scripts/debug-production.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "=== Production Debug Script ==="

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    log_error "docker-compose.prod.yml not found. Are you in the project root?"
    exit 1
fi

# Check environment file
log_info "Checking environment file..."
if [ -f ".env.production" ]; then
    log_success ".env.production exists"
    source .env.production
    log_info "BACKEND_IMAGE: ${BACKEND_IMAGE:-ghcr.io/petarnenov/cars-mania/backend:latest}"
    log_info "FRONTEND_IMAGE: ${FRONTEND_IMAGE:-ghcr.io/petarnenov/cars-mania/frontend:latest}"
else
    log_error ".env.production not found"
    exit 1
fi

# Check Docker images
log_info "Checking Docker images..."
BACKEND_IMAGE=${BACKEND_IMAGE:-ghcr.io/petarnenov/cars-mania/backend:latest}
FRONTEND_IMAGE=${FRONTEND_IMAGE:-ghcr.io/petarnenov/cars-mania/frontend:latest}

if docker image inspect "$BACKEND_IMAGE" >/dev/null 2>&1; then
    log_success "Backend image exists: $BACKEND_IMAGE"
else
    log_warning "Backend image not found locally: $BACKEND_IMAGE"
    log_info "Pulling backend image..."
    docker pull "$BACKEND_IMAGE"
fi

if docker image inspect "$FRONTEND_IMAGE" >/dev/null 2>&1; then
    log_success "Frontend image exists: $FRONTEND_IMAGE"
else
    log_warning "Frontend image not found locally: $FRONTEND_IMAGE"
    log_info "Pulling frontend image..."
    docker pull "$FRONTEND_IMAGE"
fi

# Check running containers
log_info "Checking running containers..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check if ports are in use
log_info "Checking port usage..."
if netstat -tuln 2>/dev/null | grep -q ":80 "; then
    log_warning "Port 80 is in use"
    netstat -tuln 2>/dev/null | grep ":80 "
else
    log_success "Port 80 is available"
fi

if netstat -tuln 2>/dev/null | grep -q ":3001 "; then
    log_warning "Port 3001 is in use"
    netstat -tuln 2>/dev/null | grep ":3001 "
else
    log_success "Port 3001 is available"
fi

# Try to start services
log_info "Attempting to start services..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
docker compose -f docker-compose.prod.yml up -d

# Wait a bit and check status
log_info "Waiting for services to start..."
sleep 10

log_info "Service status:"
docker compose -f docker-compose.prod.yml ps

# Check logs
log_info "Recent logs:"
docker compose -f docker-compose.prod.yml logs --tail=20

# Test connectivity
log_info "Testing connectivity..."
sleep 5

if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
    log_success "Backend is responding"
else
    log_error "Backend is not responding"
fi

if curl -f http://localhost:80 >/dev/null 2>&1; then
    log_success "Frontend is responding"
else
    log_error "Frontend is not responding"
    log_info "Frontend logs:"
    docker compose -f docker-compose.prod.yml logs frontend --tail=10
fi

log_info "=== Debug complete ==="
