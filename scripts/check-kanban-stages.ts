import { PrismaClient } from "@prisma/client";
import { InquiryStatus } from "@prisma/client";

// Load environment variables (tsx automatically loads .env, but we'll be explicit)
if (typeof require !== "undefined") {
  try {
    require("dotenv").config();
  } catch (e) {
    // dotenv not available, try alternative
    try {
      const { config } = require("dotenv");
      config();
    } catch (e2) {
      // Ignore if dotenv is not available
    }
  }
}

// Log DATABASE_URL (without password) for debugging
const dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ":****@");
  console.log(`Using DATABASE_URL: ${maskedUrl}`);
} else {
  console.error("ERROR: DATABASE_URL not found in environment variables!");
  console.error("Please ensure .env file exists and contains DATABASE_URL");
  process.exit(1);
}

// Use the same Prisma client initialization as the app
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
});

async function checkKanbanStages() {
  try {
    console.log("Checking Kanban stages...");
    
    // Check if table exists by trying to query it
    const stages = await prisma.kanbanStage.findMany({
      orderBy: { order: "asc" },
    });
    
    console.log(`Found ${stages.length} stages:`);
    stages.forEach((stage) => {
      console.log(`  - ${stage.name} (${stage.status}) - Order: ${stage.order}`);
    });
    
    // Define expected stages
    const expectedStages = [
      { name: "New", order: 0, status: InquiryStatus.NEW, color: "#3b82f6" },
      { name: "Contacted", order: 1, status: InquiryStatus.CONTACTED, color: "#8b5cf6" },
      { name: "Qualified", order: 2, status: InquiryStatus.QUALIFIED, color: "#10b981" },
      { name: "Deposit", order: 3, status: InquiryStatus.DEPOSIT, color: "#f59e0b" },
      { name: "Closed Won", order: 4, status: InquiryStatus.CLOSED_WON, color: "#22c55e" },
      { name: "Closed Lost", order: 5, status: InquiryStatus.CLOSED_LOST, color: "#6b7280" },
      { name: "Recurring", order: 6, status: InquiryStatus.RECURRING, color: "#06b6d4" },
    ];
    
    if (stages.length === 0) {
      console.log("\nNo stages found. Creating default stages...");
      await prisma.kanbanStage.createMany({
        data: expectedStages,
      });
      console.log("Default stages created!");
    } else {
      console.log("\nSyncing stages with expected values...");
      for (const expectedStage of expectedStages) {
        await prisma.kanbanStage.upsert({
          where: { status: expectedStage.status },
          update: {
            name: expectedStage.name,
            order: expectedStage.order,
            color: expectedStage.color,
          },
          create: expectedStage,
        });
      }
      console.log("Stages synced!");
    }
    
    // Verify final state
    const finalStages = await prisma.kanbanStage.findMany({
      orderBy: { order: "asc" },
    });
    console.log(`\nFinal state: ${finalStages.length} stages`);
    finalStages.forEach((stage) => {
      console.log(`  ✓ ${stage.name} (${stage.status})`);
    });
    
  } catch (error) {
    console.error("Error checking kanban stages:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkKanbanStages();
