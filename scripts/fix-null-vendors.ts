import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Finding cost items with null vendorId...")
  
  const costItemsWithNullVendor = await prisma.costItem.findMany({
    where: {
      vendorId: null,
    },
  })

  console.log(`Found ${costItemsWithNullVendor.length} cost items with null vendorId`)

  if (costItemsWithNullVendor.length === 0) {
    console.log("No cost items to fix!")
    return
  }

  // Get the first vendor or create a default one
  let defaultVendor = await prisma.vendor.findFirst()
  
  if (!defaultVendor) {
    console.log("No vendors found. Creating a default vendor...")
    defaultVendor = await prisma.vendor.create({
      data: {
        name: "Default Vendor",
      },
    })
    console.log(`Created default vendor: ${defaultVendor.id}`)
  }

  // Update all cost items with null vendorId
  const result = await prisma.costItem.updateMany({
    where: {
      vendorId: null,
    },
    data: {
      vendorId: defaultVendor.id,
    },
  })

  console.log(`Updated ${result.count} cost items with vendor: ${defaultVendor.name}`)
  console.log("✅ Done! You can now run: npx prisma db push")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
