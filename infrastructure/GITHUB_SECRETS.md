# ==========================================
# GitHub Secrets Configuration Guide
# Village Water Management System
# ==========================================

This document lists all the GitHub Secrets required for the CI/CD pipeline.

## Required Secrets

### Database
| Secret | Description |
|--------|-------------|
| `PROD_DATABASE_URL` | Neon PostgreSQL connection string for production |
| `STAGING_DATABASE_URL` | Neon PostgreSQL connection string for staging |

### Vercel (Deployment)
| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel authentication token ([create here](https://vercel.com/account/tokens)) |
| `VERCEL_ORG_ID` | Vercel organization/team ID (found in `.vercel/project.json` after `vercel link`) |
| `VERCEL_PROJECT_ID` | Vercel project ID (found in `.vercel/project.json` after `vercel link`) |

### Application
| Secret | Description |
|--------|-------------|
| `NEXTAUTH_SECRET` | NextAuth.js secret key (32+ characters) |
| `PROD_URL` | Production URL (e.g., `https://water-system.vercel.app`) |
| `STAGING_URL` | Staging URL (e.g., `https://water-system-staging.vercel.app`) |

### Cloudinary (Image Uploads)
| Secret | Description |
|--------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |

### Optional
| Secret | Description |
|--------|-------------|
| `SLACK_WEBHOOK_URL` | Slack webhook for deployment notifications |

## How to Add Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add each secret with its corresponding value

## How to Get Vercel Credentials

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Link your project (run in project root)
vercel link

# 4. Get your credentials from .vercel/project.json
cat .vercel/project.json
# Output: { "orgId": "...", "projectId": "..." }

# 5. Create token at https://vercel.com/account/tokens
```

## Environment Variables for Vercel

Set these in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Your NextAuth secret key |
| `NEXTAUTH_URL` | Your production/preview URL |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Your Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Your Cloudinary API secret |

## Secret Rotation Schedule

- `NEXTAUTH_SECRET`: Rotate every 90 days
- `VERCEL_TOKEN`: Rotate every 180 days
- Database passwords: Rotate every 180 days
