import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migratePaymentDeadline() {
  try {
    console.log('Starting payment deadline migration...')

    // Step 1: Add paymentDeadline column as nullable to CostItem
    console.log('Adding paymentDeadline column to CostItem...')
    await prisma.$executeRaw`
      ALTER TABLE "inquiry_pooler"."CostItem" 
      ADD COLUMN IF NOT EXISTS "paymentDeadline" TIMESTAMP;
    `

    // Step 2: Set default paymentDeadline for existing CostItems
    console.log('Setting default paymentDeadline for existing CostItems...')
    await prisma.$executeRaw`
      UPDATE "inquiry_pooler"."CostItem" 
      SET "paymentDeadline" = COALESCE("paymentDate", "createdAt" + INTERVAL '30 days')
      WHERE "paymentDeadline" IS NULL;
    `

    // Step 3: Make paymentDeadline required for CostItem
    console.log('Making paymentDeadline required for CostItem...')
    await prisma.$executeRaw`
      ALTER TABLE "inquiry_pooler"."CostItem" 
      ALTER COLUMN "paymentDeadline" SET NOT NULL;
    `

    // Step 4: Make paymentDate optional for CostItem
    console.log('Making paymentDate optional for CostItem...')
    await prisma.$executeRaw`
      ALTER TABLE "inquiry_pooler"."CostItem" 
      ALTER COLUMN "paymentDate" DROP NOT NULL;
    `

    // Step 5: Add paymentDeadline column as nullable to SharedInvoice
    console.log('Adding paymentDeadline column to SharedInvoice...')
    await prisma.$executeRaw`
      ALTER TABLE "inquiry_pooler"."SharedInvoice" 
      ADD COLUMN IF NOT EXISTS "paymentDeadline" TIMESTAMP;
    `

    // Step 6: Set default paymentDeadline for existing SharedInvoices
    console.log('Setting default paymentDeadline for existing SharedInvoices...')
    await prisma.$executeRaw`
      UPDATE "inquiry_pooler"."SharedInvoice" 
      SET "paymentDeadline" = COALESCE("date", "createdAt" + INTERVAL '30 days')
      WHERE "paymentDeadline" IS NULL;
    `

    // Step 7: Make paymentDeadline required for SharedInvoice
    console.log('Making paymentDeadline required for SharedInvoice...')
    await prisma.$executeRaw`
      ALTER TABLE "inquiry_pooler"."SharedInvoice" 
      ALTER COLUMN "paymentDeadline" SET NOT NULL;
    `

    // Step 8: Make date optional for SharedInvoice
    console.log('Making date optional for SharedInvoice...')
    await prisma.$executeRaw`
      ALTER TABLE "inquiry_pooler"."SharedInvoice" 
      ALTER COLUMN "date" DROP NOT NULL;
    `

    // Step 9: Add performance indexes
    console.log('Adding performance indexes...')
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "CostItem_paymentDeadline_idx" ON "inquiry_pooler"."CostItem"("paymentDeadline");
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "CostItem_paymentDate_idx" ON "inquiry_pooler"."CostItem"("paymentDate");
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "SharedInvoice_paymentDeadline_idx" ON "inquiry_pooler"."SharedInvoice"("paymentDeadline");
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Invoice_createdById_idx" ON "inquiry_pooler"."Invoice"("createdById");
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "Invoice_status_createdAt_idx" ON "inquiry_pooler"."Invoice"("status", "createdAt");
    `
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "InvoiceCharge_invoiceId_createdAt_idx" ON "inquiry_pooler"."InvoiceCharge"("invoiceId", "createdAt");
    `

    console.log('✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migratePaymentDeadline()
