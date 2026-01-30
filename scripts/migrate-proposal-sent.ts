/**
 * Migration script to update PROPOSAL_SENT status to DEPOSIT
 * Run this before removing PROPOSAL_SENT from the enum
 */

import { PrismaClient, InquiryStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Starting migration: PROPOSAL_SENT -> DEPOSIT");

  // Check if there are any records with PROPOSAL_SENT status
  // Note: We need to use raw SQL because Prisma won't let us query with removed enum values
  const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "inquiry_pooler"."Inquiry"
    WHERE status = 'PROPOSAL_SENT'::"inquiry_pooler"."InquiryStatus"
  `;

  const count = Number(result[0]?.count || 0);

  if (count === 0) {
    console.log("✅ No records with PROPOSAL_SENT status found. Migration not needed.");
    return;
  }

  console.log(`📊 Found ${count} record(s) with PROPOSAL_SENT status`);

  // Update all PROPOSAL_SENT records to DEPOSIT
  // Using raw SQL because Prisma enum types won't allow the old value
  const updateResult = await prisma.$executeRaw`
    UPDATE "inquiry_pooler"."Inquiry"
    SET status = 'DEPOSIT'::"inquiry_pooler"."InquiryStatus"
    WHERE status = 'PROPOSAL_SENT'::"inquiry_pooler"."InquiryStatus"
  `;

  console.log(`✅ Successfully migrated ${updateResult} record(s) from PROPOSAL_SENT to DEPOSIT`);

  // Verify migration
  const verifyResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count
    FROM "inquiry_pooler"."Inquiry"
    WHERE status = 'PROPOSAL_SENT'::"inquiry_pooler"."InquiryStatus"
  `;

  const remaining = Number(verifyResult[0]?.count || 0);

  if (remaining === 0) {
    console.log("✅ Migration verified: No PROPOSAL_SENT records remaining");
  } else {
    console.warn(`⚠️  Warning: ${remaining} PROPOSAL_SENT record(s) still exist`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
