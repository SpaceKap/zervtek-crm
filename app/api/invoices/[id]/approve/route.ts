import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canApproveInvoice } from "@/lib/permissions"
import { InvoiceStatus } from "@prisma/client"
import { invalidateCache } from "@/lib/cache"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canApproveInvoice(session.user.role)) {
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

    if (invoice.status !== InvoiceStatus.PENDING_APPROVAL) {
      return NextResponse.json(
        { error: "Invoice is not pending approval" },
        { status: 400 }
      )
    }

    // Set default Wise payment link if not already set
    const defaultWiseLink = process.env.DEFAULT_WISE_PAYMENT_LINK || "https://wise.com/pay/business/ugoigd";
    
    const updateData: any = {
      status: InvoiceStatus.APPROVED,
      approvedById: session.user.id,
    };
    
    // Only set default Wise link if not already set
    if (!invoice.wisePaymentLink) {
      updateData.wisePaymentLink = defaultWiseLink;
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        vehicle: true,
        charges: true,
      },
    })

    if (updatedInvoice.shareToken) {
      await invalidateCache(`invoice:token:${updatedInvoice.shareToken}`)
    }

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Error approving invoice:", error)
    return NextResponse.json(
      { error: "Failed to approve invoice" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canApproveInvoice(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { action } = body // "reject" or "request_changes"

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    if (invoice.status !== InvoiceStatus.PENDING_APPROVAL) {
      return NextResponse.json(
        { error: "Invoice is not pending approval" },
        { status: 400 }
      )
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status:
          action === "reject"
            ? InvoiceStatus.DRAFT
            : InvoiceStatus.PENDING_APPROVAL,
      },
      include: {
        customer: true,
        vehicle: true,
        charges: true,
      },
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Error updating invoice approval:", error)
    return NextResponse.json(
      { error: "Failed to update invoice approval" },
      { status: 500 }
    )
  }
}
