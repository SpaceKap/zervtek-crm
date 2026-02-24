/**
 * Mark a customer as email-verified and optionally set a new password
 * so they can log in to the customer portal.
 *
 * Run from repo root:
 *   npx tsx scripts/portal-verify-customer.ts <email> [newPassword]
 *   npx tsx scripts/portal-verify-customer.ts --portal <email> [newPassword]   # use portal's .env
 *
 * Examples:
 *   npx tsx scripts/portal-verify-customer.ts avi@zervtek.com
 *   npx tsx scripts/portal-verify-customer.ts --portal avi@zervtek.com "YourNewPassword"
 */

const path = require("path");
const args = process.argv.slice(2);
const usePortalEnv = args[0] === "--portal";
if (usePortalEnv) args.shift();
const email = (args[0] || "").trim().toLowerCase();
const newPassword = args[1];

try {
  if (usePortalEnv) {
    require("dotenv").config({ path: path.join(__dirname, "../apps/customer-portal/.env") });
  } else {
    require("dotenv").config();
  }
} catch {
  // dotenv not installed
}

import { prisma } from "../lib/prisma";
import { hash } from "bcryptjs";

if (!email) {
  console.error("Usage: npx tsx scripts/portal-verify-customer.ts [--portal] <email> [newPassword]");
  process.exit(1);
}

async function main() {
  if (usePortalEnv) {
    console.log("Using portal .env for DATABASE_URL");
  }
  const customer = await prisma.customer.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, name: true, email: true },
  });

  if (!customer) {
    console.error(`No customer found with email: ${email}`);
    process.exit(1);
  }

  console.log(`Found customer: ${customer.name} (${customer.email})`);

  // Use raw SQL so this works even if the Prisma client was generated from
  // a schema that doesn't include emailVerifiedAt yet.
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE inquiry_pooler."Customer" SET "emailVerifiedAt" = NOW() WHERE id = $1`,
      customer.id
    );
    console.log("Set emailVerifiedAt = now()");
  } catch (e: any) {
    if (e?.message?.includes("emailVerifiedAt") || e?.code === "42703") {
      console.error("Column emailVerifiedAt may not exist. Add it with:");
      console.error('  echo \'ALTER TABLE inquiry_pooler."Customer" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3);\' | npx prisma db execute --stdin');
      process.exit(1);
    }
    throw e;
  }

  if (newPassword) {
    if (newPassword.length < 8) {
      console.error("Password must be at least 8 characters");
      process.exit(1);
    }
    const passwordHash = await hash(newPassword, 12);
    await prisma.customer.update({
      where: { id: customer.id },
      data: { passwordHash },
    });
    console.log("Password updated. You can log in with the new password.");
  } else {
    console.log("You can log in with your existing password.");
  }

  console.log("\nDone. Try logging in at the customer portal.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
