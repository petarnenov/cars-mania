#!/bin/bash

# Cars Mania Production Deployment Script
# Usage: ./scripts/deploy.sh [start|stop|restart|status|logs|update]

set -e

# Configuration
PROJECT_DIR="/opt/cars-mania"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

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
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed"
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

check_environment() {
    log_info "Checking environment configuration..."
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Environment file $ENV_FILE not found"
        log_info "Please copy production.env.example to $ENV_FILE and configure it"
        exit 1
    fi
    
    # Check required environment variables
    source "$ENV_FILE"
    
    if [ -z "$JWT_ACCESS_SECRET" ] || [ "$JWT_ACCESS_SECRET" = "your_very_long_random_access_secret_here" ]; then
        log_error "JWT_ACCESS_SECRET is not configured"
        exit 1
    fi
    
    if [ -z "$JWT_REFRESH_SECRET" ] || [ "$JWT_REFRESH_SECRET" = "your_very_long_random_refresh_secret_here" ]; then
        log_error "JWT_REFRESH_SECRET is not configured"
        exit 1
    fi
    
    log_success "Environment configuration check passed"
}

setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p "$PROJECT_DIR"
    mkdir -p "$PROJECT_DIR/uploads"
    mkdir -p "$PROJECT_DIR/prisma"
    mkdir -p "$PROJECT_DIR/logs"
    
    log_success "Directories setup completed"
}

start_services() {
    log_info "Starting services..."
    
    cd "$PROJECT_DIR"
    
    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Start services
    log_info "Starting containers..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    log_info "Checking service health..."
    docker-compose -f "$COMPOSE_FILE" ps
    
    log_success "Services started successfully"
}

stop_services() {
    log_info "Stopping services..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" down
    
    log_success "Services stopped successfully"
}

restart_services() {
    log_info "Restarting services..."
    
    stop_services
    sleep 5
    start_services
    
    log_success "Services restarted successfully"
}

update_services() {
    log_info "Updating services..."
    
    cd "$PROJECT_DIR"
    
    # Pull latest images
    log_info "Pulling latest images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Restart with new images
    log_info "Restarting with new images..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 30
    
    # Check service health
    log_info "Checking service health..."
    docker-compose -f "$COMPOSE_FILE" ps
    
    # Clean up old images
    log_info "Cleaning up old images..."
    docker image prune -f
    
    log_success "Services updated successfully"
}

show_status() {
    log_info "Service status:"
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log_info "Recent logs:"
    docker-compose -f "$COMPOSE_FILE" logs --tail=20
}

show_logs() {
    log_info "Showing logs..."
    
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" logs -f
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
    if curl -f http://localhost:80 > /dev/null 2>&1; then
        log_success "Frontend is healthy"
    else
        log_error "Frontend health check failed"
        return 1
    fi
    
    log_success "All services are healthy"
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
        echo "  start   - Start all services"
        echo "  stop    - Stop all services"
        echo "  restart - Restart all services"
        echo "  update  - Update to latest images and restart"
        echo "  status  - Show service status"
        echo "  logs    - Show service logs"
        echo "  health  - Perform health check"
        exit 1
        ;;
esac
