import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { CustomerInvoicePDF } from "@/lib/pdf/customer-invoice"
import { InvoiceStatus } from "@prisma/client"

/**
 * Public PDF by share token. No auth required.
 * Used by customer portal and public invoice links.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const { searchParams } = new URL(request.url)
  const download = searchParams.get("download") === "true"
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { shareToken: params.token },
      include: {
        customer: true,
        vehicle: true,
        charges: {
          include: {
            chargeType: true,
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

    if (
      invoice.status !== InvoiceStatus.APPROVED &&
      invoice.status !== InvoiceStatus.FINALIZED
    ) {
      return NextResponse.json(
        { error: "Invoice not available" },
        { status: 403 }
      )
    }

    const companyInfo = await prisma.companyInfo.findFirst()
    if (!companyInfo) {
      return NextResponse.json(
        { error: "Company information not found" },
        { status: 404 }
      )
    }

    type ProcessedCompanyInfo = Omit<typeof companyInfo, "logo"> & {
      logo?: Buffer | string | null
      logoFormat?: "png" | "jpg"
    }
    const processedCompanyInfo: ProcessedCompanyInfo = { ...companyInfo }
    if (companyInfo.logo) {
      if (companyInfo.logo.startsWith("data:")) {
        const match = companyInfo.logo.match(/^data:image\/(\w+);base64,(.+)$/)
        if (match) {
          const ext = match[1].toLowerCase()
          processedCompanyInfo.logo = Buffer.from(match[2], "base64")
          processedCompanyInfo.logoFormat =
            ext === "jpeg" || ext === "jpg" ? "jpg" : "png"
        }
      } else if (companyInfo.logo.startsWith("http")) {
        processedCompanyInfo.logo = companyInfo.logo
      } else {
        processedCompanyInfo.logo = Buffer.from(companyInfo.logo, "base64")
        processedCompanyInfo.logoFormat = "png"
      }
    }

    const pdfDoc = CustomerInvoicePDF({
      invoice,
      companyInfo: processedCompanyInfo,
    })
    const buffer = await renderToBuffer(pdfDoc)

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          download
            ? `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
            : `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating public invoice PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
