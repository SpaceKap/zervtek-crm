import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { InvoiceStatus, UserRole } from "@prisma/client"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only sales staff and managers can submit for approval (not admins directly)
    if (
      session.user.role !== UserRole.SALES &&
      session.user.role !== UserRole.MANAGER
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // Check if invoice is in DRAFT status
    if (invoice.status !== InvoiceStatus.DRAFT) {
      return NextResponse.json(
        { error: "Invoice must be in DRAFT status to submit for approval" },
        { status: 400 }
      )
    }

    // Check if user has permission to submit this invoice
    // Sales can only submit their own invoices, managers can submit any
    if (
      session.user.role === UserRole.SALES &&
      invoice.createdById !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You can only submit your own invoices for approval" },
        { status: 403 }
      )
    }

    // Update invoice status to PENDING_APPROVAL
    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: InvoiceStatus.PENDING_APPROVAL,
      },
      include: {
        customer: true,
        vehicle: true,
        charges: true,
      },
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Error submitting invoice for approval:", error)
    return NextResponse.json(
      { error: "Failed to submit invoice for approval" },
      { status: 500 }
    )
  }
}
