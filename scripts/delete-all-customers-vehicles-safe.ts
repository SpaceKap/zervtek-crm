import { PrismaClient } from "@prisma/client";
import * as readline from "readline";

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

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
      rl.close();
      return;
    }

    // Show some sample data
    if (customerCount > 0) {
      const sampleCustomers = await prisma.customer.findMany({
        take: 5,
        select: { id: true, name: true, email: true },
      });
      console.log("📋 Sample customers that will be deleted:");
      sampleCustomers.forEach((c) => {
        console.log(`   - ${c.name} (${c.email || "no email"})`);
      });
      if (customerCount > 5) {
        console.log(`   ... and ${customerCount - 5} more`);
      }
      console.log();
    }

    if (vehicleCount > 0) {
      const sampleVehicles = await prisma.vehicle.findMany({
        take: 5,
        select: { id: true, vin: true, make: true, model: true, year: true },
      });
      console.log("📋 Sample vehicles that will be deleted:");
      sampleVehicles.forEach((v) => {
        const desc = `${v.year || "N/A"} ${v.make || ""} ${v.model || ""} - ${v.vin}`.trim();
        console.log(`   - ${desc}`);
      });
      if (vehicleCount > 5) {
        console.log(`   ... and ${vehicleCount - 5} more`);
      }
      console.log();
    }

    // Confirm deletion
    console.log("⚠️  WARNING: This will delete ALL customers and vehicles!");
    console.log("⚠️  This action cannot be undone!\n");

    const answer = await askQuestion(
      "Type 'DELETE ALL' (in uppercase) to confirm deletion: "
    );

    if (answer !== "DELETE ALL") {
      console.log("❌ Deletion cancelled. No data was deleted.");
      rl.close();
      return;
    }

    // Delete vehicles first (they might have foreign key relationships)
    console.log("\n🗑️  Deleting all vehicles...");
    const deletedVehicles = await prisma.vehicle.deleteMany({});
    console.log(`   ✅ Deleted ${deletedVehicles.count} vehicles`);

    // Delete customers
    console.log("🗑️  Deleting all customers...");
    const deletedCustomers = await prisma.customer.deleteMany({});
    console.log(`   ✅ Deleted ${deletedCustomers.count} customers`);

    // Verify deletion
    const remainingCustomers = await prisma.customer.count();
    const remainingVehicles = await prisma.vehicle.count();

    console.log("\n📊 Final counts:");
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
    rl.close();
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
