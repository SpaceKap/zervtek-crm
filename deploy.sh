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

# Pull latest changes from Git (reset to match remote so deploy is reproducible)
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git fetch origin main
git reset --hard origin/main

# Build and restart containers
echo -e "${YELLOW}🔨 Building and restarting Docker containers...${NC}"
$DOCKER_COMPOSE down
$DOCKER_COMPOSE build --no-cache
$DOCKER_COMPOSE up -d

# Wait a bit for container to start
echo -e "${YELLOW}⏳ Waiting for container to start...${NC}"
sleep 10

# One-time data migrations (PROPOSAL_SENT -> DEPOSIT) were run when the enum was still present.
# Skip that step now; schema no longer has PROPOSAL_SENT so the script would fail.
echo -e "${GREEN}✅ Data migration step skipped (already applied)${NC}"

# Run Prisma migrations
echo -e "${YELLOW}🗄️  Running database schema migrations...${NC}"
# Use npm run which should work if package.json and prisma are installed
$DOCKER_COMPOSE exec -T inquiry-pooler sh -c "cd /app && npm run db:push -- --skip-generate --accept-data-loss" || {
    echo -e "${YELLOW}⚠️  Migration failed, trying direct prisma command...${NC}"
    $DOCKER_COMPOSE exec -T inquiry-pooler sh -c "cd /app && ./node_modules/.bin/prisma db push --schema=packages/db/prisma/schema.prisma --skip-generate --accept-data-loss"
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
