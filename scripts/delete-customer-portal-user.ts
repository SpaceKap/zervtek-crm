/**
 * Delete a customer by email so they can re-register in the customer portal.
 * Usage: npx tsx scripts/delete-customer-portal-user.ts <email>
 *
 * Note: This will cascade-delete their invoices, container invoices,
 * customer-vehicle links, and portal tokens. Vehicles will be unlinked (customerId set to null).
 */
try {
  require("dotenv").config();
} catch {
  // dotenv not installed
}

import { prisma } from "../lib/prisma";

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Usage: npx tsx scripts/delete-customer-portal-user.ts <email>");
  process.exit(1);
}

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { email },
    select: { id: true, name: true, email: true },
  });
  if (!customer) {
    console.error(`Customer not found: ${email}`);
    process.exit(1);
  }
  await prisma.customer.delete({ where: { id: customer.id } });
  console.log(`Deleted customer: ${customer.email} (${customer.name ?? "—"})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
