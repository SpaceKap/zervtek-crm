# VPS Deployment Guide

This guide explains how to deploy the CRM application to your VPS at `crm.zervtek.com`.

## Prerequisites

- VPS with Docker and Docker Compose installed
- Caddy reverse proxy already configured
- Git access to the repository
- Domain `crm.zervtek.com` pointing to your VPS IP

## Initial Setup

### 1. Clone Repository on VPS

```bash
cd ~
git clone <your-repo-url> inquiry-pooler
cd inquiry-pooler
```

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit the .env file with your actual values
nano .env
```

**Required environment variables:**

- `DATABASE_URL`: Use `postgresql://postgres:YOUR_PASSWORD@crm-db:5432/inquiry_pooler?schema=inquiry_pooler`
- `POSTGRES_PASSWORD`: Strong password for PostgreSQL
- `NEXTAUTH_URL`: `https://crm.zervtek.com`
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret

### 3. Update Caddyfile

Add the following block to your Caddyfile (inside the Caddy container):

```bash
docker exec -it caddy cat /etc/caddy/Caddyfile
```

Add this configuration:

```caddy
crm.zervtek.com {
	reverse_proxy inquiry-pooler:3000
}
```

Then reload Caddy:

```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

Or restart Caddy:

```bash
docker restart caddy
```

### 4. Initial Deployment

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run initial deployment
./deploy.sh
```

The script will:

1. Pull latest changes from Git
2. Build Docker images
3. Start containers
4. Run database migrations

### 5. Verify Deployment

- Check container status: `docker-compose ps`
- Check application logs: `docker-compose logs -f inquiry-pooler`
- Visit `https://crm.zervtek.com` in your browser

## Future Deployments

For future updates, simply run:

```bash
./deploy.sh
```

This will pull the latest changes and redeploy automatically.

## Manual Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f inquiry-pooler
docker-compose logs -f crm-db
```

### Stop Services

```bash
docker-compose down
```

### Start Services

```bash
docker-compose up -d
```

### Run Database Migrations Manually

```bash
docker-compose exec inquiry-pooler npm run db:push
```

### Access Database

```bash
docker-compose exec crm-db psql -U postgres -d inquiry_pooler
```

### Rebuild After Code Changes

```bash
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Container Won't Start

1. Check logs: `docker-compose logs inquiry-pooler`
2. Verify environment variables: `docker-compose config`
3. Check database connection: `docker-compose exec inquiry-pooler npx prisma db push`

### Database Connection Issues

1. Verify `DATABASE_URL` uses `crm-db` as hostname (not `localhost`)
2. Check database is healthy: `docker-compose ps crm-db`
3. Check database logs: `docker-compose logs crm-db`

### Caddy Not Routing

1. Verify Caddyfile includes the `crm.zervtek.com` block
2. Check Caddy logs: `docker logs caddy`
3. Reload Caddy: `docker exec caddy caddy reload --config /etc/caddy/Caddyfile`

### Prisma Migration Issues

```bash
# Generate Prisma client
docker-compose exec inquiry-pooler npx prisma generate

# Push schema to database
docker-compose exec inquiry-pooler npm run db:push
```

## Network Configuration

The application uses the `caddy_proxy` network to communicate with Caddy. This network should already exist from your other services. If it doesn't exist, create it:

```bash
docker network create caddy_proxy
```

## Backup Database

```bash
# Create backup
docker-compose exec crm-db pg_dump -U postgres inquiry_pooler > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose exec -T crm-db psql -U postgres inquiry_pooler < backup_file.sql
```

## Security Notes

- Never commit `.env` file to Git
- Use strong passwords for `POSTGRES_PASSWORD` and `NEXTAUTH_SECRET`
- Keep Docker and system packages updated
- Regularly backup your database
- Monitor application logs for errors
