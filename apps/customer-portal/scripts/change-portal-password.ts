/**
 * One-off script to set a customer portal password (e.g. on the VPS).
 * Uses the same bcrypt rounds (12) as register/reset-password.
 *
 * Usage on VPS (from repo root or from apps/customer-portal):
 *
 *   # From repo root (ensure apps/customer-portal has .env with DATABASE_URL):
 *   cd apps/customer-portal && npx tsx scripts/change-portal-password.ts
 *
 *   # Set email and new password via env (recommended so password isn't in shell history):
 *   EMAIL=avi@zervtek.com NEW_PASSWORD="YourNewSecurePassword" npx tsx scripts/change-portal-password.ts
 *
 *   # Or pass as args (password will be visible in process list):
 *   npx tsx scripts/change-portal-password.ts avi@zervtek.com "YourNewSecurePassword"
 *
 * Requires: DATABASE_URL in .env (or environment), and the customer must exist with that email.
 */

import "dotenv/config";
import { hash } from "bcryptjs";
import { prisma } from "@inquiry-pooler/db";

const EMAIL = process.env.EMAIL ?? process.argv[2];
const NEW_PASSWORD = process.env.NEW_PASSWORD ?? process.argv[3];

async function main() {
  if (!EMAIL?.trim()) {
    console.error("Usage: EMAIL=... NEW_PASSWORD=... npx tsx scripts/change-portal-password.ts");
    console.error("   Or: npx tsx scripts/change-portal-password.ts <email> <newPassword>");
    process.exit(1);
  }
  if (!NEW_PASSWORD || NEW_PASSWORD.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const email = EMAIL.trim().toLowerCase();
  const customer = await prisma.customer.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });

  if (!customer) {
    console.error(`No customer found with email: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hash(NEW_PASSWORD, 12);
  await prisma.customer.update({
    where: { id: customer.id },
    data: { passwordHash },
  });

  console.log(`Password updated for ${customer.email ?? customer.id} (${customer.name}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
