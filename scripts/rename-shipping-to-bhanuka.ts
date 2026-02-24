/**
 * Rename the staff user from shipping (shipping@zervtek.com) to Bhanuka (bhanuka@zervtek.com).
 * Run from repo root: npx tsx scripts/rename-shipping-to-bhanuka.ts
 */
try {
  require("dotenv").config();
} catch {
  // dotenv not installed
}

import { prisma } from "../lib/prisma";

const OLD_EMAIL = "shipping@zervtek.com";
const NEW_EMAIL = "bhanuka@zervtek.com";
const NEW_NAME = "Bhanuka";

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: OLD_EMAIL },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    console.log(`No user found with email "${OLD_EMAIL}". Nothing to do.`);
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email: NEW_EMAIL },
    select: { id: true },
  });
  if (existing && existing.id !== user.id) {
    console.error(`A different user already has email "${NEW_EMAIL}". Aborting.`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { email: NEW_EMAIL, name: NEW_NAME },
  });

  console.log(`✅ Updated user: ${OLD_EMAIL} → ${NEW_NAME} (${NEW_EMAIL})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
