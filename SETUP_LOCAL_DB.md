# 🚀 Local PostgreSQL Setup - Quick Start Guide

This guide will help you migrate from Supabase to a local PostgreSQL database on your VPS for **2-5x faster performance**.

## 📋 What You'll Get

- ✅ **2-5x faster queries** (no network latency)
- ✅ **Automated daily backups** to Supabase
- ✅ **Same data** (migrated from Supabase)
- ✅ **Easy rollback** if needed

## 🎯 Step-by-Step Setup

### Step 1: Update `.env` File

Add these variables to your `.env` file:

```env
# Local PostgreSQL (will use after migration)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@postgres:5432/inquiry_pooler?schema=inquiry_pooler

# Supabase Backup URL (get from Supabase Dashboard -> Settings -> Database)
# Use "Direct connection" NOT "Connection pooling"
SUPABASE_BACKUP_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres

# PostgreSQL Container Settings
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=inquiry_pooler
```

**Important:** 
- Generate a strong password for `POSTGRES_PASSWORD`
- Get `SUPABASE_BACKUP_URL` from Supabase Dashboard (Direct connection, not pooler)

### Step 2: Install PostgreSQL Client Tools (if needed)

On your VPS, run:
```bash
./scripts/install-pg-tools.sh
```

### Step 3: Start PostgreSQL Container

```bash
# Start PostgreSQL first
docker compose up -d postgres

# Wait for it to be ready (watch logs)
docker compose logs -f postgres
# Press Ctrl+C when you see "database system is ready"
```

### Step 4: Migrate Data from Supabase

```bash
# This will download all data from Supabase and restore to local DB
./scripts/migrate-to-local-db.sh
```

This preserves all your existing data!

### Step 5: Update Application Connection

Your `.env` should already have the local `DATABASE_URL`. Restart the app:

```bash
docker compose restart inquiry-pooler
```

### Step 6: Verify Everything Works

1. Check logs: `docker compose logs -f inquiry-pooler`
2. Test login at your site
3. Verify data is there
4. Notice the speed improvement! 🚀

### Step 7: Set Up Automated Backups

**Option A: Cron (Simple)**
```bash
crontab -e
# Add this line (runs daily at 2 AM):
0 2 * * * cd /path/to/inquiry-pooler && ./scripts/backup-to-supabase.sh >> /var/log/postgres-backup.log 2>&1
```

**Option B: Systemd Timer (Recommended)**
See `scripts/setup-local-postgres.md` for detailed systemd setup.

## 📊 Expected Performance Improvement

| Operation | Before (Supabase) | After (Local) | Improvement |
|-----------|-------------------|--------------|-------------|
| Simple queries | 20-50ms | 1-5ms | **4-10x faster** |
| Complex queries | 50-200ms | 5-20ms | **5-10x faster** |
| Bulk operations | 200-1000ms | 50-200ms | **4-5x faster** |

## 🔄 Rollback Plan

If you need to go back to Supabase:

1. Update `.env` to use Supabase URL
2. Restart: `docker compose restart inquiry-pooler`

Your Supabase database is unchanged and ready to use immediately.

## 📚 Detailed Documentation

For troubleshooting and advanced configuration, see:
- `scripts/setup-local-postgres.md` - Full setup guide
- `scripts/backup-to-supabase.sh` - Backup script
- `scripts/migrate-to-local-db.sh` - Migration script

## 🆘 Need Help?

Check the troubleshooting section in `scripts/setup-local-postgres.md`
