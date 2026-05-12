#!/bin/bash
# ==========================================
# Rollback Script
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
    echo "  -t, --target <backend|frontend|database|all>  Target component to rollback"
    echo "  -v, --version <version>                        Version to rollback to"
    echo "  -e, --environment <prod|staging>               Environment (default: prod)"
    echo "  -b, --backup <timestamp>                     Backup timestamp for database"
    echo "  -h, --help                                     Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -t backend -v v1.2.3"
    echo "  $0 -t database -b 20260226_020000"
    echo "  $0 -t all -v v1.2.3 -e staging"
    exit 1
}

# Parse arguments
TARGET=""
VERSION=""
ENVIRONMENT="prod"
BACKUP_TIMESTAMP=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--target)
            TARGET="$2"
            shift 2
            ;;
        -v|--version)
            VERSION="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -b|--backup)
            BACKUP_TIMESTAMP="$2"
            shift 2
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

# Validate required arguments
if [ -z "$TARGET" ]; then
    log_error "Target is required. Use -t or --target"
    usage
fi

if [ "$TARGET" != "database" ] && [ -z "$VERSION" ]; then
    log_error "Version is required for non-database rollbacks. Use -v or --version"
    usage
fi

if [ "$TARGET" == "database" ] && [ -z "$BACKUP_TIMESTAMP" ]; then
    log_error "Backup timestamp is required for database rollback. Use -b or --backup"
    usage
fi

log_step "Starting rollback process..."
log_info "Target: $TARGET"
log_info "Environment: $ENVIRONMENT"
[ -n "$VERSION" ] && log_info "Version: $VERSION"
[ -n "$BACKUP_TIMESTAMP" ] && log_info "Backup: $BACKUP_TIMESTAMP"

# Confirmation
if [ "$ENVIRONMENT" == "prod" ]; then
    echo ""
    log_warn "⚠️  You are about to rollback PRODUCTION environment!"
    log_warn "This will cause service interruption."
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Rollback cancelled by user"
        exit 0
    fi
fi

# Rollback Backend
rollback_backend() {
    log_step "Rolling back Backend to version $VERSION..."
    
    # Determine service ID based on environment
    if [ "$ENVIRONMENT" == "prod" ]; then
        # For production, rollback both blue and green
        log_info "Rolling back production (blue/green)..."
        
        # Rollback blue
        curl -X POST \
            -H "Authorization: Bearer ${RENDER_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"commitId\": \"${VERSION}\"}" \
            "https://api.render.com/v1/services/${RENDER_PROD_BLUE_SERVICE_ID}/deploys" \
            && log_info "Blue environment rollback initiated" \
            || log_error "Failed to rollback blue environment"
        
        # Rollback green
        curl -X POST \
            -H "Authorization: Bearer ${RENDER_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"commitId\": \"${VERSION}\"}" \
            "https://api.render.com/v1/services/${RENDER_PROD_GREEN_SERVICE_ID}/deploys" \
            && log_info "Green environment rollback initiated" \
            || log_error "Failed to rollback green environment"
    else
        # Staging rollback
        curl -X POST \
            -H "Authorization: Bearer ${RENDER_API_KEY}" \
            -H "Content-Type: application/json" \
            -d "{\"commitId\": \"${VERSION}\"}" \
            "https://api.render.com/v1/services/${RENDER_STAGING_SERVICE_ID}/deploys" \
            && log_info "Staging rollback initiated" \
            || log_error "Failed to rollback staging environment"
    fi
    
    log_info "Waiting for rollback to complete (60s)..."
    sleep 60
    
    # Verify rollback
    log_step "Verifying backend rollback..."
    if [ "$ENVIRONMENT" == "prod" ]; then
        HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://water-system-api-blue.onrender.com/health" || echo "000")
    else
        HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://water-system-api-staging.onrender.com/health" || echo "000")
    fi
    
    if [ "$HEALTH" == "200" ]; then
        log_info "✅ Backend rollback successful"
    else
        log_error "❌ Backend health check failed (HTTP $HEALTH)"
        exit 1
    fi
}

# Rollback Frontend
rollback_frontend() {
    log_step "Rolling back Frontend..."
    
    cd frontend || exit 1
    
    if [ "$ENVIRONMENT" == "prod" ]; then
        vercel rollback --yes \
            && log_info "✅ Frontend rollback successful" \
            || log_error "❌ Frontend rollback failed"
    else
        # For staging, redeploy specific version
        vercel --yes \
            && log_info "✅ Frontend staging rollback successful" \
            || log_error "❌ Frontend staging rollback failed"
    fi
}

# Rollback Database
rollback_database() {
    log_step "Rolling back Database to backup: $BACKUP_TIMESTAMP..."
    
    if [ -z "$NEON_API_KEY" ] || [ -z "$NEON_PROJECT_ID" ]; then
        log_error "Neon API credentials not configured"
        exit 1
    fi
    
    log_warn "⚠️  This will restore the database to the state at $BACKUP_TIMESTAMP"
    log_warn "All data after this timestamp will be lost!"
    echo ""
    read -p "Type 'RESTORE' to confirm: " confirm
    if [ "$confirm" != "RESTORE" ]; then
        log_info "Database rollback cancelled by user"
        exit 0
    fi
    
    # Parse timestamp for point-in-time recovery
    YEAR=${BACKUP_TIMESTAMP:0:4}
    MONTH=${BACKUP_TIMESTAMP:4:2}
    DAY=${BACKUP_TIMESTAMP:6:2}
    HOUR=${BACKUP_TIMESTAMP:9:2}
    MIN=${BACKUP_TIMESTAMP:11:2}
    SEC=${BACKUP_TIMESTAMP:13:2}
    
    PIT_TIMESTAMP="${YEAR}-${MONTH}-${DAY}T${HOUR}:${MIN}:${SEC}Z"
    
    log_info "Restoring database to point-in-time: $PIT_TIMESTAMP"
    
    # Restore using Neon API
    curl -sSf "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
        -H "Authorization: Bearer ${NEON_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"branch\": {
                \"name\": \"restore-${BACKUP_TIMESTAMP}\",
                \"parent_id\": \"${NEON_MAIN_BRANCH_ID}\",
                \"point_in_time\": \"${PIT_TIMESTAMP}\"
            }
        }" > /dev/null 2>&1 && \
        log_info "✅ Database restore initiated" || \
        log_error "❌ Database restore failed"
    
    log_info "Note: You may need to update DATABASE_URL to point to the restored branch"
}

# Execute rollback based on target
case $TARGET in
    backend)
        rollback_backend
        ;;
    frontend)
        rollback_frontend
        ;;
    database)
        rollback_database
        ;;
    all)
        log_step "Executing full system rollback..."
        rollback_database
        rollback_backend
        rollback_frontend
        log_info "✅ Full system rollback completed"
        ;;
    *)
        log_error "Unknown target: $TARGET"
        usage
        ;;
esac

log_step "Rollback process completed!"
exit 0
