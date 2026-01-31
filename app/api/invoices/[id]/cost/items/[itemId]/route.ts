import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canEditInvoice } from "@/lib/permissions"

async function recalculateCostInvoice(costInvoiceId: string) {
  const costItems = await prisma.costItem.findMany({
    where: { costInvoiceId },
  })

  const totalCost = costItems.reduce(
    (sum, item) => sum + parseFloat(item.amount.toString()),
    0
  )

  const costInvoice = await prisma.costInvoice.findUnique({
    where: { id: costInvoiceId },
  })

  if (!costInvoice) return

  const totalRevenue = parseFloat(costInvoice.totalRevenue.toString())
  const profit = totalRevenue - totalCost
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
  const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0

  await prisma.costInvoice.update({
    where: { id: costInvoiceId },
    data: {
      totalCost,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      roi: Math.round(roi * 100) / 100,
    },
  })
}

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: { id: string; itemId: string } }
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
    const { description, amount, vendorId, paymentDate, paymentDeadline, category } = body

    const costItem = await prisma.costItem.findUnique({
      where: { id: params.itemId },
      include: {
        costInvoice: true,
      },
    })

    if (!costItem) {
      return NextResponse.json(
        { error: "Cost item not found" },
        { status: 404 }
      )
    }

    // Validate required fields
    const finalVendorId = vendorId !== undefined ? vendorId : costItem.vendorId
    const finalPaymentDate = paymentDate !== undefined ? (paymentDate ? new Date(paymentDate) : null) : costItem.paymentDate
    const finalPaymentDeadline = paymentDeadline !== undefined ? new Date(paymentDeadline) : costItem.paymentDeadline

    if (!finalVendorId) {
      return NextResponse.json(
        { error: "Vendor is required" },
        { status: 400 }
      )
    }

    if (!finalPaymentDeadline) {
      return NextResponse.json(
        { error: "Payment deadline is required" },
        { status: 400 }
      )
    }

    const updatedItem = await prisma.costItem.update({
      where: { id: params.itemId },
      data: {
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        vendorId: finalVendorId,
        paymentDate: finalPaymentDate,
        paymentDeadline: finalPaymentDeadline instanceof Date ? finalPaymentDeadline : new Date(finalPaymentDeadline),
        ...(category !== undefined && { category: category || null }),
      },
      include: {
        vendor: true,
      },
    })

    // Recalculate cost invoice totals
    await recalculateCostInvoice(costItem.costInvoiceId)

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error("Error updating cost item:", error)
    return NextResponse.json(
      { error: "Failed to update cost item" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: { id: string; itemId: string } }
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

    const costItem = await prisma.costItem.findUnique({
      where: { id: params.itemId },
    })

    if (!costItem) {
      return NextResponse.json(
        { error: "Cost item not found" },
        { status: 404 }
      )
    }

    const costInvoiceId = costItem.costInvoiceId

    await prisma.costItem.delete({
      where: { id: params.itemId },
    })

    // Recalculate cost invoice totals
    await recalculateCostInvoice(costInvoiceId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting cost item:", error)
    return NextResponse.json(
      { error: "Failed to delete cost item" },
      { status: 500 }
    )
  }
}
