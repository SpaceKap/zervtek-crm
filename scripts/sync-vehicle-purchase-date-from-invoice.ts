/**
 * One-off script: set each vehicle's purchaseDate to the issue date of its
 * earliest invoice. Use this on the VPS to backfill purchase dates so they
 * match invoice Issue Date (and show correctly on CRM customer page and
 * customer portal).
 *
 * Run from repo root on the VPS (with .env loaded):
 *   npx tsx scripts/sync-vehicle-purchase-date-from-invoice.ts
 *
 * Optional: dry run (no DB writes):
 *   npx tsx scripts/sync-vehicle-purchase-date-from-invoice.ts --dry-run
 */

try {
  require("dotenv").config();
} catch {
  // dotenv not installed
}

import { prisma } from "../lib/prisma";

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
