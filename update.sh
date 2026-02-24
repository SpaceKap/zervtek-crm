#!/bin/bash

# Quick update script for VPS
# Pulls latest, rebuilds inquiry-pooler (CRM) and customer-portal, restarts both.
# Use for code-only changes. For DB schema or full rebuilds, use deploy.sh instead.

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

# Optional: force rebuild without cache (use if UI/code changes don't appear after update)
NO_CACHE=""
if [ "$1" = "--no-cache" ]; then
    echo -e "${YELLOW}🔄 No-cache build requested (ignoring Docker cache)${NC}"
    NO_CACHE="--no-cache"
fi

# Pull latest changes from Git
echo -e "${YELLOW}📥 Pulling latest changes from Git...${NC}"
git pull origin main --no-rebase || git pull origin master --no-rebase

echo -e "${GREEN}📌 Deploying commit: $(git rev-parse --short HEAD) - $(git log -1 --oneline)${NC}"

# Rebuild application and customer-portal containers
echo -e "${YELLOW}🔨 Rebuilding application container...${NC}"
$DOCKER_COMPOSE build $NO_CACHE inquiry-pooler

echo -e "${YELLOW}🔨 Rebuilding customer-portal container...${NC}"
$DOCKER_COMPOSE build $NO_CACHE customer-portal

# Restart application and customer-portal containers
echo -e "${YELLOW}🔄 Restarting application container...${NC}"
$DOCKER_COMPOSE up -d inquiry-pooler

echo -e "${YELLOW}🔄 Restarting customer-portal container...${NC}"
$DOCKER_COMPOSE up -d customer-portal

# Wait a bit for containers to start
echo -e "${YELLOW}⏳ Waiting for containers to start...${NC}"
sleep 5

# Check if containers are running
echo -e "${YELLOW}🔍 Checking container status...${NC}"
FAILED=0
if $DOCKER_COMPOSE ps inquiry-pooler | grep -q "Up"; then
    echo -e "${GREEN}✅ inquiry-pooler is running${NC}"
else
    echo -e "${RED}❌ inquiry-pooler is not running!${NC}"
    FAILED=1
fi
if $DOCKER_COMPOSE ps customer-portal | grep -q "Up"; then
    echo -e "${GREEN}✅ customer-portal is running${NC}"
else
    echo -e "${RED}❌ customer-portal is not running!${NC}"
    FAILED=1
fi

if [ $FAILED -eq 1 ]; then
    echo -e "${RED}❌ Error: One or more containers are not running!${NC}"
    echo -e "${YELLOW}💡 Tip: If this fails, try running ./deploy.sh for a full rebuild${NC}"
    $DOCKER_COMPOSE ps inquiry-pooler customer-portal
    exit 1
fi

echo -e "${GREEN}✅ Quick update completed successfully!${NC}"
echo -e "${GREEN}📊 Container status:${NC}"
$DOCKER_COMPOSE ps inquiry-pooler customer-portal

echo -e "${GREEN}✨ CRM is now running at https://crm.zervtek.com${NC}"
echo -e "${GREEN}✨ Customer portal has been updated${NC}"
echo -e "${YELLOW}ℹ️  Note: This script skips database migrations. Use ./deploy.sh if schema changes are needed.${NC}"
echo -e "${YELLOW}ℹ️  If UI changes don't appear: run ./update.sh --no-cache and hard-refresh the browser (Ctrl+Shift+R).${NC}"
