#!/bin/bash

# Cars Mania Development Server Script
# Usage: ./scripts/dev.sh [start|stop|restart|status|logs|update|health]

set -e

# Configuration
PROJECT_DIR="$(pwd)"
COMPOSE_FILE="docker-compose.dev.yml"
ENV_FILE=".env.development"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
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

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed"
        exit 1
    fi
    
    # Check for docker compose (newer) or docker compose (older)
    if ! docker compose version &> /dev/null && ! command -v docker compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

check_environment() {
    log_info "Checking environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_warning "Environment file $ENV_FILE not found"
        log_info "Creating development environment file..."
        cp development.env.example "$ENV_FILE"
        log_success "Created $ENV_FILE from example"
    fi
    
    # Check required environment variables
    source "$ENV_FILE"
    
    if [ -z "$JWT_ACCESS_SECRET" ] || [ "$JWT_ACCESS_SECRET" = "dev_access_secret_very_long_random_string_here" ]; then
        log_warning "JWT_ACCESS_SECRET is using default value"
    fi
    
    if [ -z "$JWT_REFRESH_SECRET" ] || [ "$JWT_REFRESH_SECRET" = "dev_refresh_secret_very_long_random_string_here" ]; then
        log_warning "JWT_REFRESH_SECRET is using default value"
    fi
    
    log_success "Environment configuration check passed"
}

setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p "$PROJECT_DIR/uploads"
    mkdir -p "$PROJECT_DIR/prisma"
    mkdir -p "$PROJECT_DIR/logs"
    
    log_success "Directories setup completed"
}

start_services() {
    log_info "Starting development services..."
    
    # Build and start services
    log_info "Building and starting containers..."
    docker compose -f "$COMPOSE_FILE" --env-file .env.development up -d --build
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    log_info "Checking service health..."
    docker compose -f "$COMPOSE_FILE" ps
    
    log_success "Development services started successfully"
}

stop_services() {
    log_info "Stopping development services..."
    
    docker compose -f "$COMPOSE_FILE" --env-file .env.development down
    
    log_success "Development services stopped successfully"
}

restart_services() {
    log_info "Restarting development services..."
    
    stop_services
    sleep 5
    start_services
    
    log_success "Development services restarted successfully"
}

update_services() {
    log_info "Updating development services..."
    
    # Pull latest code and rebuild
    log_info "Pulling latest code..."
    git pull
    
    # Rebuild and restart with new code
    log_info "Rebuilding and restarting with new code..."
    docker compose -f "$COMPOSE_FILE" --env-file .env.development up -d --build
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    log_info "Checking service health..."
    docker compose -f "$COMPOSE_FILE" ps
    
    # Clean up old images
    log_info "Cleaning up old images..."
    docker image prune -f
    
    log_success "Development services updated successfully"
}

show_status() {
    log_info "Development service status:"
    
    docker compose -f "$COMPOSE_FILE" --env-file .env.development ps
    
    echo ""
    log_info "Recent logs:"
    docker compose -f "$COMPOSE_FILE" --env-file .env.development logs --tail=20
}

show_logs() {
    log_info "Showing development logs..."
    
    docker compose -f "$COMPOSE_FILE" --env-file .env.development logs -f
}

health_check() {
    log_info "Performing health check..."
    
    # Check backend health
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        log_success "Backend is healthy"
    else
        log_error "Backend health check failed"
        return 1
    fi
    
    # Check frontend health
    if curl -f http://localhost:5173 > /dev/null 2>&1; then
        log_success "Frontend is healthy"
    else
        log_error "Frontend health check failed"
        return 1
    fi
    
    log_success "All development services are healthy"
}

# Main script
case "$1" in
    start)
        check_dependencies
        check_environment
        setup_directories
        start_services
        health_check
        ;;
    stop)
        stop_services
        ;;
    restart)
        check_dependencies
        check_environment
        restart_services
        health_check
        ;;
    update)
        check_dependencies
        check_environment
        update_services
        health_check
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    health)
        health_check
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|update|status|logs|health}"
        echo ""
        echo "Commands:"
        echo "  start   - Start development services"
        echo "  stop    - Stop development services"
        echo "  restart - Restart development services"
        echo "  update  - Update to latest code and restart"
        echo "  status  - Show service status"
        echo "  logs    - Show service logs"
        echo "  health  - Perform health check"
        exit 1
        ;;
esac
