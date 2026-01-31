import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canViewAllInquiries } from "@/lib/permissions"
import { renderToBuffer } from "@react-pdf/renderer"
import { ContainerInvoicePDF } from "@/lib/pdf/container-invoice"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    const containerInvoice = await prisma.containerInvoice.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        sharedInvoice: {
          include: {
            vehicles: {
              include: {
                vehicle: true,
              },
            },
          },
        },
        vehicles: {
          include: {
            vehicle: true,
          },
        },
      },
    })

    if (!containerInvoice) {
      return NextResponse.json(
        { error: "Container invoice not found" },
        { status: 404 }
      )
    }

    // Check permissions
    const canViewAll = canViewAllInquiries(user.role)
    if (!canViewAll) {
      const hasAccess = await prisma.invoice.findFirst({
        where: {
          customerId: containerInvoice.customerId,
          createdById: user.id,
        },
      })
      if (!hasAccess) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Fetch company info
    const companyInfo = await prisma.companyInfo.findFirst()
    if (!companyInfo) {
      return NextResponse.json(
        { error: "Company information not found" },
        { status: 404 }
      )
    }

    // Convert logo data URL to Buffer for react-pdf (react-pdf doesn't support data URIs)
    let processedCompanyInfo = { ...companyInfo }
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

    // Generate PDF
    const pdfDoc = ContainerInvoicePDF({
      containerInvoice,
      companyInfo: processedCompanyInfo,
    })

    const pdfBuffer = await renderToBuffer(pdfDoc)

    const download = request.nextUrl.searchParams.get("download") === "true"

    return new NextResponse(pdfBuffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": download
          ? `attachment; filename="container-invoice-${containerInvoice.invoiceNumber}.pdf"`
          : `inline; filename="container-invoice-${containerInvoice.invoiceNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating container invoice PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
