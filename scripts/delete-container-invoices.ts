import { prisma } from "../lib/prisma";

async function deleteAllContainerInvoices() {
  try {
    console.log("Fetching all container invoices...");
    
    // Get all container invoices
    const containerInvoices = await prisma.containerInvoice.findMany({
      include: {
        sharedInvoice: {
          select: {
            invoiceNumber: true,
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`Found ${containerInvoices.length} container invoices:`);
    containerInvoices.forEach((ci, index) => {
      console.log(
        `${index + 1}. ${ci.invoiceNumber} - Customer: ${ci.customer.name} - Shared Invoice: ${ci.sharedInvoice.invoiceNumber}`
      );
    });

    if (containerInvoices.length === 0) {
      console.log("No container invoices to delete.");
      return;
    }

    console.log("\nDeleting container invoices...");

    // Delete all container invoices
    for (const containerInvoice of containerInvoices) {
      try {
        await prisma.containerInvoice.delete({
          where: { id: containerInvoice.id },
        });
        console.log(`✓ Deleted ${containerInvoice.invoiceNumber}`);
      } catch (error: any) {
        console.error(
          `✗ Failed to delete ${containerInvoice.invoiceNumber}:`,
          error.message
        );
      }
    }

    console.log("\nDone! All container invoices have been deleted.");
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteAllContainerInvoices();
