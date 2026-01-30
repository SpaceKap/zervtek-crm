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

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and fill in the required values."
    exit 1
fi

# Pull latest changes from Git
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git pull origin main || git pull origin master

# Build and restart containers
echo -e "${YELLOW}🔨 Building and restarting Docker containers...${NC}"
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 10

# Run Prisma migrations
echo -e "${YELLOW}🗄️  Running database migrations...${NC}"
docker-compose exec -T inquiry-pooler npm run db:push || {
    echo -e "${YELLOW}⚠️  Migration failed, trying to generate Prisma client first...${NC}"
    docker-compose exec -T inquiry-pooler npx prisma generate
    docker-compose exec -T inquiry-pooler npm run db:push
}

# Check if containers are running
echo -e "${YELLOW}🔍 Checking container status...${NC}"
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
    echo -e "${GREEN}📊 Container status:${NC}"
    docker-compose ps
else
    echo -e "${RED}❌ Error: Some containers are not running!${NC}"
    docker-compose ps
    exit 1
fi

echo -e "${GREEN}✨ Application is now running at https://crm.zervtek.com${NC}"
