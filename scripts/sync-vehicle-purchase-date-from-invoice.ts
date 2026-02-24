/**
 * One-off script: set each vehicle's purchaseDate to the issue date of its
 * earliest invoice. Use this on the VPS to backfill purchase dates so they
 * match invoice Issue Date (and show correctly on CRM customer page and
 * customer portal).
 *
 * On the VPS, from repo root (~/inquiry-pooler):
 *   1. Ensure deps and Prisma client exist:  npm install   &&  npm run db:generate
 *   2. Dry run (no writes):                 npx tsx scripts/sync-vehicle-purchase-date-from-invoice.ts --dry-run
 *   3. Apply changes:                       npx tsx scripts/sync-vehicle-purchase-date-from-invoice.ts
 *
 * Or:  npm run sync-vehicle-purchase-date [-- --dry-run]
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
