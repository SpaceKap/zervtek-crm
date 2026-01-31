# Performance Optimizations for Supabase

## ✅ Already Handled by Supabase

1. **Database Connection Pooling** ✅
   - You're already using Supabase's connection pooler (`pooler.supabase.com`)
   - This is automatically handled - no action needed

2. **Database Indexes** ✅
   - We've added indexes in the schema
   - Run migration: `npx prisma migrate dev --name add_invoice_performance_indexes`

## 🚀 Recommended Optimizations for Supabase

### 1. Prisma Connection Pooling (IMPORTANT)

Since you're using Supabase's pooler, optimize Prisma connection settings:

**Update `lib/prisma.ts`:**

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

// Prisma connection pooling optimization for Supabase
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
} else {
  // In production, ensure proper connection management
  prisma.$connect().catch((err) => {
    console.error("Failed to connect to database:", err);
  });
}
```

### 2. Next.js Route Caching (Recommended)

Add caching to frequently accessed API routes:

**Example for `/app/api/invoices/route.ts`:**

```typescript
export const revalidate = 60; // Revalidate every 60 seconds

export async function GET(request: NextRequest) {
  // ... existing code
}
```

**Or use dynamic caching:**

```typescript
import { unstable_cache } from 'next/cache'

const getCachedInvoices = unstable_cache(
  async (where) => {
    return await prisma.invoice.findMany({ where, ... })
  },
  ['invoices'],
  {
    revalidate: 60, // Cache for 60 seconds
    tags: ['invoices']
  }
)
```

### 3. API Response Compression

If deploying on Vercel: ✅ Automatic
If deploying on your VPS: Add compression middleware

**For VPS deployment, add to `next.config.js`:**

```javascript
const nextConfig = {
  output: "standalone",
  compress: true, // Enable gzip compression
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};
```

### 4. Frontend Optimizations (Can Implement)

#### A. Lazy Loading for Cost Items

Load cost items only when the cost tab is opened:

**In `components/InvoiceDetail.tsx`:**

```typescript
const [costItemsLoaded, setCostItemsLoaded] = useState(false);

// Only fetch when cost tab is active
useEffect(() => {
  if (activeTab === "cost" && !costItemsLoaded) {
    fetchCostItems();
    setCostItemsLoaded(true);
  }
}, [activeTab]);
```

#### B. Virtual Scrolling for Large Lists

For invoice lists with 100+ items, consider using `react-window` or `@tanstack/react-virtual`:

```bash
npm install react-window @types/react-window
```

### 5. Supabase-Specific Optimizations

#### A. Use Supabase's Query Performance Insights

- Check Supabase Dashboard → Database → Query Performance
- Identify slow queries and optimize them

#### B. Enable Row Level Security (RLS) if needed

- Currently using Prisma, but if you switch to Supabase client, RLS can help

#### C. Connection String Optimization

Your current connection string uses the pooler, which is good. Ensure you're using:

- Transaction mode: `?pgbouncer=true` (for connection pooler)
- Session mode: Direct connection (for migrations)

**For migrations, use direct connection:**

```env
# For migrations (direct connection)
DATABASE_URL_DIRECT=postgresql://postgres.houwollpxresohflmhpn:password@aws-1-ap-northeast-1.supabase.co:5432/postgres

# For app (pooler)
DATABASE_URL=postgresql://postgres.houwollpxresohflmhpn:password@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres?pgbouncer=true
```

### 6. Query Optimization Checklist

- ✅ Added database indexes
- ✅ Added pagination
- ✅ Reduced data fetching (using `select` instead of `include`)
- ⏳ Add route caching (Next.js)
- ⏳ Optimize Prisma connection settings
- ⏳ Implement lazy loading for heavy components

## 📊 Monitoring Performance

### Supabase Dashboard

1. Go to Supabase Dashboard → Database → Query Performance
2. Monitor slow queries
3. Check connection pool usage

### Application Logs

Monitor Prisma query logs in development:

```typescript
log: ["query", "error", "warn"];
```

## 🎯 Priority Actions

1. **High Priority:**
   - Run database migration for indexes
   - Optimize Prisma connection settings
   - Add route caching for invoice list API

2. **Medium Priority:**
   - Implement lazy loading for cost items
   - Add compression if not on Vercel

3. **Low Priority:**
   - Virtual scrolling (only if lists are very long)
   - Advanced caching strategies

## 🔍 Testing Performance

After implementing optimizations:

1. Test invoice list loading time
2. Test invoice detail page loading
3. Monitor Supabase query performance dashboard
4. Check browser Network tab for response sizes
