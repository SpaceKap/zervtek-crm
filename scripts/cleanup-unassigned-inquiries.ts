#!/usr/bin/env tsx
/**
 * Script to permanently delete unassigned inquiries older than a week
 *
 * This script removes inquiries that:
 * - Are not assigned to anyone (assignedToId is null)
 * - Are older than 7 days
 *
 * Usage:
 *   Local (with DATABASE_URL pointing at DB):
 *     npm run cleanup-unassigned-inquiries -- [--dry-run]
 *
 *   On VPS with Docker (run inside app container so it can reach postgres):
 *     docker compose exec inquiry-pooler npm run cleanup-unassigned-inquiries -- --dry-run
 *     docker compose exec inquiry-pooler npm run cleanup-unassigned-inquiries
 *
 * Options:
 *   --dry-run    Show what would be deleted without actually deleting
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function cleanupUnassignedInquiries(dryRun: boolean = false) {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    console.log(
      `\nLooking for unassigned inquiries older than ${oneWeekAgo.toISOString()}\n`
    );

    const inquiriesToDelete = await prisma.inquiry.findMany({
      where: {
        assignedToId: null,
        createdAt: {
          lt: oneWeekAgo,
        },
      },
      select: {
        id: true,
        customerName: true,
        email: true,
        source: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (inquiriesToDelete.length === 0) {
      console.log("No unassigned inquiries older than a week found.");
      return;
    }

    console.log(
      `Found ${inquiriesToDelete.length} unassigned inquiry(ies) to delete:\n`
    );

    inquiriesToDelete.forEach((inquiry, index) => {
      console.log(
        `${index + 1}. ${inquiry.customerName || inquiry.email || "Unknown"} ` +
          `(${inquiry.source}) - Created: ${inquiry.createdAt.toISOString()}`
      );
    });

    if (dryRun) {
      console.log(
        `\nDRY RUN MODE - No inquiries were deleted. Run without --dry-run to delete.\n`
      );
      return;
    }

    console.log(
      `\nWARNING: This will permanently delete ${inquiriesToDelete.length} inquiry(ies).`
    );

    const deleteResult = await prisma.inquiry.deleteMany({
      where: {
        id: {
          in: inquiriesToDelete.map((inq) => inq.id),
        },
      },
    });

    console.log(
      `\nSuccessfully deleted ${deleteResult.count} unassigned inquiry(ies).\n`
    );
  } catch (error) {
    console.error("Error cleaning up inquiries:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run") || args.includes("-d");

  if (dryRun) {
    console.log("Running in DRY RUN mode - no changes will be made\n");
  }

  await cleanupUnassignedInquiries(dryRun);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
