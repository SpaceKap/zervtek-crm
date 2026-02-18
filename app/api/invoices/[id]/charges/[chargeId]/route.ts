import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canEditInvoice } from "@/lib/permissions"
import { recalcInvoicePaymentStatus } from "@/lib/invoice-utils"

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: { id: string; chargeId: string } }
) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    if (!canEditInvoice(invoice.status, user.role, invoice.isLocked)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { chargeTypeId, description, amount } = body

    const charge = await prisma.invoiceCharge.update({
      where: { id: params.chargeId },
      data: {
        ...(chargeTypeId !== undefined && {
          chargeTypeId: chargeTypeId || null,
        }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
      },
      include: {
        chargeType: true,
      },
    })

    await recalcInvoicePaymentStatus(params.id)

    return NextResponse.json(charge)
  } catch (error) {
    console.error("Error updating charge:", error)
    return NextResponse.json(
      { error: "Failed to update charge" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: { id: string; chargeId: string } }
) {
  try {
    const user = await requireAuth()

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    if (!canEditInvoice(invoice.status, user.role, invoice.isLocked)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const charge = await prisma.invoiceCharge.findUnique({
      where: { id: params.chargeId },
    })

    if (!charge) {
      return NextResponse.json(
        { error: "Charge not found" },
        { status: 404 }
      )
    }

    await prisma.invoiceCharge.delete({
      where: { id: params.chargeId },
    })

    await recalcInvoicePaymentStatus(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting charge:", error)
    return NextResponse.json(
      { error: "Failed to delete charge" },
      { status: 500 }
    )
  }
}
