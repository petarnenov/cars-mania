#!/bin/bash

# Test CI Docker Compose Environment Locally
# This script simulates the exact CI environment to test fixes locally

set -e

echo "🚀 Testing CI Environment Locally"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up containers..."
    docker compose -f docker-compose.ci.yml down --remove-orphans 2>/dev/null || true
    docker rmi local-test/backend:latest local-test/frontend:latest 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

print_status "Step 1: Building Docker images..."
docker compose build

print_status "Step 2: Tagging images for CI simulation..."
docker tag cars_mania-backend local-test/backend:latest
docker tag cars_mania-frontend local-test/frontend:latest
print_success "Images tagged successfully"

print_status "Step 3: Setting up CI environment variables..."
export BACKEND_IMAGE="local-test/backend:latest"
export FRONTEND_IMAGE="local-test/frontend:latest"
export JWT_ACCESS_SECRET="test_access_secret"
export JWT_REFRESH_SECRET="test_refresh_secret"
print_success "Environment variables set"

print_status "Step 4: Starting CI docker-compose services..."
docker compose -f docker-compose.ci.yml up -d

print_status "Step 5: Waiting for services to be ready..."
sleep 8

# Test backend health
print_status "Step 6: Testing backend health endpoint..."
if curl -s http://localhost:3001/api/health | grep -q '"ok":true'; then
    print_success "Backend health check passed"
else
    print_error "Backend health check failed"
    docker compose -f docker-compose.ci.yml logs backend
    exit 1
fi

# Test admin endpoint directly
print_status "Step 7: Testing admin endpoint directly..."
ADMIN_RESULT=$(curl -s -w "%{http_code}" -X POST http://localhost:3001/api/test/make-admin \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}' \
    -o /tmp/admin_response.json)

if [ "$ADMIN_RESULT" = "200" ]; then
    print_success "Admin endpoint direct test passed"
    cat /tmp/admin_response.json && echo
else
    print_error "Admin endpoint direct test failed (Status: $ADMIN_RESULT)"
    cat /tmp/admin_response.json
    exit 1
fi

# Test admin endpoint via proxy
print_status "Step 8: Testing admin endpoint via frontend proxy..."
PROXY_RESULT=$(curl -s -w "%{http_code}" -X POST http://localhost:5173/api/test/make-admin \
    -H "Content-Type: application/json" \
    -d '{"email":"proxy-test@example.com"}' \
    -o /tmp/proxy_response.json)

if [ "$PROXY_RESULT" = "200" ]; then
    print_success "Admin endpoint proxy test passed"
    cat /tmp/proxy_response.json && echo
else
    print_error "Admin endpoint proxy test failed (Status: $PROXY_RESULT)"
    cat /tmp/proxy_response.json
    exit 1
fi

# Run the specific failing E2E test
print_status "Step 9: Running admin E2E test against CI environment..."
cd frontend

if E2E_DOCKER=1 E2E_BASE_URL=http://localhost:5173 BACKEND_URL=http://127.0.0.1:3001 \
   npx playwright test --grep "admin can verify submitted draft and ad becomes public" --reporter=list; then
    print_success "Admin E2E test passed!"
else
    print_error "Admin E2E test failed!"
    exit 1
fi

cd ..

print_success "🎉 All tests passed! CI environment is working correctly."
print_status "The NODE_ENV=test fix resolves the admin endpoint issue."

echo
echo "📋 Test Summary:"
echo "- Backend health: ✅"
echo "- Admin endpoint (direct): ✅"
echo "- Admin endpoint (proxy): ✅"  
echo "- Admin E2E test: ✅"
echo
echo "🚀 Your CI should now pass completely!"
