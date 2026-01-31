import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canEditInvoice } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const costInvoice = await prisma.costInvoice.findUnique({
      where: { invoiceId: params.id },
    })

    if (!costInvoice) {
      return NextResponse.json(
        { error: "Cost invoice not found" },
        { status: 404 }
      )
    }

    const costItems = await prisma.costItem.findMany({
      where: { costInvoiceId: costInvoice.id },
      include: {
        vendor: true,
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(costItems)
  } catch (error) {
    console.error("Error fetching cost items:", error)
    return NextResponse.json(
      { error: "Failed to fetch cost items" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Get or create cost invoice
    let costInvoice = await prisma.costInvoice.findUnique({
      where: { invoiceId: params.id },
    })

    if (!costInvoice) {
      costInvoice = await prisma.costInvoice.create({
        data: {
          invoiceId: params.id,
          totalRevenue: 0,
          totalCost: 0,
          profit: 0,
          margin: 0,
          roi: 0,
        },
      })
    }

    const body = await request.json()
    const { description, amount, vendorId, paymentDate, paymentDeadline, category } = body

    if (!description || amount === undefined) {
      return NextResponse.json(
        { error: "Description and amount are required" },
        { status: 400 }
      )
    }

    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor is required" },
        { status: 400 }
      )
    }

    if (!paymentDeadline) {
      return NextResponse.json(
        { error: "Payment deadline is required" },
        { status: 400 }
      )
    }

    const costItem = await prisma.costItem.create({
      data: {
        costInvoiceId: costInvoice.id,
        description,
        amount: parseFloat(amount),
        vendorId: vendorId,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
        paymentDeadline: new Date(paymentDeadline),
        category: category || null,
      },
      include: {
        vendor: true,
      },
    })

    // Recalculate cost invoice totals
    await recalculateCostInvoice(costInvoice.id)

    return NextResponse.json(costItem, { status: 201 })
  } catch (error) {
    console.error("Error creating cost item:", error)
    return NextResponse.json(
      { error: "Failed to create cost item" },
      { status: 500 }
    )
  }
}

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
