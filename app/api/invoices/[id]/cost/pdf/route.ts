import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canViewAllInquiries } from "@/lib/permissions"
import { renderToBuffer } from "@react-pdf/renderer"
import { CostInvoicePDF } from "@/lib/pdf/cost-invoice"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
      include: {
        vehicle: {
          include: {
            sharedInvoiceVehicles: {
              include: {
                sharedInvoice: true,
              },
            },
          },
        },
        costInvoice: {
          include: {
            costItems: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    if (!invoice.costInvoice) {
      return NextResponse.json(
        { error: "Cost invoice not found" },
        { status: 404 }
      )
    }

    // Check permissions
    const canViewAll = canViewAllInquiries(user.role)
    if (!canViewAll && invoice.createdById !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get company info
    const companyInfo = await prisma.companyInfo.findFirst()
    if (!companyInfo) {
      return NextResponse.json(
        { error: "Company information not found" },
        { status: 404 }
      )
    }

    // Convert logo data URL to Buffer for react-pdf (react-pdf doesn't support data URIs)
    let processedCompanyInfo: typeof companyInfo & { logo?: string | Buffer } = { ...companyInfo }
    if (companyInfo.logo) {
      if (companyInfo.logo.startsWith("data:")) {
        // Extract base64 from data URL
        const base64Match = companyInfo.logo.match(/^data:image\/(\w+);base64,(.+)$/)
        if (base64Match) {
          const base64Data = base64Match[2]
          processedCompanyInfo.logo = Buffer.from(base64Data, "base64")
        }
      } else if (companyInfo.logo.startsWith("http")) {
        // Keep URLs as-is (react-pdf can fetch them)
        processedCompanyInfo.logo = companyInfo.logo
      } else {
        // Assume it's raw base64, convert to Buffer
        processedCompanyInfo.logo = Buffer.from(companyInfo.logo, "base64")
      }
    }

    const costInvoice = invoice.costInvoice; // Type narrowing

    // Get shared invoice costs (forwarder costs) for this vehicle
    const sharedInvoiceCosts = (invoice.vehicle.sharedInvoiceVehicles || [])
      .filter((siv) => siv.sharedInvoice?.type === "FORWARDER")
      .map((siv) => ({
        id: `shared-${siv.id}`,
        description: `Forwarder Fee (${siv.sharedInvoice?.invoiceNumber || "N/A"})`,
        amount: parseFloat(siv.allocatedAmount.toString()),
        vendorId: null,
        vendor: null,
        paymentDate: siv.sharedInvoice?.date || null,
        category: "Forwarding",
        createdAt: siv.createdAt,
        updatedAt: siv.createdAt,
        costInvoiceId: costInvoice.id,
      }))

    // Combine regular cost items with shared invoice costs
    const allCostItems = [
      ...costInvoice.costItems.map((item) => ({
        ...item,
        amount: parseFloat(item.amount.toString()),
      })),
      ...sharedInvoiceCosts,
    ]

    // Recalculate totals including shared invoice costs
    const totalCost = allCostItems.reduce(
      (sum, item) => sum + item.amount,
      0
    )

    const totalRevenue = parseFloat(costInvoice.totalRevenue.toString())
    const profit = totalRevenue - totalCost
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0

    // Generate PDF
    const pdfDoc = CostInvoicePDF({
      invoice,
      costInvoice: {
        ...costInvoice,
        costItems: allCostItems,
        totalCost,
        profit,
        margin,
        roi,
      },
      companyInfo: processedCompanyInfo,
    })

    const buffer = await renderToBuffer(pdfDoc)

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cost-invoice-${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating cost invoice PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
