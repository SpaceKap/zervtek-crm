# Customer Portal

Customer-facing portal for viewing vehicles, shipping status, documents, invoices, and payments. Uses the same database as the main Inquiry Pooler app (no API between apps).

## Setup

- From repo root, run `npm install` and `npm run db:generate` (shared DB package).
- Copy `.env.example` to `.env` in the **root** of the monorepo (or set `DATABASE_URL` in this app’s env). The portal uses the same `DATABASE_URL` as the main app.

## Run

- From repo root: `npm run dev -w customer-portal` (runs on port 3001).
- Or from this folder: `npm run dev`.

## Access

Customers open the portal via a share link that includes their token:

- **Base URL:** `http://localhost:3001` (or your deployed URL).
- **Portal URL:** `http://localhost:3001/{shareToken}`.

The `shareToken` is generated in the admin app per customer and shared with the customer.

## Deploying to VPS

1. **Environment variables**  
   Copy `apps/customer-portal/.env.example` to `.env` in this app (or use the root monorepo `.env` and ensure the portal reads it). Set at least:

   - **`NEXTAUTH_URL`** – Public URL of the customer portal (e.g. `https://portal.yourdomain.com`). No trailing slash. Required for auth and email links.
   - **`NEXTAUTH_SECRET`** – Use e.g. `openssl rand -base64 32`.
   - **`NEXT_PUBLIC_MAIN_APP_URL`** or **`MAIN_APP_URL`** – Public URL of the main CRM app (e.g. `https://crm.yourdomain.com`). Used for invoice and document links from the portal.
   - **`DATABASE_URL`** – Same database as the main app.

2. **Behind a reverse proxy**  
   If the app is behind nginx/traefik (or similar), set **`AUTH_TRUST_HOST=true`** so NextAuth trusts `X-Forwarded-Host` and `X-Forwarded-Proto`.

3. **HTTPS**  
   Use `https://` for `NEXTAUTH_URL` and the main app URL on VPS so cookies and redirects work correctly.

4. **Email (verification / password reset)**  
   Configure `SMTP_*` and `EMAIL_FROM` so verification and reset links use the correct portal base URL (from `NEXTAUTH_URL` or `PORTAL_URL`).

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- shadcn-style UI (Card, Tabs, Button, Badge)
- Shared DB: `@inquiry-pooler/db` (Prisma, same DB as main app)
