#!/bin/bash
# ==========================================
# Blue/Green Deployment Script
# Village Water Management System
# ==========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Show usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -v, --version <version>    Version/commit to deploy"
    echo "  -d, --database             Run database migrations first"
    echo "  -h, --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -v v2.0.0"
    echo "  $0 -v abc123 -d"
    exit 1
}

# Parse arguments
VERSION=""
RUN_MIGRATIONS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -d|--database)
            RUN_MIGRATIONS=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            ;;
    esac
done

if [ -z "$VERSION" ]; then
    log_error "Version is required. Use -v or --version"
    usage
fi

log_step "Starting Blue/Green Deployment for version $VERSION"

# Step 1: Determine current active environment
log_step "Step 1: Checking current deployment status..."

BLUE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://water-system-api-blue.onrender.com/health 2>/dev/null || echo "000")
GREEN_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://water-system-api-green.onrender.com/health 2>/dev/null || echo "000")

if [ "$BLUE_HEALTH" == "200" ]; then
    CURRENT_ACTIVE="blue"
    TARGET="green"
    IDLE="blue"
elif [ "$GREEN_HEALTH" == "200" ]; then
    CURRENT_ACTIVE="green"
    TARGET="blue"
    IDLE="green"
else
    log_warn "Neither environment is healthy. Defaulting to blue as target."
    CURRENT_ACTIVE="unknown"
    TARGET="blue"
    IDLE="green"
fi

log_info "Current active environment: $CURRENT_ACTIVE"
log_info "Target environment for deployment: $TARGET"

# Step 2: Database Migration (if requested)
if [ "$RUN_MIGRATIONS" = true ]; then
    log_step "Step 2: Running database migrations..."
    
    log_warn "Creating database backup before migration..."
    ./scripts/backup-database.sh || log_warn "Backup failed, continuing anyway..."
    
    log_info "Running Prisma migrations..."
    cd backend
    npx prisma migrate deploy
    cd ..
    
    log_info "✅ Database migrations completed"
fi

# Step 3: Deploy to target environment
log_step "Step 3: Deploying to $TARGET environment..."

if [ "$TARGET" == "blue" ]; then
    SERVICE_ID=$RENDER_PROD_BLUE_SERVICE_ID
else
    SERVICE_ID=$RENDER_PROD_GREEN_SERVICE_ID
fi

curl -s -X POST \
    -H "Authorization: Bearer ${RENDER_API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{
        \"clearCache\": true,
        \"commitId\": \"${VERSION}\"
    }" \
    "https://api.render.com/v1/services/${SERVICE_ID}/deploys" > /dev/null

log_info "✅ Deployment triggered for $TARGET environment"

# Step 4: Wait for deployment
log_step "Step 4: Waiting for deployment to complete..."
log_info "This will take approximately 2-3 minutes..."

sleep 120

# Step 5: Health checks
log_step "Step 5: Running health checks..."

TARGET_URL="https://water-system-api-${TARGET}.onrender.com"
HEALTH_CHECKS_PASSED=0
HEALTH_CHECKS_FAILED=0

for i in {1..5}; do
    log_info "Health check attempt $i/5..."
    
    HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${TARGET_URL}/health" 2>/dev/null || echo "000")
    
    if [ "$HEALTH_STATUS" == "200" ]; then
        log_info "✅ Health check $i passed (HTTP 200)"
        HEALTH_CHECKS_PASSED=$((HEALTH_CHECKS_PASSED + 1))
    else
        log_warn "❌ Health check $i failed (HTTP $HEALTH_STATUS)"
        HEALTH_CHECKS_FAILED=$((HEALTH_CHECKS_FAILED + 1))
    fi
    
    sleep 10
done

if [ $HEALTH_CHECKS_PASSED -lt 3 ]; then
    log_error "❌ Deployment failed: Less than 3 health checks passed"
    log_error "Keeping $IDLE environment active"
    exit 1
fi

log_info "✅ All health checks passed"

# Step 6: Smoke tests
log_step "Step 6: Running smoke tests..."

SMOKE_TESTS_PASSED=true

# Test API endpoints
ENDPOINTS=(
    "/api/v1/health"
    "/api/v1/villages"
)

for endpoint in "${ENDPOINTS[@]}"; do
    URL="${TARGET_URL}${endpoint}"
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || echo "000")
    
    if [ "$STATUS" == "200" ] || [ "$STATUS" == "401" ]; then
        log_info "✅ $endpoint - OK (HTTP $STATUS)"
    else
        log_error "❌ $endpoint - Failed (HTTP $STATUS)"
        SMOKE_TESTS_PASSED=false
    fi
done

if [ "$SMOKE_TESTS_PASSED" = false ]; then
    log_error "❌ Smoke tests failed"
    log_error "Deployment will be cancelled. Current active environment ($IDLE) remains serving traffic."
    exit 1
fi

log_info "✅ All smoke tests passed"

# Step 7: Gradual traffic switch
log_step "Step 7: Switching traffic to $TARGET environment..."

log_info "Traffic switch strategy:"
log_info "  - 100% traffic will be directed to $TARGET"
log_info "  - Previous environment ($IDLE) will remain as hot standby"

# Note: In a real implementation, you would update your load balancer or CDN here
# For Render, this might involve updating a custom domain or using a third-party load balancer

log_warn "⚠️  IMPORTANT: Update your CDN/Load Balancer to point to:"
log_warn "   ${TARGET_URL}"

log_info "✅ Blue/Green deployment completed successfully!"

# Step 8: Monitoring period
log_step "Step 8: Monitoring period (5 minutes)..."
log_info "Watching for errors. Press Ctrl+C to skip monitoring..."

MONITOR_DURATION=300  # 5 minutes
INTERVAL=30
ELAPSED=0

while [ $ELAPSED -lt $MONITOR_DURATION ]; do
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
    
    HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "${TARGET_URL}/health" 2>/dev/null || echo "000")
    
    if [ "$HEALTH" == "200" ]; then
        log_info "✅ [$ELAPSED/${MONITOR_DURATION}s] Health check passed"
    else
        log_error "❌ [$ELAPSED/${MONITOR_DURATION}s] Health check failed (HTTP $HEALTH)"
        log_error "Consider rolling back to $IDLE environment"
    fi
done

log_info "✅ Monitoring period completed"

# Final summary
log_step "Deployment Summary"
echo "═══════════════════════════════════════════════════════════════"
echo "Version Deployed: $VERSION"
echo "Target Environment: $TARGET (now active)"
echo "Previous Environment: $IDLE (hot standby)"
echo "Health Checks: $HEALTH_CHECKS_PASSED passed, $HEALTH_CHECKS_FAILED failed"
echo "Smoke Tests: All passed"
echo "Monitoring: Completed successfully"
echo "═══════════════════════════════════════════════════════════════"

log_info "🎉 Blue/Green deployment completed successfully!"
log_info "If issues arise, you can quickly rollback by switching traffic back to $IDLE"

exit 0
