# Methods to Delete Customers and Vehicles in Supabase

## Method 1: SQL Editor (What you already used - Fastest)

Go to Supabase Dashboard → SQL Editor → New Query

```sql
-- Delete all vehicles first
DELETE FROM "inquiry_pooler"."Vehicle";

-- Delete all customers
DELETE FROM "inquiry_pooler"."Customer";
```

## Method 2: Table Editor (GUI - Visual)

1. Go to Supabase Dashboard → Table Editor
2. Select `inquiry_pooler` schema
3. Click on `Vehicle` table
4. Select all rows (checkbox at top)
5. Click "Delete" button
6. Repeat for `Customer` table

## Method 3: Prisma Studio (Table-like Interface)

Run locally or on VPS:

```bash
npm run db:studio
```

Then open http://localhost:5555 in your browser

- You'll see a table view similar to Supabase
- Click on "Vehicle" → Select all → Delete
- Click on "Customer" → Select all → Delete

## Method 4: Supabase REST API (Programmatic)

```bash
# Delete vehicles
curl -X DELETE 'https://your-project.supabase.co/rest/v1/Vehicle' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Delete customers
curl -X DELETE 'https://your-project.supabase.co/rest/v1/Customer' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Method 5: Using Supabase CLI (if installed)

```bash
supabase db execute "DELETE FROM inquiry_pooler.Vehicle;"
supabase db execute "DELETE FROM inquiry_pooler.Customer;"
```
