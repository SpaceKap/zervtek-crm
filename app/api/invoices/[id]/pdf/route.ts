import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canViewAllInquiries } from "@/lib/permissions"
import { renderToBuffer } from "@react-pdf/renderer"
import { CustomerInvoicePDF } from "@/lib/pdf/customer-invoice"
import { InvoiceStatus } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const download = searchParams.get("download") === "true";
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
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

    // Check permissions - sales/managers can view invoices they created, admins can view all
    const canViewAll = canViewAllInquiries(user.role)
    if (!canViewAll && invoice.createdById !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Require approval before PDF can be downloaded (sales/managers need approval, admins can download any)
    if (user.role !== "ADMIN" && invoice.status !== InvoiceStatus.APPROVED && invoice.status !== InvoiceStatus.FINALIZED) {
      return NextResponse.json(
        { error: "Invoice must be approved before PDF can be downloaded" },
        { status: 403 }
      )
    }

    // Get company info
    const companyInfo = await prisma.companyInfo.findFirst()
    if (!companyInfo) {
      return NextResponse.json(
        { error: "Company information not found" },
        { status: 404 }
      )
    }

    // react-pdf Image in Node accepts Buffer + format (logo from Company Info in settings).
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
          processedCompanyInfo.logoFormat = ext === "jpeg" || ext === "jpg" ? "jpg" : "png"
        }
      } else if (companyInfo.logo.startsWith("http")) {
        processedCompanyInfo.logo = companyInfo.logo
      } else {
        processedCompanyInfo.logo = Buffer.from(companyInfo.logo, "base64")
        processedCompanyInfo.logoFormat = "png"
      }
    }

    // Generate PDF
    const pdfDoc = CustomerInvoicePDF({
      invoice,
      companyInfo: processedCompanyInfo,
    })

    const buffer = await renderToBuffer(pdfDoc)

    // Only allow download for approved/finalized invoices (or admins can download any)
    const canDownload =
      user.role === "ADMIN" ||
      invoice.status === InvoiceStatus.APPROVED ||
      invoice.status === InvoiceStatus.FINALIZED;

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          download && canDownload
            ? `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`
            : `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
