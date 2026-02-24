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

## Stack

- Next.js 14 (App Router)
- Tailwind CSS
- shadcn-style UI (Card, Tabs, Button, Badge)
- Shared DB: `@inquiry-pooler/db` (Prisma, same DB as main app)
