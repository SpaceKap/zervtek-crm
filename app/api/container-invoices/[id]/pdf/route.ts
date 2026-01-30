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

    // Generate PDF
    const pdfDoc = ContainerInvoicePDF({
      containerInvoice,
      companyInfo,
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
