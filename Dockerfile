# Multi-stage build for Next.js production

# Stage 1: Dependencies
FROM node:20-alpine AS deps
# OpenSSL needed so Prisma can resolve linux-musl engine during generate (prepare / postinstall)
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Workspaces require member package.json paths; @inquiry-pooler/db prepare runs prisma generate
COPY package.json package-lock.json* ./
COPY packages/db/package.json packages/db/
COPY packages/db/prisma ./packages/db/prisma
COPY apps/customer-portal/package.json apps/customer-portal/
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
# OpenSSL required so Prisma detects 3.x and uses linux-musl-openssl-3.0.x engine (avoids libssl.so.1.1 not found)
RUN apk add --no-cache openssl
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client from packages/db schema (includes StockListing and all models)
RUN npx prisma generate --schema=packages/db/prisma/schema.prisma

# Build Next.js application
# Set a placeholder DATABASE_URL for build time (Prisma Client needs it during build)
# The actual DATABASE_URL will be provided at runtime via docker-compose
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma files (needed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy package.json and install Prisma CLI + tsx for migrations and scripts.
# Standalone already contains packages/db (traced workspace) but often without prisma/schema.
# npm still treats those dirs as workspaces if package.json has "workspaces" and can run
# prepare (prisma generate) even with --ignore-scripts on some npm versions — strip workspaces
# for this install only; scripts like db:push do not need the workspaces key at runtime.
USER root
RUN apk add --no-cache openssl
COPY --from=builder --chown=root:root /app/package.json ./package.json
RUN node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json','utf8'));delete p.workspaces;fs.writeFileSync('package.json',JSON.stringify(p,null,2));"
RUN mkdir -p ./node_modules && npm install --no-save --ignore-scripts --prefix . prisma@5.22.0 tsx
RUN chown -R nextjs:nodejs ./node_modules
USER nextjs

# Copy scripts and lib so one-off scripts (e.g. change-role) can run in container
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/lib ./lib

# Copy data files (CSV files for vehicle catalog)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

# Copy packages/db so deploy.sh db:push uses the correct schema (includes StockListing)
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
