# Inquiry Pooler CRM

A full-stack CRM system built with Next.js that aggregates customer inquiries from WhatsApp, emails, and web sources via n8n, with role-based access control, inquiry assignment, and kanban pipeline management.

## Features

- **Multi-source Inquiry Aggregation**: Receives inquiries from WhatsApp, Email, Web forms, and Chatbots via n8n webhooks
- **Inquiry Assignment**: Sales staff can pick inquiries for themselves, making them private to that staff member
- **Auto-release**: Inquiries automatically become available again after 30 days if not converted
- **Kanban Board**: Visual pipeline management with drag-and-drop functionality
- **Manual Lead Entry**: Sales staff can manually add their own leads
- **Role-Based Access**: 
  - Sales staff see only their assigned inquiries + unassigned pool
  - Managers can see all inquiries, assignments, history, and everyone's kanban boards
- **OAuth Authentication**: Secure login with Google OAuth (Microsoft OAuth optional)

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 with OAuth
- **UI**: shadcn/ui components + Tailwind CSS
- **Kanban**: @dnd-kit/core for drag-and-drop
- **Forms**: React Hook Form + Zod validation

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Google OAuth credentials (for authentication)
- n8n instance (for webhook integration)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/inquiry_pooler?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Optional: Microsoft OAuth
MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

# Optional: n8n Webhook Secret (for securing webhook endpoint)
N8N_WEBHOOK_SECRET="your-webhook-secret"
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations (or push schema for development)
npm run db:push
# OR
npm run db:migrate
```

### 4. Initialize Kanban Stages

The kanban stages will be automatically created on first access to the kanban board. Alternatively, you can seed them manually via Prisma Studio:

```bash
npm run db:studio
```

### 5. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` and sign in with Google OAuth.

## n8n Webhook Integration

Configure n8n to send POST requests to:
```
POST http://your-domain.com/api/webhooks/n8n
```

### Webhook Payload Format

```json
{
  "source": "whatsapp" | "email" | "web" | "chatbot",
  "sourceId": "unique-id-from-source",
  "customerName": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "message": "Inquiry content...",
  "metadata": {
    "originalSource": "japanesecartrade.com",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## Scheduled Jobs

### Auto-release Expired Assignments

Set up a cron job to call:
```
GET http://your-domain.com/api/cron/release-assignments
```

This should run daily to release inquiries that have been assigned for more than 30 days without conversion.

Example cron configuration (using Vercel Cron or external service):
```json
{
  "crons": [{
    "path": "/api/cron/release-assignments",
    "schedule": "0 0 * * *"
  }]
}
```

## User Roles

### Sales Staff (SALES)
- Can view and pick unassigned inquiries from the pool
- Can view only their own assigned inquiries
- Can view and manage their own kanban board
- Can manually add leads
- Cannot see other sales staff's inquiries

### Manager (MANAGER)
- Can view all inquiries
- Can view all kanban boards (by user)
- Can see assignment history
- Can see team performance metrics
- Has full access to all features

## Deployment

### VPS Deployment

1. Build the application:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

Or use PM2:
```bash
pm2 start npm --name "inquiry-pooler" -- start
```

### Docker Deployment (Optional)

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Project Structure

```
/
├── app/
│   ├── api/              # API routes
│   ├── (auth)/           # Authentication pages
│   └── (dashboard)/      # Protected dashboard pages
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   └── ...              # Feature components
├── lib/                  # Utility functions
├── prisma/               # Database schema
└── types/                # TypeScript types
```

## License

MIT
