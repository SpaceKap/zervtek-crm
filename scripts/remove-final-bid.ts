/**
 * Script to remove FINAL_BID document category
 * 
 * This script:
 * 1. Finds all documents with FINAL_BID category
 * 2. Updates them to AUCTION_DETAILS (or another appropriate category)
 * 3. Then the enum can be safely removed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function removeFinalBid() {
  console.log("🔍 Finding documents with FINAL_BID category...");

  // First, check if there are any documents with FINAL_BID
  const documentsWithFinalBid = await prisma.vehicleDocument.findMany({
    where: {
      category: "FINAL_BID" as any, // Type assertion needed since enum is being removed
    },
    select: {
      id: true,
      name: true,
      vehicleId: true,
    },
  });

  console.log(`Found ${documentsWithFinalBid.length} documents with FINAL_BID category`);

  if (documentsWithFinalBid.length > 0) {
    console.log("\n📝 Updating documents to AUCTION_DETAILS category...");
    
    // Update all FINAL_BID documents to AUCTION_DETAILS
    const result = await prisma.$executeRaw`
      UPDATE inquiry_pooler."VehicleDocument"
      SET category = 'AUCTION_DETAILS'::inquiry_pooler."DocumentCategory"
      WHERE category = 'FINAL_BID'::inquiry_pooler."DocumentCategory"
    `;

    console.log(`✅ Updated ${result} documents from FINAL_BID to AUCTION_DETAILS`);
  } else {
    console.log("✅ No documents found with FINAL_BID category");
  }

  await prisma.$disconnect();
  console.log("\n✅ Migration complete! You can now remove FINAL_BID from the enum.");
}

removeFinalBid()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
