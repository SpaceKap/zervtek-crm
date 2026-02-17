/**
 * Script to fix vehicle-customer relationships
 * 
 * This script:
 * 1. Finds all vehicles that have invoices but no customerId set
 * 2. Sets the vehicle's customerId to match the invoice's customerId
 * 3. Handles cases where a vehicle has multiple invoices with different customers (uses the most recent)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixVehicleCustomerLinks() {
  console.log("🔍 Finding vehicles with invoices but no customerId...");

  // Find all vehicles that have invoices but customerId is null
  const vehiclesWithInvoices = await prisma.vehicle.findMany({
    where: {
      customerId: null,
      invoices: {
        some: {},
      },
    },
    include: {
      invoices: {
        select: {
          id: true,
          customerId: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  console.log(`Found ${vehiclesWithInvoices.length} vehicles to fix`);

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const vehicle of vehiclesWithInvoices) {
    if (vehicle.invoices.length === 0) {
      skipped++;
      continue;
    }

    // Get the most recent invoice's customerId
    const mostRecentInvoice = vehicle.invoices[0];
    const customerId = mostRecentInvoice.customerId;

    if (!customerId) {
      console.log(`⚠️  Vehicle ${vehicle.vin} has invoices but no customerId in invoices`);
      skipped++;
      continue;
    }

    try {
      // Check if customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer) {
        console.log(`⚠️  Customer ${customerId} not found for vehicle ${vehicle.vin}`);
        skipped++;
        continue;
      }

      // Update vehicle
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { customerId },
      });

      console.log(`✅ Fixed vehicle ${vehicle.vin} -> Customer: ${customer.name}`);
      fixed++;
    } catch (error: any) {
      console.error(`❌ Error fixing vehicle ${vehicle.vin}:`, error.message);
      errors++;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Errors: ${errors}`);

  await prisma.$disconnect();
}

fixVehicleCustomerLinks()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
