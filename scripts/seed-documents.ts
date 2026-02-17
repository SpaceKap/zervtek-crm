import { PrismaClient, DocumentCategory, ShippingStage } from "@prisma/client";

const prisma = new PrismaClient();

// Document templates for different categories
const documentTemplates: Array<{
  category: DocumentCategory;
  name: string;
  description?: string;
  stage?: ShippingStage;
  fileType?: string;
  fileSize?: number;
}> = [
  {
    category: DocumentCategory.AUCTION_SHEET,
    name: "Auction Sheet",
    description: "Original auction sheet document",
    stage: ShippingStage.PURCHASE,
    fileType: "application/pdf",
    fileSize: 245000,
  },
  {
    category: DocumentCategory.INVOICE,
    name: "Purchase Invoice",
    description: "Invoice from auction house/dealer",
    stage: ShippingStage.PURCHASE,
    fileType: "application/pdf",
    fileSize: 120000,
  },
  {
    category: DocumentCategory.PHOTOS,
    name: "Vehicle Photos",
    description: "Exterior and interior photos",
    stage: ShippingStage.TRANSPORT,
    fileType: "image/jpeg",
    fileSize: 3500000,
  },
  {
    category: DocumentCategory.EXPORT_CERTIFICATE,
    name: "Export Certificate",
    description: "Official export certificate",
    stage: ShippingStage.DOCUMENTS,
    fileType: "application/pdf",
    fileSize: 150000,
  },
  {
    category: DocumentCategory.DEREGISTRATION_CERTIFICATE,
    name: "Deregistration Certificate",
    description: "Vehicle deregistration certificate",
    stage: ShippingStage.DOCUMENTS,
    fileType: "application/pdf",
    fileSize: 110000,
  },
  {
    category: DocumentCategory.SHIPPING_INSTRUCTIONS,
    name: "Shipping Instructions",
    description: "Shipping and handling instructions",
    stage: ShippingStage.BOOKING,
    fileType: "application/pdf",
    fileSize: 200000,
  },
  {
    category: DocumentCategory.BILL_OF_LADING,
    name: "Bill of Lading",
    description: "Original bill of lading",
    stage: ShippingStage.SHIPPED,
    fileType: "application/pdf",
    fileSize: 175000,
  },
  {
    category: DocumentCategory.DHL_TRACKING,
    name: "DHL Tracking Information",
    description: "DHL tracking number and details",
    stage: ShippingStage.DHL,
    fileType: "text/plain",
    fileSize: 5000,
  },
];

async function main() {
  console.log("🌱 Seeding dummy documents for vehicles...");

  // Get all vehicles
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { createdAt: "desc" },
  });

  if (vehicles.length === 0) {
    console.log("⚠️  No vehicles found. Please run seed-test-data.ts first.");
    process.exit(0);
  }

  console.log(`📦 Found ${vehicles.length} vehicles`);

  // Get a user for uploadedById (optional but good to have)
  const adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  const managerUser = adminUser || (await prisma.user.findFirst({
    where: { role: "MANAGER" },
  }));

  let documentsCreated = 0;

  // Add documents to each vehicle
  for (const vehicle of vehicles) {
    // Select 3-6 random documents per vehicle
    const numDocuments = Math.floor(Math.random() * 4) + 3; // 3-6 documents
    const selectedTemplates = documentTemplates
      .sort(() => Math.random() - 0.5)
      .slice(0, numDocuments);

    for (const template of selectedTemplates) {
      // Generate a dummy file URL (placeholder)
      const fileUrl = `https://example.com/documents/${vehicle.vin}/${template.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.pdf`;

      try {
        await prisma.vehicleDocument.create({
          data: {
            vehicleId: vehicle.id,
            category: template.category,
            name: template.name,
            fileUrl: fileUrl,
            fileType: template.fileType,
            fileSize: template.fileSize,
            description: template.description,
            stage: template.stage || null,
            uploadedById: managerUser?.id || null,
            visibleToCustomer: Math.random() > 0.5, // Randomly make some visible to customer
          },
        });
        documentsCreated++;
      } catch (error) {
        console.error(
          `❌ Error creating document ${template.name} for vehicle ${vehicle.vin}:`,
          error,
        );
      }
    }

    console.log(
      `✓ Added ${selectedTemplates.length} documents to ${vehicle.year || "N/A"} ${vehicle.make || ""} ${vehicle.model || ""} (VIN: ${vehicle.vin})`,
    );
  }

  console.log(`\n✨ Seeding completed!`);
  console.log(`📄 Created ${documentsCreated} documents across ${vehicles.length} vehicles`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding documents:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
