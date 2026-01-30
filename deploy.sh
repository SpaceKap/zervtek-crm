#!/bin/bash

# Deployment script for VPS
# This script pulls latest changes from Git and redeploys the application

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Detect docker compose command (docker compose or docker-compose)
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
elif docker-compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}❌ Error: Neither 'docker compose' nor 'docker-compose' found!${NC}"
    echo "Please install Docker Compose."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and fill in the required values."
    exit 1
fi

# Pull latest changes from Git
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git pull origin main --no-rebase || git pull origin master --no-rebase

# Build and restart containers
echo -e "${YELLOW}🔨 Building and restarting Docker containers...${NC}"
$DOCKER_COMPOSE down
$DOCKER_COMPOSE build --no-cache
$DOCKER_COMPOSE up -d

# Wait a bit for container to start
echo -e "${YELLOW}⏳ Waiting for container to start...${NC}"
sleep 10

# Run data migration if needed (before schema changes)
# Migrate PROPOSAL_SENT status to DEPOSIT using SQL file
echo -e "${YELLOW}🔄 Running data migrations (PROPOSAL_SENT -> DEPOSIT)...${NC}"
if [ -f "scripts/migrate-proposal-sent.sql" ]; then
    $DOCKER_COMPOSE exec -T inquiry-pooler sh -c "cd /app && cat scripts/migrate-proposal-sent.sql | npx prisma db execute --stdin" || {
        echo -e "${YELLOW}⚠️  Data migration failed or no records to migrate${NC}"
    }
else
    echo -e "${YELLOW}⚠️  Migration SQL file not found, skipping data migration${NC}"
fi
echo -e "${GREEN}✅ Data migration step completed${NC}"

# Run Prisma migrations
echo -e "${YELLOW}🗄️  Running database schema migrations...${NC}"
# Use npm run which should work if package.json and prisma are installed
$DOCKER_COMPOSE exec -T inquiry-pooler sh -c "cd /app && npm run db:push -- --skip-generate --accept-data-loss" || {
    echo -e "${YELLOW}⚠️  Migration failed, trying direct prisma command...${NC}"
    $DOCKER_COMPOSE exec -T inquiry-pooler sh -c "cd /app && ./node_modules/.bin/prisma db push --skip-generate --accept-data-loss || node_modules/prisma/build/index.js db push --skip-generate --accept-data-loss"
}

# Check if containers are running
echo -e "${YELLOW}🔍 Checking container status...${NC}"
if $DOCKER_COMPOSE ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo -e "${GREEN}📊 Container status:${NC}"
    $DOCKER_COMPOSE ps
else
    echo -e "${RED}❌ Error: Some containers are not running!${NC}"
    $DOCKER_COMPOSE ps
    exit 1
fi

echo -e "${GREEN}✨ Application is now running at https://crm.zervtek.com${NC}"
