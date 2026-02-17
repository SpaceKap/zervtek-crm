import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Test customer names/emails from seed-test-data.ts
const testCustomerNames = [
  "Tokyo Auto Imports Ltd.",
  "Osaka Motors International",
  "Yokohama Car Export Co.",
  "Nagoya Vehicle Trading",
  "Sapporo Auto Export",
];

const testCustomerEmails = [
  "contact@tokyoauto.co.jp",
  "info@osakamotors.jp",
  "sales@yokohamacars.com",
  "hello@nagoyavehicles.jp",
  "contact@sapporoauto.co.jp",
];

// Test vendor names from seed-invoicing.ts
const testVendorNames = [
  "HAA Kobe",
  "USS Tokyo",
  "NYK Line",
  "Document Services Co",
  "Precision Repairs",
  "Pro Mechanics",
  "Quality Body Shop",
  "Quick Delivery",
];

// Test vehicle VINs from seed-test-data.ts
const testVehicleVINs = [
  "JN1AZ4EH8DM123456",
  "JT2BF28K8X0123456",
  "JMZNC1A5XK0123456",
  "JHMCM56557C012345",
  "JN1TBNT30U0123456",
  "JTEBU5JR2K5123456",
  "JM7TB18V5K0123456",
  "JHMZF1C65BS012345",
  "JN1AZ4EH8DM789012",
  "JT2BF28K8X0789012",
  "JMZNC1A5XK0789012",
  "JHMCM56557C078901",
  "JN1TBNT30U0789012",
  "JTEBU5JR2K5789012",
  "JM7TB18V5K0789012",
];

async function main() {
  console.log("🧹 Starting cleanup of test data...\n");

  try {
    // 1. Delete invoices related to test vehicles/customers
    console.log("📄 Deleting test invoices...");
    const testCustomers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { in: testCustomerNames } },
          { email: { in: testCustomerEmails } },
        ],
      },
      select: { id: true },
    });

    const testCustomerIds = testCustomers.map((c) => c.id);

    const testVehicles = await prisma.vehicle.findMany({
      where: { vin: { in: testVehicleVINs } },
      select: { id: true },
    });

    const testVehicleIds = testVehicles.map((v) => v.id);

    // Delete invoice charges first (foreign key constraint)
    const invoicesToDelete = await prisma.invoice.findMany({
      where: {
        OR: [
          { customerId: { in: testCustomerIds } },
          { vehicleId: { in: testVehicleIds } },
        ],
      },
      select: { id: true },
    });

    const invoiceIds = invoicesToDelete.map((i) => i.id);

    if (invoiceIds.length > 0) {
      await prisma.invoiceCharge.deleteMany({
        where: { invoiceId: { in: invoiceIds } },
      });
      await prisma.invoice.deleteMany({
        where: { id: { in: invoiceIds } },
      });
      console.log(`   ✅ Deleted ${invoiceIds.length} invoices`);
    } else {
      console.log("   ℹ️  No test invoices found");
    }

    // 2. Delete shared invoices related to test vehicles
    console.log("\n📋 Deleting test shared invoices...");
    const sharedInvoicesToDelete = await prisma.sharedInvoice.findMany({
      where: {
        vehicles: {
          some: {
            vehicleId: { in: testVehicleIds },
          },
        },
      },
      select: { id: true },
    });

    const sharedInvoiceIds = sharedInvoicesToDelete.map((si) => si.id);

    if (sharedInvoiceIds.length > 0) {
      await prisma.sharedInvoiceVehicle.deleteMany({
        where: { sharedInvoiceId: { in: sharedInvoiceIds } },
      });
      await prisma.sharedInvoice.deleteMany({
        where: { id: { in: sharedInvoiceIds } },
      });
      console.log(`   ✅ Deleted ${sharedInvoiceIds.length} shared invoices`);
    } else {
      console.log("   ℹ️  No test shared invoices found");
    }

    // 3. Delete container invoices related to test vehicles
    console.log("\n📦 Deleting test container invoices...");
    const containerInvoicesToDelete = await prisma.containerInvoice.findMany({
      where: {
        vehicles: {
          some: {
            vehicleId: { in: testVehicleIds },
          },
        },
      },
      select: { id: true },
    });

    const containerInvoiceIds = containerInvoicesToDelete.map((ci) => ci.id);

    if (containerInvoiceIds.length > 0) {
      await prisma.containerInvoiceVehicle.deleteMany({
        where: { containerInvoiceId: { in: containerInvoiceIds } },
      });
      await prisma.containerInvoice.deleteMany({
        where: { id: { in: containerInvoiceIds } },
      });
      console.log(`   ✅ Deleted ${containerInvoiceIds.length} container invoices`);
    } else {
      console.log("   ℹ️  No test container invoices found");
    }

    // 4. Delete transactions related to test vehicles/customers
    console.log("\n💰 Deleting test transactions...");
    const transactionsDeleted = await prisma.transaction.deleteMany({
      where: {
        OR: [
          { customerId: { in: testCustomerIds } },
          { vehicleId: { in: testVehicleIds } },
        ],
      },
    });
    console.log(`   ✅ Deleted ${transactionsDeleted.count} transactions`);

    // 5. Delete vehicle stage costs related to test vehicles
    console.log("\n🔧 Deleting test vehicle stage costs...");
    const vehicleCostsDeleted = await prisma.vehicleStageCost.deleteMany({
      where: { vehicleId: { in: testVehicleIds } },
    });
    console.log(`   ✅ Deleted ${vehicleCostsDeleted.count} vehicle stage costs`);

    // 6. Delete general costs related to test vendors
    console.log("\n📊 Deleting test general costs...");
    const testVendors = await prisma.vendor.findMany({
      where: { name: { in: testVendorNames } },
      select: { id: true },
    });

    const testVendorIds = testVendors.map((v) => v.id);

    const generalCostsDeleted = await prisma.generalCost.deleteMany({
      where: { vendorId: { in: testVendorIds } },
    });
    console.log(`   ✅ Deleted ${generalCostsDeleted.count} general costs`);

    // 7. Delete vehicle documents related to test vehicles
    console.log("\n📎 Deleting test vehicle documents...");
    const documentsDeleted = await prisma.vehicleDocument.deleteMany({
      where: { vehicleId: { in: testVehicleIds } },
    });
    console.log(`   ✅ Deleted ${documentsDeleted.count} vehicle documents`);

    // 8. Delete test vehicles
    console.log("\n🚗 Deleting test vehicles...");
    const vehiclesDeleted = await prisma.vehicle.deleteMany({
      where: { vin: { in: testVehicleVINs } },
    });
    console.log(`   ✅ Deleted ${vehiclesDeleted.count} vehicles`);

    // 9. Delete test customers
    console.log("\n👥 Deleting test customers...");
    const customersDeleted = await prisma.customer.deleteMany({
      where: {
        OR: [
          { name: { in: testCustomerNames } },
          { email: { in: testCustomerEmails } },
        ],
      },
    });
    console.log(`   ✅ Deleted ${customersDeleted.count} customers`);

    // 10. Delete test vendors
    console.log("\n🏢 Deleting test vendors...");
    const vendorsDeleted = await prisma.vendor.deleteMany({
      where: { name: { in: testVendorNames } },
    });
    console.log(`   ✅ Deleted ${vendorsDeleted.count} vendors`);

    console.log("\n✨ Cleanup completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   - Invoices: ${invoiceIds.length}`);
    console.log(`   - Shared Invoices: ${sharedInvoiceIds.length}`);
    console.log(`   - Container Invoices: ${containerInvoiceIds.length}`);
    console.log(`   - Transactions: ${transactionsDeleted.count}`);
    console.log(`   - Vehicle Stage Costs: ${vehicleCostsDeleted.count}`);
    console.log(`   - General Costs: ${generalCostsDeleted.count}`);
    console.log(`   - Vehicle Documents: ${documentsDeleted.count}`);
    console.log(`   - Vehicles: ${vehiclesDeleted.count}`);
    console.log(`   - Customers: ${customersDeleted.count}`);
    console.log(`   - Vendors: ${vendorsDeleted.count}`);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
