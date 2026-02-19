import { prisma } from "../lib/prisma"
import { recalcInvoicePaymentStatus } from "../lib/invoice-utils"

/**
 * Recalculate payment status for all invoices.
 * Use after fixing deposit/discount subtraction so existing invoices
 * show correct PAID/PARTIALLY_PAID based on the corrected total.
 *
 * Run: npx tsx scripts/recalc-invoice-payment-status.ts
 */

async function main() {
  const invoices = await prisma.invoice.findMany({
    select: { id: true, invoiceNumber: true },
  })
  console.log(`Recalculating payment status for ${invoices.length} invoices...`)
  for (const inv of invoices) {
    await recalcInvoicePaymentStatus(inv.id)
    console.log(`  ${inv.invoiceNumber ?? inv.id}`)
  }
  console.log("Done.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
