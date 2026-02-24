/**
 * One-off script: set each vehicle's purchaseDate to the issue date of its
 * earliest invoice. Use this on the VPS to backfill purchase dates so they
 * match invoice Issue Date (and show correctly on CRM customer page and
 * customer portal).
 *
 * --- Running on the VPS ---
 * Your .env usually has DATABASE_URL with host "postgres" (for Docker). From
 * the host that hostname doesn't resolve, so use one of these:
 *
 *  A) Run inside the app container (uses existing DATABASE_URL). docker-compose mounts
 *     ./scripts into the container, so after git pull run once: docker compose up -d inquiry-pooler
 *     then:
 *     docker compose exec inquiry-pooler npx tsx scripts/sync-vehicle-purchase-date-from-invoice.ts --dry-run
 *     docker compose exec inquiry-pooler npx tsx scripts/sync-vehicle-purchase-date-from-invoice.ts
 *
 *  B) Run on the host: set DATABASE_URL to use localhost (postgres is on 5432):
 *     cd ~/inquiry-pooler
 *     npm install && npm run db:generate
 *     DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/inquiry_pooler?schema=inquiry_pooler" \
 *       npx tsx scripts/sync-vehicle-purchase-date-from-invoice.ts --dry-run
 *     # then without --dry-run to apply
 *
 * Or:  npm run sync-vehicle-purchase-date [-- --dry-run]  (with DATABASE_URL set for host or run in container)
 */

try {
  require("dotenv").config();
} catch {
  // dotenv not installed
}

// Use PrismaClient directly so script works on VPS without workspace resolution (e.g. after git pull)
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error"],
});

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  if (isDryRun) {
    console.log("DRY RUN – no changes will be written.\n");
  }

  // Vehicles that have at least one invoice
  const vehiclesWithInvoices = await prisma.vehicle.findMany({
    where: {
      invoices: { some: {} },
    },
    select: {
      id: true,
      vin: true,
      purchaseDate: true,
      invoices: {
        orderBy: { issueDate: "asc" },
        take: 1,
        select: { issueDate: true, invoiceNumber: true },
      },
    },
  });

  let updated = 0;
  let skipped = 0;

  for (const v of vehiclesWithInvoices) {
    const earliest = v.invoices[0];
    if (!earliest?.issueDate) continue;

    const newDate = new Date(earliest.issueDate);
    const alreadySet =
      v.purchaseDate &&
      new Date(v.purchaseDate).toISOString().split("T")[0] === newDate.toISOString().split("T")[0];

    if (alreadySet) {
      skipped++;
      continue;
    }

    if (!isDryRun) {
      await prisma.vehicle.update({
        where: { id: v.id },
        data: { purchaseDate: newDate },
      });
    }
    updated++;
    console.log(
      `Vehicle ${v.vin} (${v.id}): purchaseDate ${v.purchaseDate ? "→" : "set"} ${newDate.toISOString().split("T")[0]} (invoice ${earliest.invoiceNumber})`
    );
  }

  console.log(
    `\nDone. ${updated} vehicle(s) ${isDryRun ? "would be updated" : "updated"}, ${skipped} already in sync.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
