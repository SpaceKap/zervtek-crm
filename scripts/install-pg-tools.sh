#!/bin/bash

# Install PostgreSQL client tools on host (for backup scripts)
# Run this on your VPS if pg_dump/psql are not available

set -e

echo "🔧 Installing PostgreSQL client tools..."

# Detect OS
if [ -f /etc/debian_version ]; then
    # Debian/Ubuntu
    sudo apt-get update
    sudo apt-get install -y postgresql-client-15
elif [ -f /etc/redhat-release ]; then
    # CentOS/RHEL
    sudo yum install -y postgresql15
elif [ -f /etc/alpine-release ]; then
    # Alpine
    sudo apk add --no-cache postgresql15-client
else
    echo "❌ Unsupported OS. Please install PostgreSQL client manually."
    exit 1
fi

echo "✅ PostgreSQL client tools installed"
echo "💡 Verify installation: pg_dump --version"
