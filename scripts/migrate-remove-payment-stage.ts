/**
 * Migration script to remove PAYMENT stage
 * Moves any vehicles in PAYMENT stage to TRANSPORT stage
 * 
 * IMPORTANT: Run this BEFORE removing PAYMENT from the enum in schema.prisma
 * Run with: npx tsx scripts/migrate-remove-payment-stage.ts
 */

import { PrismaClient, ShippingStage } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Starting migration to remove PAYMENT stage...")

  try {
    // Use raw SQL to find and update vehicles in PAYMENT stage
    // This works even if PAYMENT is still in the enum
    const vehiclesResult = await prisma.$executeRawUnsafe(`
      UPDATE inquiry_pooler."Vehicle"
      SET "currentShippingStage" = 'TRANSPORT'
      WHERE "currentShippingStage" = 'PAYMENT'
      RETURNING id, vin;
    `)

    console.log(`Updated vehicles in PAYMENT stage to TRANSPORT`)

    // Update VehicleShippingStage records
    await prisma.$executeRawUnsafe(`
      UPDATE inquiry_pooler."VehicleShippingStage"
      SET stage = 'TRANSPORT'
      WHERE stage = 'PAYMENT';
    `)

    console.log(`Updated VehicleShippingStage records`)

    // Update VehicleStageHistory records
    await prisma.$executeRawUnsafe(`
      UPDATE inquiry_pooler."VehicleStageHistory"
      SET "newStage" = 'TRANSPORT'
      WHERE "newStage" = 'PAYMENT';
    `)

    await prisma.$executeRawUnsafe(`
      UPDATE inquiry_pooler."VehicleStageHistory"
      SET "previousStage" = NULL
      WHERE "previousStage" = 'PAYMENT';
    `)

    console.log(`Updated VehicleStageHistory records`)

    console.log("✅ Migration completed! You can now remove PAYMENT from the enum.")
  } catch (error) {
    console.error("❌ Migration failed:", error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error("Migration failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
