# Delete All Customers and Vehicles - Prisma Commands

## Option 1: Using Prisma Studio (Interactive)

```bash
npm run db:studio
```

Then manually delete records through the UI.

## Option 2: Using Prisma Client (Node.js/TS)

Run this in a Node.js REPL or create a quick script:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const vehicles = await prisma.vehicle.deleteMany({});
  const customers = await prisma.customer.deleteMany({});
  console.log('Deleted:', vehicles.count, 'vehicles,', customers.count, 'customers');
  await prisma.\$disconnect();
})();
"
```

## Option 3: Using Prisma Migrate (Reset - WARNING: Deletes ALL data)

```bash
# This will reset the entire database and reapply migrations
# WARNING: This deletes ALL data, not just customers and vehicles!
npx prisma migrate reset
```

## Option 4: Direct Prisma Query (Recommended)

Create a file `delete.js`:

```javascript
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function deleteAll() {
  const vehicles = await prisma.vehicle.deleteMany({});
  const customers = await prisma.customer.deleteMany({});
  console.log(
    `Deleted ${vehicles.count} vehicles and ${customers.count} customers`,
  );
  await prisma.$disconnect();
}

deleteAll();
```

Then run:

```bash
node delete.js
```
