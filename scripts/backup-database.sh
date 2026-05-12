#!/bin/bash
# ==========================================
# Database Backup Script
# Village Water Management System
# ==========================================

set -e

# Configuration
BACKUP_DIR="/tmp/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="water_system_${DATE}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"
S3_BUCKET="${S3_BUCKET_NAME:-water-system-backups}"
RETENTION_DAYS=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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

# Create backup directory
mkdir -p "${BACKUP_DIR}"

log_info "Starting database backup..."
log_info "Backup file: ${BACKUP_FILE}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL environment variable is not set"
    exit 1
fi

# Create backup using pg_dump
log_info "Creating database dump..."
if pg_dump "${DATABASE_URL}" \
    --verbose \
    --format=custom \
    --file="${BACKUP_DIR}/${BACKUP_FILE}"; then
    log_info "Database dump created successfully"
else
    log_error "Failed to create database dump"
    exit 1
fi

# Compress backup
log_info "Compressing backup..."
if gzip -f "${BACKUP_DIR}/${BACKUP_FILE}"; then
    log_info "Backup compressed successfully"
else
    log_error "Failed to compress backup"
    exit 1
fi

# Upload to S3 (if AWS credentials are available)
if [ -n "$AWS_ACCESS_KEY_ID" ] && [ -n "$AWS_SECRET_ACCESS_KEY" ]; then
    log_info "Uploading backup to S3..."
    
    if aws s3 cp "${BACKUP_DIR}/${COMPRESSED_FILE}" \
        "s3://${S3_BUCKET}/database/${COMPRESSED_FILE}" \
        --storage-class STANDARD_IA; then
        log_info "Backup uploaded to S3 successfully"
        
        # Remove local backup after successful upload
        rm -f "${BACKUP_DIR}/${COMPRESSED_FILE}"
        log_info "Local backup removed"
    else
        log_error "Failed to upload backup to S3"
        log_warn "Keeping local backup at ${BACKUP_DIR}/${COMPRESSED_FILE}"
    fi
    
    # Cleanup old backups (retention policy)
    log_info "Cleaning up old backups (retention: ${RETENTION_DAYS} days)..."
    aws s3 ls "s3://${S3_BUCKET}/database/" | \
        awk '{print $4}' | \
        while read -r file; do
            file_date=$(echo "$file" | grep -oP '\d{8}_\d{6}' || true)
            if [ -n "$file_date" ]; then
                file_timestamp=$(date -d "${file_date:0:4}-${file_date:4:2}-${file_date:6:2} ${file_date:9:2}:${file_date:11:2}:${file_date:13:2}" +%s 2>/dev/null || date -j -f "%Y%m%d_%H%M%S" "$file_date" +%s 2>/dev/null)
                current_timestamp=$(date +%s)
                age_days=$(( (current_timestamp - file_timestamp) / 86400 ))
                
                if [ $age_days -gt $RETENTION_DAYS ]; then
                    log_info "Deleting old backup: $file (age: ${age_days} days)"
                    aws s3 rm "s3://${S3_BUCKET}/database/${file}"
                fi
            fi
        done
else
    log_warn "AWS credentials not available, skipping S3 upload"
    log_info "Backup saved locally at: ${BACKUP_DIR}/${COMPRESSED_FILE}"
fi

# Create Neon branch backup (if Neon API key is available)
if [ -n "$NEON_API_KEY" ] && [ -n "$NEON_PROJECT_ID" ]; then
    log_info "Creating Neon branch backup..."
    
    BRANCH_NAME="backup-${DATE}"
    
    curl -sSf "https://console.neon.tech/api/v2/projects/${NEON_PROJECT_ID}/branches" \
        -H "Authorization: Bearer ${NEON_API_KEY}" \
        -H "Content-Type: application/json" \
        -d "{
            \"branch\": {
                \"name\": \"${BRANCH_NAME}\"
            }
        }" > /dev/null 2>&1 && \
        log_info "Neon branch backup created: ${BRANCH_NAME}" || \
        log_warn "Failed to create Neon branch backup"
fi

log_info "Backup process completed successfully!"
exit 0
