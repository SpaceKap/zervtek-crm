import { PrismaClient, TransactionDirection, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

// Transaction templates for different scenarios
const transactionTemplates: Array<{
  direction: TransactionDirection;
  type: TransactionType;
  description: string;
  amountRange: { min: number; max: number };
  includeVehicle: boolean;
  includeInvoice: boolean;
}> = [
  // Incoming transactions (payments from customers)
  {
    direction: TransactionDirection.INCOMING,
    type: TransactionType.BANK_TRANSFER,
    description: "Vehicle Purchase Payment",
    amountRange: { min: 500000, max: 5000000 },
    includeVehicle: true,
    includeInvoice: true,
  },
  {
    direction: TransactionDirection.INCOMING,
    type: TransactionType.PAYPAL,
    description: "Deposit Payment",
    amountRange: { min: 50000, max: 500000 },
    includeVehicle: true,
    includeInvoice: false,
  },
  {
    direction: TransactionDirection.INCOMING,
    type: TransactionType.WISE,
    description: "Final Payment",
    amountRange: { min: 200000, max: 3000000 },
    includeVehicle: true,
    includeInvoice: true,
  },
  {
    direction: TransactionDirection.INCOMING,
    type: TransactionType.CASH,
    description: "Partial Payment",
    amountRange: { min: 100000, max: 1000000 },
    includeVehicle: true,
    includeInvoice: false,
  },
  // Outgoing transactions (costs to vendors)
  {
    direction: TransactionDirection.OUTGOING,
    type: TransactionType.BANK_TRANSFER,
    description: "Auction Fees",
    amountRange: { min: 50000, max: 300000 },
    includeVehicle: true,
    includeInvoice: false,
  },
  {
    direction: TransactionDirection.OUTGOING,
    type: TransactionType.BANK_TRANSFER,
    description: "Vehicle Purchase Cost",
    amountRange: { min: 300000, max: 4000000 },
    includeVehicle: true,
    includeInvoice: false,
  },
  {
    direction: TransactionDirection.OUTGOING,
    type: TransactionType.BANK_TRANSFER,
    description: "Transport Fees",
    amountRange: { min: 30000, max: 200000 },
    includeVehicle: true,
    includeInvoice: false,
  },
  {
    direction: TransactionDirection.OUTGOING,
    type: TransactionType.BANK_TRANSFER,
    description: "Inspection Fees",
    amountRange: { min: 10000, max: 50000 },
    includeVehicle: true,
    includeInvoice: false,
  },
  {
    direction: TransactionDirection.OUTGOING,
    type: TransactionType.BANK_TRANSFER,
    description: "Repair Costs",
    amountRange: { min: 20000, max: 500000 },
    includeVehicle: true,
    includeInvoice: false,
  },
  {
    direction: TransactionDirection.OUTGOING,
    type: TransactionType.BANK_TRANSFER,
    description: "Forwarding Fees",
    amountRange: { min: 50000, max: 300000 },
    includeVehicle: true,
    includeInvoice: false,
  },
  {
    direction: TransactionDirection.OUTGOING,
    type: TransactionType.BANK_TRANSFER,
    description: "Freight Costs",
    amountRange: { min: 100000, max: 800000 },
    includeVehicle: true,
    includeInvoice: false,
  },
  {
    direction: TransactionDirection.OUTGOING,
    type: TransactionType.PAYPAL,
    description: "Small Parts Purchase",
    amountRange: { min: 5000, max: 50000 },
    includeVehicle: false,
    includeInvoice: false,
  },
  {
    direction: TransactionDirection.OUTGOING,
    type: TransactionType.WISE,
    description: "International Payment",
    amountRange: { min: 100000, max: 2000000 },
    includeVehicle: false,
    includeInvoice: false,
  },
];

async function main() {
  console.log("🌱 Seeding dummy transactions...");

  // Get existing data
  const customers = await prisma.customer.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  const vendors = await prisma.vendor.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  const vehicles = await prisma.vehicle.findMany({
    take: 20,
    include: {
      invoices: {
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ["ADMIN", "MANAGER", "ACCOUNTANT"],
      },
    },
    take: 3,
  });

  if (customers.length === 0) {
    console.log("⚠️  No customers found. Please run seed-test-data.ts first.");
    process.exit(0);
  }

  if (vendors.length === 0) {
    console.log("⚠️  No vendors found. Please create vendors first.");
    process.exit(0);
  }

  console.log(`📦 Found ${customers.length} customers, ${vendors.length} vendors, ${vehicles.length} vehicles`);

  const createdUser = users[0] || null;
  let transactionsCreated = 0;

  // Generate transactions for the past 6 months
  const now = new Date();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Create 50-100 transactions
  const numTransactions = Math.floor(Math.random() * 50) + 50; // 50-100 transactions

  for (let i = 0; i < numTransactions; i++) {
    // Random date within the past 6 months
    const randomDaysAgo = Math.floor(Math.random() * 180); // 0-180 days ago
    const transactionDate = new Date(now);
    transactionDate.setDate(transactionDate.getDate() - randomDaysAgo);

    // Pick a random template
    const template = transactionTemplates[Math.floor(Math.random() * transactionTemplates.length)];

    // Generate amount
    const amount = Math.floor(
      Math.random() * (template.amountRange.max - template.amountRange.min) +
        template.amountRange.min
    );

    // Select customer/vendor
    const customer = template.direction === TransactionDirection.INCOMING
      ? customers[Math.floor(Math.random() * customers.length)]
      : null;

    const vendor = template.direction === TransactionDirection.OUTGOING
      ? vendors[Math.floor(Math.random() * vendors.length)]
      : null;

    // Select vehicle if needed
    let vehicle = null;
    let invoiceId = null;

    if (template.includeVehicle && vehicles.length > 0) {
      vehicle = vehicles[Math.floor(Math.random() * vehicles.length)];
      
      // Link to invoice if available and needed
      if (template.includeInvoice && vehicle.invoices && vehicle.invoices.length > 0) {
        invoiceId = vehicle.invoices[0].id;
      }
    }

    // Generate reference number
    const referenceNumber = template.direction === TransactionDirection.INCOMING
      ? `CUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      : `VEND-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Build description with vehicle info if available
    let description = template.description;
    if (vehicle) {
      const vehicleInfo = vehicle.year
        ? `${vehicle.year} ${vehicle.make || ""} ${vehicle.model || ""} - ${vehicle.vin}`
        : `${vehicle.make || ""} ${vehicle.model || ""} - ${vehicle.vin}`;
      description = `${template.description}\nVehicle: ${vehicleInfo.trim()}`;
      
      if (vendor && template.direction === TransactionDirection.OUTGOING) {
        description += `\nVendor: ${vendor.name}`;
      }
    }

    try {
      await prisma.transaction.create({
        data: {
          direction: template.direction,
          type: template.type,
          amount: amount,
          currency: "JPY",
          date: transactionDate,
          description: description,
          vendorId: vendor?.id || null,
          customerId: customer?.id || null,
          vehicleId: vehicle?.id || null,
          invoiceId: invoiceId || null,
          referenceNumber: referenceNumber,
          notes: Math.random() > 0.7 ? `Transaction notes: ${template.type} payment processed` : null,
          createdById: createdUser?.id || null,
        },
      });
      transactionsCreated++;
    } catch (error) {
      console.error(`❌ Error creating transaction:`, error);
    }
  }

  console.log(`\n✨ Seeding completed!`);
  console.log(`💰 Created ${transactionsCreated} transactions`);
  console.log(`📊 Breakdown:`);
  
  // Count by direction
  const incomingCount = await prisma.transaction.count({
    where: { direction: TransactionDirection.INCOMING },
  });
  const outgoingCount = await prisma.transaction.count({
    where: { direction: TransactionDirection.OUTGOING },
  });
  
  console.log(`   - Incoming: ${incomingCount}`);
  console.log(`   - Outgoing: ${outgoingCount}`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding transactions:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
