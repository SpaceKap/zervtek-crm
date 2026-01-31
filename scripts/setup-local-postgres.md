# Local PostgreSQL Setup Guide

This guide walks you through setting up a local PostgreSQL database on your VPS with automated backups to Supabase.

## Prerequisites

- Docker and Docker Compose installed on VPS
- Access to your Supabase project (for backup URL)
- SSH access to your VPS

## Step 1: Update Environment Variables

Edit your `.env` file and add/update these variables:

```env
# Local PostgreSQL Connection (will be used after migration)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/inquiry_pooler?schema=inquiry_pooler

# Supabase Backup URL (direct connection, NOT pooler)
# Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
SUPABASE_BACKUP_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# PostgreSQL Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=inquiry_pooler
```

**Important:**
- Generate a strong password for `POSTGRES_PASSWORD`
- Use Supabase's **direct connection URL** (not pooler) for `SUPABASE_BACKUP_URL`
- The `DATABASE_URL` uses `postgres` as hostname (Docker service name)

## Step 2: Start PostgreSQL Container

```bash
# Start only PostgreSQL first
docker compose up -d postgres

# Wait for it to be ready (check logs)
docker compose logs -f postgres
# Press Ctrl+C when you see "database system is ready to accept connections"
```

## Step 3: Migrate Data from Supabase

```bash
# Run the migration script
./scripts/migrate-to-local-db.sh
```

This will:
1. Download all data from Supabase
2. Restore it to your local PostgreSQL
3. Preserve all your existing data

## Step 4: Update Application to Use Local Database

Update your `.env` file to use the local database URL:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/inquiry_pooler?schema=inquiry_pooler
```

## Step 5: Restart Application

```bash
# Restart the application to use local database
docker compose restart inquiry-pooler

# Or full restart
docker compose down
docker compose up -d
```

## Step 6: Verify Everything Works

1. Check application logs: `docker compose logs -f inquiry-pooler`
2. Test login and data access
3. Verify queries are faster

## Step 7: Set Up Automated Backups

Set up a cron job to backup to Supabase daily:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /path/to/inquiry-pooler && ./scripts/backup-to-supabase.sh >> /var/log/postgres-backup.log 2>&1
```

Or use systemd timer (recommended):

Create `/etc/systemd/system/postgres-backup.service`:
```ini
[Unit]
Description=PostgreSQL Backup to Supabase
After=docker.service

[Service]
Type=oneshot
User=your-user
WorkingDirectory=/path/to/inquiry-pooler
ExecStart=/path/to/inquiry-pooler/scripts/backup-to-supabase.sh
```

Create `/etc/systemd/system/postgres-backup.timer`:
```ini
[Unit]
Description=Daily PostgreSQL Backup Timer

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable timer:
```bash
sudo systemctl enable postgres-backup.timer
sudo systemctl start postgres-backup.timer
```

## Performance Tuning

After setup, you can optimize PostgreSQL performance by editing the configuration:

1. SSH into PostgreSQL container:
   ```bash
   docker compose exec postgres sh
   ```

2. Edit `/var/lib/postgresql/data/postgresql.conf` (if mounted) or use environment variables

3. Recommended settings based on VPS RAM:
   - **2GB RAM**: `shared_buffers=512MB`, `effective_cache_size=1536MB`
   - **4GB RAM**: `shared_buffers=1GB`, `effective_cache_size=3GB`
   - **8GB+ RAM**: `shared_buffers=2GB`, `effective_cache_size=6GB`

## Troubleshooting

### Connection Issues

If the application can't connect to PostgreSQL:

1. Check if PostgreSQL is running:
   ```bash
   docker compose ps postgres
   ```

2. Check logs:
   ```bash
   docker compose logs postgres
   ```

3. Verify network:
   ```bash
   docker compose exec inquiry-pooler ping postgres
   ```

### Backup Issues

If backups fail:

1. Verify `SUPABASE_BACKUP_URL` is correct (use direct connection, not pooler)
2. Check network connectivity to Supabase
3. Verify credentials are correct

### Performance Issues

1. Check PostgreSQL logs for slow queries
2. Verify indexes are created: `docker compose exec postgres psql -U postgres -d inquiry_pooler -c "\di"`
3. Analyze query performance: `docker compose exec postgres psql -U postgres -d inquiry_pooler -c "EXPLAIN ANALYZE SELECT ..."`

## Rollback Plan

If you need to rollback to Supabase:

1. Update `.env` to use Supabase URL
2. Restart application: `docker compose restart inquiry-pooler`

Your Supabase database remains unchanged and can be used immediately.
