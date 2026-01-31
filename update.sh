#!/bin/bash

# Quick update script for VPS
# This script pulls latest changes and rebuilds only the application container
# Use this for code-only changes (UI, components, etc.)
# For database schema changes or full rebuilds, use deploy.sh instead

set -e  # Exit on error

echo "⚡ Starting quick update..."

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

# Rebuild only the application container (uses cache, much faster)
echo -e "${YELLOW}🔨 Rebuilding application container (using cache)...${NC}"
$DOCKER_COMPOSE build inquiry-pooler

# Restart only the application container
echo -e "${YELLOW}🔄 Restarting application container...${NC}"
$DOCKER_COMPOSE up -d inquiry-pooler

# Wait a bit for container to start
echo -e "${YELLOW}⏳ Waiting for container to start...${NC}"
sleep 5

# Check if container is running
echo -e "${YELLOW}🔍 Checking container status...${NC}"
if $DOCKER_COMPOSE ps inquiry-pooler | grep -q "Up"; then
    echo -e "${GREEN}✅ Quick update completed successfully!${NC}"
    echo -e "${GREEN}📊 Container status:${NC}"
    $DOCKER_COMPOSE ps inquiry-pooler
else
    echo -e "${RED}❌ Error: Container is not running!${NC}"
    echo -e "${YELLOW}💡 Tip: If this fails, try running ./deploy.sh for a full rebuild${NC}"
    $DOCKER_COMPOSE ps inquiry-pooler
    exit 1
fi

echo -e "${GREEN}✨ Application is now running at https://crm.zervtek.com${NC}"
echo -e "${YELLOW}ℹ️  Note: This script skips database migrations. Use ./deploy.sh if schema changes are needed.${NC}"
