# Multi-stage build for Next.js production

# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

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

# Copy package.json and install Prisma CLI locally for migrations
# This ensures npx can find prisma
USER root
RUN apk add --no-cache openssl
COPY --from=builder --chown=root:root /app/package.json ./package.json
# Create node_modules directory if it doesn't exist and install prisma
RUN mkdir -p ./node_modules && npm install --no-save --prefix . prisma@5.19.0
# Fix permissions for node_modules
RUN chown -R nextjs:nodejs ./node_modules
USER nextjs

# Copy data files (CSV files for vehicle catalog)
COPY --from=builder --chown=nextjs:nodejs /app/data ./data

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
