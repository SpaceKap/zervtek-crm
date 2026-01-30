import { PrismaClient, ChargeCategory } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding invoicing data...")

  // Seed default charge types
  const chargeTypes = [
    { name: "Export Fees", category: ChargeCategory.EXPORT_FEES },
    { name: "Shipping", category: ChargeCategory.SHIPPING },
    { name: "Additional Transport", category: ChargeCategory.ADDITIONAL_TRANSPORT },
    { name: "Recycle Fees", category: ChargeCategory.RECYCLE_FEES },
  ]

  for (const chargeType of chargeTypes) {
    await prisma.chargeType.upsert({
      where: { name: chargeType.name },
      update: chargeType,
      create: chargeType,
    })
    console.log(`✓ Charge type: ${chargeType.name}`)
  }

  // Seed default vendors (common vendors)
  const vendors = [
    "HAA Kobe",
    "USS Tokyo",
    "NYK Line",
    "Document Services Co",
    "Precision Repairs",
    "Pro Mechanics",
    "Quality Body Shop",
    "Quick Delivery",
  ]

  for (const vendorName of vendors) {
    await prisma.vendor.upsert({
      where: { name: vendorName },
      update: {},
      create: { name: vendorName },
    })
    console.log(`✓ Vendor: ${vendorName}`)
  }

  // Seed initial company info (only if it doesn't exist)
  const existingCompany = await prisma.companyInfo.findFirst()
  if (!existingCompany) {
    await prisma.companyInfo.create({
      data: {
        name: "ZERVTEK CO., LTD",
        website: "www.zervtek.com",
        address: {
          street: "",
          city: "",
          state: "",
          zip: "",
          country: "",
        },
      },
    })
    console.log("✓ Company info created")
  } else {
    console.log("✓ Company info already exists")
  }

  console.log("Invoicing data seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
