import { PrismaClient, InvoiceStatus, PaymentStatus, ChargeCategory, TransactionDirection, TransactionType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// Generate invoice number: INV-XXXXX (starting from INV-80001)
async function generateInvoiceNumber(): Promise<string> {
  const prefix = "INV-";

  return await prisma.$transaction(async (tx) => {
    const lastInvoice = await tx.invoice.findFirst({
      where: {
        invoiceNumber: {
          startsWith: prefix,
        },
      },
      orderBy: {
        invoiceNumber: "desc",
      },
    });

    let nextNumber = 80001;
    if (lastInvoice) {
      const lastNumber = parseInt(
        lastInvoice.invoiceNumber.replace(prefix, ""),
        10
      );
      if (lastNumber >= 80001) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}${nextNumber.toString()}`;
  });
}

async function main() {
  console.log("🌱 Seeding comprehensive test data...");

  // Get or create a user for createdById
  let adminUser = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (!adminUser) {
    adminUser = await prisma.user.findFirst({
      where: { role: "MANAGER" },
    });
  }

  if (!adminUser) {
    console.error("❌ No admin or manager user found. Please create a user first.");
    process.exit(1);
  }

  // Ensure charge types exist
  const chargeTypes = [
    { name: "Export Fees", category: ChargeCategory.EXPORT_FEES },
    { name: "Shipping", category: ChargeCategory.SHIPPING },
    { name: "Additional Transport", category: ChargeCategory.ADDITIONAL_TRANSPORT },
    { name: "Recycle Fees", category: ChargeCategory.RECYCLE_FEES },
  ];

  const createdChargeTypes = [];
  for (const chargeType of chargeTypes) {
    const ct = await prisma.chargeType.upsert({
      where: { name: chargeType.name },
      update: chargeType,
      create: chargeType,
    });
    createdChargeTypes.push(ct);
    console.log(`✓ Charge type: ${chargeType.name}`);
  }

  // Ensure vendors exist
  const vendorNames = [
    "HAA Kobe",
    "USS Tokyo",
    "NYK Line",
    "Document Services Co",
    "Precision Repairs",
    "Pro Mechanics",
    "Quality Body Shop",
    "Quick Delivery",
  ];

  const createdVendors = [];
  for (const vendorName of vendorNames) {
    const vendor = await prisma.vendor.upsert({
      where: { name: vendorName },
      update: {},
      create: { name: vendorName },
    });
    createdVendors.push(vendor);
    console.log(`✓ Vendor: ${vendorName}`);
  }

  // Create customers
  const customers = [
    {
      name: "Tokyo Auto Imports Ltd.",
      email: "contact@tokyoauto.co.jp",
      phone: "+81-3-1234-5678",
      country: "Japan",
      billingAddress: {
        street: "1-2-3 Shibuya",
        city: "Tokyo",
        state: "Tokyo",
        zip: "150-0001",
        country: "Japan",
      },
      shippingAddress: {
        street: "1-2-3 Shibuya",
        city: "Tokyo",
        state: "Tokyo",
        zip: "150-0001",
        country: "Japan",
      },
      portOfDestination: "Tokyo Port",
    },
    {
      name: "Osaka Motors International",
      email: "info@osakamotors.jp",
      phone: "+81-6-9876-5432",
      country: "Japan",
      billingAddress: {
        street: "5-6-7 Chuo-ku",
        city: "Osaka",
        state: "Osaka",
        zip: "540-0001",
        country: "Japan",
      },
      shippingAddress: {
        street: "5-6-7 Chuo-ku",
        city: "Osaka",
        state: "Osaka",
        zip: "540-0001",
        country: "Japan",
      },
      portOfDestination: "Osaka Port",
    },
    {
      name: "Yokohama Car Export Co.",
      email: "sales@yokohamacars.com",
      phone: "+81-45-1111-2222",
      country: "Japan",
      billingAddress: {
        street: "10-20-30 Naka-ku",
        city: "Yokohama",
        state: "Kanagawa",
        zip: "231-0001",
        country: "Japan",
      },
      shippingAddress: {
        street: "10-20-30 Naka-ku",
        city: "Yokohama",
        state: "Kanagawa",
        zip: "231-0001",
        country: "Japan",
      },
      portOfDestination: "Yokohama Port",
    },
  ];

  const createdCustomers = [];
  for (const customerData of customers) {
    const existing = await prisma.customer.findFirst({
      where: { name: customerData.name },
    });

    let customer;
    if (existing) {
      customer = await prisma.customer.update({
        where: { id: existing.id },
        data: customerData,
      });
    } else {
      customer = await prisma.customer.create({
        data: customerData,
      });
    }
    createdCustomers.push(customer);
    console.log(`✓ Customer: ${customer.name}`);
  }

  // Create vehicles
  const vehicles = [
    {
      vin: "JN1AZ4EH8DM123456",
      make: "Nissan",
      model: "Skyline GT-R",
      year: 2020,
      price: 8500000,
      customerId: createdCustomers[0].id,
    },
    {
      vin: "JT2BF28K8X0123456",
      make: "Toyota",
      model: "Supra",
      year: 2021,
      price: 7200000,
      customerId: createdCustomers[0].id,
    },
    {
      vin: "JMZNC1A5XK0123456",
      make: "Mazda",
      model: "RX-7",
      year: 2019,
      price: 6500000,
      customerId: createdCustomers[1].id,
    },
    {
      vin: "JHMCM56557C012345",
      make: "Honda",
      model: "NSX",
      year: 2022,
      price: 12500000,
      customerId: createdCustomers[1].id,
    },
    {
      vin: "JN1TBNT30U0123456",
      make: "Nissan",
      model: "Fairlady Z",
      year: 2023,
      price: 5800000,
      customerId: createdCustomers[2].id,
    },
  ];

  const createdVehicles = [];
  for (const vehicleData of vehicles) {
    const vehicle = await prisma.vehicle.upsert({
      where: { vin: vehicleData.vin },
      update: vehicleData,
      create: {
        ...vehicleData,
        createdById: adminUser.id,
      },
    });
    createdVehicles.push(vehicle);
    console.log(`✓ Vehicle: ${vehicle.year || "N/A"} ${vehicle.make || ""} ${vehicle.model || ""} (VIN: ${vehicle.vin})`);
  }

  // Create invoices with charges
  const invoiceStatuses: InvoiceStatus[] = [
    InvoiceStatus.DRAFT,
    InvoiceStatus.PENDING_APPROVAL,
    InvoiceStatus.APPROVED,
    InvoiceStatus.FINALIZED,
  ];

  const createdInvoices = [];
  for (let i = 0; i < createdVehicles.length; i++) {
    const vehicle = createdVehicles[i];
    const customer = createdCustomers.find(c => c.id === vehicle.customerId) || createdCustomers[0];
    const invoiceNumber = await generateInvoiceNumber();
    const status = invoiceStatuses[i % invoiceStatuses.length];

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: customer.id,
        vehicleId: vehicle.id,
        createdById: adminUser.id,
        status,
        issueDate: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000), // Stagger dates
        dueDate: new Date(Date.now() + (30 - i * 7) * 24 * 60 * 60 * 1000),
        paymentStatus: status === InvoiceStatus.FINALIZED ? PaymentStatus.PAID : PaymentStatus.PENDING,
        charges: {
          create: [
            {
              description: "Export Fees",
              amount: new Decimal(150000),
              chargeTypeId: createdChargeTypes.find(ct => ct.name === "Export Fees")?.id,
            },
            {
              description: "Shipping",
              amount: new Decimal(250000),
              chargeTypeId: createdChargeTypes.find(ct => ct.name === "Shipping")?.id,
            },
            {
              description: "Additional Transport",
              amount: new Decimal(50000),
              chargeTypeId: createdChargeTypes.find(ct => ct.name === "Additional Transport")?.id,
            },
          ],
        },
      },
      include: {
        charges: true,
      },
    });

    createdInvoices.push(invoice);
    console.log(`✓ Invoice: ${invoice.invoiceNumber} (${invoice.status}) - ${invoice.charges.length} charges`);

    // Create cost invoice with cost items
    const totalRevenue = invoice.charges.reduce((sum, charge) => sum + Number(charge.amount), 0);
    const totalCost = totalRevenue * 0.6; // Assume 60% cost
    const profit = totalRevenue - totalCost;
    const margin = (profit / totalRevenue) * 100;
    const roi = (profit / totalCost) * 100;

    const costInvoice = await prisma.costInvoice.create({
      data: {
        invoiceId: invoice.id,
        totalCost: new Decimal(totalCost),
        totalRevenue: new Decimal(totalRevenue),
        profit: new Decimal(profit),
        margin: new Decimal(margin),
        roi: new Decimal(roi),
        costItems: {
          create: [
            {
              description: "Auction Fees",
              amount: new Decimal(totalCost * 0.3),
              vendorId: createdVendors[0].id,
              paymentDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              category: "Auction Fees",
            },
            {
              description: "Vehicle Purchase",
              amount: new Decimal(totalCost * 0.4),
              vendorId: createdVendors[1].id,
              paymentDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
              category: "Vehicle Purchase",
            },
            {
              description: "Inland Transport",
              amount: new Decimal(totalCost * 0.2),
              vendorId: createdVendors[2].id,
              paymentDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
              category: "Inland Transport",
            },
            {
              description: "Forwarding",
              amount: new Decimal(totalCost * 0.1),
              vendorId: createdVendors[3].id,
              paymentDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              category: "Forwarding",
            },
          ],
        },
      },
      include: {
        costItems: true,
      },
    });

    console.log(`✓ Cost Invoice: ${costInvoice.id} - ${costInvoice.costItems?.length || 0} cost items`);

    // Create transactions
    // Incoming transaction from customer (if invoice is finalized)
    if (invoice.status === InvoiceStatus.FINALIZED) {
      const incomingTransaction = await prisma.transaction.create({
        data: {
          direction: TransactionDirection.INCOMING,
          type: TransactionType.BANK_TRANSFER,
          amount: new Decimal(totalRevenue),
          date: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000),
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          customerId: customer.id,
          vehicleId: vehicle.id,
          invoiceId: invoice.id,
          referenceNumber: `REF-${invoice.invoiceNumber}-${Date.now()}`,
        },
      });
      console.log(`✓ Incoming Transaction: ${incomingTransaction.id} - ¥${totalRevenue.toLocaleString()}`);
    }

    // Outgoing transactions for cost items
    for (const costItem of costInvoice.costItems || []) {
      // Some cost items are paid, some are pending
      const isPaid = Math.random() > 0.5;
      if (isPaid) {
        const outgoingTransaction = await prisma.transaction.create({
          data: {
            direction: TransactionDirection.OUTGOING,
            type: TransactionType.BANK_TRANSFER,
            amount: costItem.amount,
            date: new Date(costItem.paymentDeadline.getTime() - 2 * 24 * 60 * 60 * 1000), // Paid 2 days before deadline
            description: costItem.description,
            vendorId: costItem.vendorId,
            vehicleId: vehicle.id,
            referenceNumber: `PAY-${costItem.id}`,
          },
        });
        console.log(`✓ Outgoing Transaction: ${outgoingTransaction.id} - ¥${Number(costItem.amount).toLocaleString()}`);
      }
    }
  }

  console.log("\n✨ Comprehensive seeding completed!");
  console.log(`📊 Created/Updated ${createdCustomers.length} customers`);
  console.log(`🚗 Created/Updated ${createdVehicles.length} vehicles`);
  console.log(`📄 Created ${createdInvoices.length} invoices`);
  console.log(`💰 Created cost invoices and transactions`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
