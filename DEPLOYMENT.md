# Deployment Guide

## Quick Deploy (Docker - Recommended)

### 1. Pull Latest Changes

```bash
cd ~/inquiry-pooler  # or your project directory
git pull origin main
```

### 2. Rebuild and Deploy

```bash
# Stop existing containers
docker-compose down

# Rebuild and start (this will pull latest code and rebuild)
docker-compose up -d --build

# View logs to ensure everything started correctly
docker-compose logs -f inquiry-pooler
```

### 3. Run Database Migrations (if schema changed)

```bash
# If Prisma schema was updated, run migrations
docker-compose exec inquiry-pooler npx prisma db push
# OR
docker-compose exec inquiry-pooler npx prisma migrate deploy
```

### 4. Verify Deployment

```bash
# Check container status
docker-compose ps

# Check logs for errors
docker-compose logs inquiry-pooler | tail -50

# Test the application
curl http://localhost:3000/api/health  # if you have a health endpoint
```

---

## Alternative: Quick Restart (No Rebuild)

If you only need to restart without rebuilding:

```bash
cd ~/inquiry-pooler
git pull origin main
docker-compose restart inquiry-pooler
```

**Note:** This only works if no dependencies or build configuration changed.

---

## Alternative: PM2 Deployment (Non-Docker)

### 1. Pull Latest Changes

```bash
cd ~/inquiry-pooler
git pull origin main
```

### 2. Install Dependencies (if package.json changed)

```bash
npm install
```

### 3. Generate Prisma Client

```bash
npm run db:generate
```

### 4. Run Database Migrations

```bash
npm run db:push
# OR
npm run db:migrate
```

### 5. Build Application

```bash
npm run build
```

### 6. Restart with PM2

```bash
# Stop existing process
pm2 stop inquiry-pooler

# Start with new build
pm2 start npm --name "inquiry-pooler" -- start

# Or restart if already running
pm2 restart inquiry-pooler

# View logs
pm2 logs inquiry-pooler
```

---

## Deployment Checklist

Before deploying, ensure:

- [ ] All environment variables are set in `.env` file (or Docker environment)
- [ ] Database is accessible and migrations are up to date
- [ ] Build completes without errors (`npm run build`)
- [ ] No TypeScript errors
- [ ] Database schema is synced (`npx prisma db push` or `npx prisma migrate deploy`)

---

## Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs inquiry-pooler

# Check if database is running
docker-compose ps postgres

# Rebuild from scratch
docker-compose down
docker-compose up -d --build
```

### Database connection errors

```bash
# Verify DATABASE_URL in .env matches docker-compose.yml
# Check database is healthy
docker-compose exec postgres pg_isready -U postgres

# Run migrations manually
docker-compose exec inquiry-pooler npx prisma db push
```

### Build errors

```bash
# Clean build cache
rm -rf .next node_modules/.cache

# Rebuild
docker-compose up -d --build
```

---

## Environment Variables Required

Make sure these are set in your `.env` file or Docker environment:

```env
DATABASE_URL="postgresql://user:password@postgres:5432/inquiry_pooler"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

---

## Post-Deployment Verification

1. **Check Application Health**
   - Visit your domain and verify login works
   - Test key features (dashboard, kanban, inquiries)

2. **Check Logs**
   ```bash
   docker-compose logs -f inquiry-pooler
   ```

3. **Monitor Performance**
   - Check container resource usage: `docker stats`
   - Monitor application logs for errors

---

## Rollback (if needed)

If deployment fails and you need to rollback:

```bash
# Find previous working commit
git log --oneline

# Checkout previous commit
git checkout <previous-commit-hash>

# Rebuild and deploy
docker-compose down
docker-compose up -d --build
```

Or restore from a previous Docker image if you've tagged versions.
