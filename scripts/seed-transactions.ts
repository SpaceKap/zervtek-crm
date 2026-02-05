import { PrismaClient } from "@prisma/client";
import { TransactionDirection, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding dummy transactions...");

  try {
    // Get some existing data
    const vendors = await prisma.vendor.findMany({ take: 5 });
    const customers = await prisma.customer.findMany({ take: 3 });
    const vehicles = await prisma.vehicle.findMany({ take: 3 });
    const users = await prisma.user.findMany({ take: 1 });

    if (vendors.length === 0) {
      console.log("⚠️  No vendors found. Please create vendors first.");
      return;
    }

    if (customers.length === 0) {
      console.log("⚠️  No customers found. Please create customers first.");
      return;
    }

    if (users.length === 0) {
      console.log("⚠️  No users found. Please create users first.");
      return;
    }

    const userId = users[0].id;
    const today = new Date();
    const dates = [
      new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),  // 5 days ago
      new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),  // 2 days ago
    ];

    const transactions = [
      // 1. Auction Fees (OUTGOING)
      {
        direction: TransactionDirection.OUTGOING,
        type: TransactionType.BANK_TRANSFER,
        amount: 150000,
        currency: "JPY",
        date: dates[0],
        description: "Auction Fees - Vehicle Purchase",
        vendorId: vendors[0].id,
        vehicleId: vehicles.length > 0 ? vehicles[0].id : null,
        referenceNumber: "AUC-2024-001",
        notes: "Auction fees for vehicle purchase",
        createdById: userId,
      },
      // 2. Electricity Bill (OUTGOING)
      {
        direction: TransactionDirection.OUTGOING,
        type: TransactionType.BANK_TRANSFER,
        amount: 45000,
        currency: "JPY",
        date: dates[1],
        description: "Electricity Bill - Office",
        vendorId: vendors.length > 1 ? vendors[1].id : vendors[0].id,
        referenceNumber: "ELEC-2024-001",
        notes: "Monthly electricity bill for office",
        createdById: userId,
      },
      // 3. Customer Payment (INCOMING)
      {
        direction: TransactionDirection.INCOMING,
        type: TransactionType.BANK_TRANSFER,
        amount: 2500000,
        currency: "JPY",
        date: dates[2],
        description: "Customer Payment - Vehicle Purchase",
        customerId: customers[0].id,
        vehicleId: vehicles.length > 0 ? vehicles[0].id : null,
        referenceNumber: "CUST-PAY-2024-001",
        notes: "Full payment received from customer",
        createdById: userId,
      },
      // 4. Inland Transport (OUTGOING)
      {
        direction: TransactionDirection.OUTGOING,
        type: TransactionType.CASH,
        amount: 85000,
        currency: "JPY",
        date: dates[3],
        description: "Inland Transport - Vehicle Delivery",
        vendorId: vendors.length > 2 ? vendors[2].id : vendors[0].id,
        vehicleId: vehicles.length > 1 ? vehicles[1].id : null,
        referenceNumber: "TRANS-2024-001",
        notes: "Inland transport fees for vehicle delivery to yard",
        createdById: userId,
      },
      // 5. Photo Inspection Request (OUTGOING)
      {
        direction: TransactionDirection.OUTGOING,
        type: TransactionType.WISE,
        amount: 12000,
        currency: "JPY",
        date: dates[4],
        description: "Photo Inspection - Vehicle Photos",
        vendorId: vendors.length > 3 ? vendors[3].id : vendors[0].id,
        vehicleId: vehicles.length > 1 ? vehicles[1].id : null,
        referenceNumber: "PHOTO-2024-001",
        notes: "Photo inspection fees for vehicle documentation",
        createdById: userId,
      },
      // 6. Others - Office Supplies (OUTGOING)
      {
        direction: TransactionDirection.OUTGOING,
        type: TransactionType.PAYPAL,
        amount: 35000,
        currency: "JPY",
        date: dates[5],
        description: "Office Supplies - Stationery and Equipment",
        vendorId: vendors.length > 4 ? vendors[4].id : vendors[0].id,
        referenceNumber: "SUPPLIES-2024-001",
        notes: "Monthly office supplies purchase",
        createdById: userId,
      },
    ];

    // Create transactions
    for (const transactionData of transactions) {
      try {
        const transaction = await prisma.transaction.create({
          data: transactionData,
        });
        console.log(`✅ Created transaction: ${transaction.description} - ${transaction.amount} ${transaction.currency}`);
      } catch (error: any) {
        console.error(`❌ Failed to create transaction: ${transactionData.description}`, error.message);
      }
    }

    console.log("✨ Seeding completed!");
  } catch (error) {
    console.error("❌ Error seeding transactions:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
