import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function deleteAllCustomersAndVehicles() {
  try {
    console.log("🗑️  Starting deletion process...\n");

    // First, check counts
    const customerCount = await prisma.customer.count();
    const vehicleCount = await prisma.vehicle.count();

    console.log(`📊 Current counts:`);
    console.log(`   Customers: ${customerCount}`);
    console.log(`   Vehicles: ${vehicleCount}\n`);

    if (customerCount === 0 && vehicleCount === 0) {
      console.log("✅ Database is already empty. Nothing to delete.");
      return;
    }

    // Confirm deletion
    console.log("⚠️  WARNING: This will delete ALL customers and vehicles!");
    console.log("⚠️  This action cannot be undone!\n");

    // Delete vehicles first (they might have foreign key relationships)
    console.log("🗑️  Deleting all vehicles...");
    const deletedVehicles = await prisma.vehicle.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVehicles.count} vehicles\n`);

    // Delete customers
    console.log("🗑️  Deleting all customers...");
    const deletedCustomers = await prisma.customer.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCustomers.count} customers\n`);

    // Verify deletion
    const remainingCustomers = await prisma.customer.count();
    const remainingVehicles = await prisma.vehicle.count();

    console.log("📊 Final counts:");
    console.log(`   Customers: ${remainingCustomers}`);
    console.log(`   Vehicles: ${remainingVehicles}\n`);

    if (remainingCustomers === 0 && remainingVehicles === 0) {
      console.log("✅ Successfully deleted all customers and vehicles!");
    } else {
      console.log("⚠️  Warning: Some records may still exist due to foreign key constraints.");
    }
  } catch (error) {
    console.error("❌ Error deleting customers and vehicles:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
deleteAllCustomersAndVehicles()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
