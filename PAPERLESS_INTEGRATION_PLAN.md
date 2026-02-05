# Paperless-ngx + Google Drive Integration Plan

## ✅ Feasibility: **Highly Possible**

This integration is very feasible. Here's the complete implementation plan:

## Architecture Overview

```
Mobile/Desktop → CRM (Next.js) → Upload API → [Paperless-ngx API] + [Google Drive API]
                                      ↓                ↓
                              Paperless-ngx        Google Drive
                              (Document Archive)   (Cloud Backup)
```

## Step 1: Set Up Paperless-ngx on VPS

### Docker Compose Setup

Create `docker-compose.paperless.yml`:

```yaml
version: "3.8"
services:
  paperless:
    image: ghcr.io/paperless-ngx/paperless-ngx:latest
    container_name: paperless
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      PAPERLESS_URL: http://paperless.yourdomain.com
      PAPERLESS_SECRET_KEY: your-secret-key-here
      PAPERLESS_TIME_ZONE: Asia/Tokyo
      PAPERLESS_OCR_LANGUAGE: eng+jpn
      PAPERLESS_CONSUMPTION_DIR: /usr/src/paperless/consume
      PAPERLESS_DATA_DIR: /usr/src/paperless/data
      PAPERLESS_MEDIA_ROOT: /usr/src/paperless/media
      PAPERLESS_STATICFILES_DIR: /usr/src/paperless/static
      PAPERLESS_DBENGINE: postgresql
      PAPERLESS_DBNAME: paperless
      PAPERLESS_DBUSER: paperless
      PAPERLESS_DBPASS: your-password
      PAPERLESS_DBHOST: db
      PAPERLESS_DBPORT: 5432
      PAPERLESS_REDIS: redis://redis:6379
    volumes:
      - paperless_data:/usr/src/paperless/data
      - paperless_media:/usr/src/paperless/media
      - paperless_export:/usr/src/paperless/export
      - paperless_consume:/usr/src/paperless/consume
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    container_name: paperless-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: paperless
      POSTGRES_USER: paperless
      POSTGRES_PASSWORD: your-password
    volumes:
      - paperless_db:/var/lib/postgresql/data

  redis:
    image: redis:7
    container_name: paperless-redis
    restart: unless-stopped

volumes:
  paperless_data:
  paperless_media:
  paperless_export:
  paperless_consume:
  paperless_db:
```

## Step 2: Database Schema for Documents

Add Document model to Prisma schema (see implementation below).

## Step 3: Required Packages

```bash
npm install googleapis form-data axios
npm install -D @types/form-data
```

## Step 4: API Endpoints Needed

1. `/api/documents/upload` - Upload files
2. `/api/documents` - List documents
3. `/api/documents/[id]` - Get/Delete document
4. `/api/documents/sync` - Sync to Paperless/Drive

## Step 5: Mobile Optimization

- Add viewport meta tag
- Responsive components
- Camera API for mobile scanning
- Touch-optimized file picker

## Implementation Complexity

- **Paperless Integration**: Medium (well-documented REST API)
- **Google Drive API**: Medium (good SDK support)
- **File Upload**: Easy (Next.js built-in support)
- **Mobile Optimization**: Medium (responsive + camera)
- **Total Time**: 3-4 weeks for full implementation

## Benefits

✅ Centralized document management
✅ OCR text search (via Paperless)
✅ Automatic cloud backup (Google Drive)
✅ Mobile scanning support
✅ Documents linked to CRM entities
