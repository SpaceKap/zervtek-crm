import { PrismaClient } from "@prisma/client";
import { InquiryStatus } from "@prisma/client";

// Try to load dotenv if available (for local development)
try {
  const dotenv = require("dotenv");
  dotenv.config();
} catch (e) {
  // dotenv not installed, use environment variables directly
}

// Get DATABASE_URL from environment
let databaseUrl = process.env.DATABASE_URL || "";

// Fix DATABASE_URL if running outside Docker (postgres hostname won't resolve)
if (databaseUrl.includes("@postgres:5432")) {
  // If Supabase backup URL is available, prefer it (more reliable outside Docker)
  if (process.env.SUPABASE_BACKUP_URL) {
    console.log("Note: Using Supabase backup URL for database connection (running outside Docker)");
    databaseUrl = process.env.SUPABASE_BACKUP_URL;
  } else {
    // Fallback to localhost (if database is exposed on host port)
    console.log("Note: Replacing Docker service name 'postgres' with 'localhost' for direct script execution");
    databaseUrl = databaseUrl.replace("@postgres:5432", "@localhost:5432");
  }
}

if (!databaseUrl) {
  console.error("Error: DATABASE_URL not found in environment variables");
  process.exit(1);
}

// Hide password in logs
const safeUrl = databaseUrl.replace(/:([^:@]+)@/, ":****@");
console.log(`Connecting to database: ${safeUrl}`);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
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
