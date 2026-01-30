import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding test customers and vehicles...");

  // Test Customers
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
    {
      name: "Nagoya Vehicle Trading",
      email: "hello@nagoyavehicles.jp",
      phone: "+81-52-3333-4444",
      country: "Japan",
      billingAddress: {
        street: "8-9-10 Naka-ku",
        city: "Nagoya",
        state: "Aichi",
        zip: "460-0001",
        country: "Japan",
      },
      shippingAddress: {
        street: "8-9-10 Naka-ku",
        city: "Nagoya",
        state: "Aichi",
        zip: "460-0001",
        country: "Japan",
      },
      portOfDestination: "Nagoya Port",
    },
    {
      name: "Sapporo Auto Export",
      email: "contact@sapporoauto.co.jp",
      phone: "+81-11-5555-6666",
      country: "Japan",
      billingAddress: {
        street: "15-25-35 Chuo-ku",
        city: "Sapporo",
        state: "Hokkaido",
        zip: "060-0001",
        country: "Japan",
      },
      shippingAddress: {
        street: "15-25-35 Chuo-ku",
        city: "Sapporo",
        state: "Hokkaido",
        zip: "060-0001",
        country: "Japan",
      },
      portOfDestination: "Sapporo Port",
    },
  ];

  // Create customers
  const createdCustomers = [];
  for (const customerData of customers) {
    // Check if customer already exists by name
    const existing = await prisma.customer.findFirst({
      where: { name: customerData.name },
    });

    let customer;
    if (existing) {
      customer = await prisma.customer.update({
        where: { id: existing.id },
        data: customerData,
      });
      console.log(`✅ Updated customer: ${customer.name}`);
    } else {
      customer = await prisma.customer.create({
        data: customerData,
      });
      console.log(`✅ Created customer: ${customer.name}`);
    }
    createdCustomers.push(customer);
  }

  // Test Vehicles with VINs and prices
  const vehicles = [
    {
      vin: "JN1AZ4EH8DM123456",
      make: "Nissan",
      model: "Skyline GT-R",
      year: 2020,
      price: 8500000, // ¥8,500,000
    },
    {
      vin: "JT2BF28K8X0123456",
      make: "Toyota",
      model: "Supra",
      year: 2021,
      price: 7200000, // ¥7,200,000
    },
    {
      vin: "JMZNC1A5XK0123456",
      make: "Mazda",
      model: "RX-7",
      year: 2019,
      price: 6500000, // ¥6,500,000
    },
    {
      vin: "JHMCM56557C012345",
      make: "Honda",
      model: "NSX",
      year: 2022,
      price: 12500000, // ¥12,500,000
    },
    {
      vin: "JN1TBNT30U0123456",
      make: "Nissan",
      model: "Fairlady Z",
      year: 2023,
      price: 5800000, // ¥5,800,000
    },
    {
      vin: "JTEBU5JR2K5123456",
      make: "Toyota",
      model: "Land Cruiser",
      year: 2021,
      price: 6800000, // ¥6,800,000
    },
    {
      vin: "JM7TB18V5K0123456",
      make: "Mazda",
      model: "MX-5 Miata",
      year: 2022,
      price: 3200000, // ¥3,200,000
    },
    {
      vin: "JHMZF1C65BS012345",
      make: "Honda",
      model: "Civic Type R",
      year: 2023,
      price: 4500000, // ¥4,500,000
    },
    {
      vin: "JN1AZ4EH8DM789012",
      make: "Nissan",
      model: "GT-R Nismo",
      year: 2022,
      price: 18500000, // ¥18,500,000
    },
    {
      vin: "JT2BF28K8X0789012",
      make: "Toyota",
      model: "GR Yaris",
      year: 2023,
      price: 4200000, // ¥4,200,000
    },
    {
      vin: "JMZNC1A5XK0789012",
      make: "Mazda",
      model: "CX-5",
      year: 2021,
      price: 3800000, // ¥3,800,000
    },
    {
      vin: "JHMCM56557C078901",
      make: "Honda",
      model: "CR-V",
      year: 2022,
      price: 3500000, // ¥3,500,000
    },
    {
      vin: "JN1TBNT30U0789012",
      make: "Nissan",
      model: "Leaf",
      year: 2023,
      price: 4200000, // ¥4,200,000
    },
    {
      vin: "JTEBU5JR2K5789012",
      make: "Toyota",
      model: "Prius",
      year: 2022,
      price: 3200000, // ¥3,200,000
    },
    {
      vin: "JM7TB18V5K0789012",
      make: "Mazda",
      model: "CX-9",
      year: 2021,
      price: 4800000, // ¥4,800,000
    },
  ];

  // Create vehicles
  for (const vehicleData of vehicles) {
    const vehicle = await prisma.vehicle.upsert({
      where: { vin: vehicleData.vin },
      update: vehicleData,
      create: vehicleData,
    });
    console.log(`✅ Created/Updated vehicle: ${vehicle.year || "N/A"} ${vehicle.make || ""} ${vehicle.model || ""} (VIN: ${vehicle.vin})`);
  }

  console.log("\n✨ Seeding completed!");
  console.log(`📊 Created/Updated ${createdCustomers.length} customers`);
  console.log(`🚗 Created/Updated ${vehicles.length} vehicles`);
}

main()
  .catch((e) => {
    console.error("❌ Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
