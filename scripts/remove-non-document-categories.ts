/**
 * Script to remove non-document categories from VehicleDocument
 * 
 * These categories are NOT documents:
 * - SPARE_KEYS (physical goods)
 * - MAINTENANCE_RECORDS (physical goods)
 * - MANUALS (physical goods)
 * - CATALOGUES (physical goods)
 * - ACCESSORIES (physical goods)
 * - ETD_ETA (information, not a document)
 * - AUCTION_DETAILS (information, not a document)
 * 
 * This script updates all documents with these categories to "OTHER"
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const categoriesToRemove = [
  "SPARE_KEYS",
  "MAINTENANCE_RECORDS",
  "MANUALS",
  "CATALOGUES",
  "ACCESSORIES",
  "ETD_ETA",
  "AUCTION_DETAILS",
];

async function removeNonDocumentCategories() {
  console.log("🔍 Finding documents with non-document categories...");

  for (const category of categoriesToRemove) {
    const count = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::int as count
      FROM inquiry_pooler."VehicleDocument"
      WHERE category = ${category}::inquiry_pooler."DocumentCategory"
    `;

    const documentCount = Number(count[0]?.count || 0);
    
    if (documentCount > 0) {
      console.log(`\n📝 Found ${documentCount} documents with ${category}`);
      console.log(`   Updating to OTHER category...`);
      
      await prisma.$executeRaw`
        UPDATE inquiry_pooler."VehicleDocument"
        SET category = 'OTHER'::inquiry_pooler."DocumentCategory"
        WHERE category = ${category}::inquiry_pooler."DocumentCategory"
      `;
      
      console.log(`   ✅ Updated ${documentCount} documents`);
    } else {
      console.log(`   ✅ No documents found with ${category}`);
    }
  }

  await prisma.$disconnect();
  console.log("\n✅ Migration complete! You can now remove these categories from the enum.");
}

removeNonDocumentCategories()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
