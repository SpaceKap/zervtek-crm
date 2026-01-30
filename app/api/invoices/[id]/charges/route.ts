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

    const charges = await prisma.invoiceCharge.findMany({
      where: { invoiceId: params.id },
      include: {
        chargeType: true,
      },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(charges)
  } catch (error) {
    console.error("Error fetching charges:", error)
    return NextResponse.json(
      { error: "Failed to fetch charges" },
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

    if (!canEditInvoice(invoice.status, user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { chargeTypeId, description, amount } = body

    if (!description || amount === undefined) {
      return NextResponse.json(
        { error: "Description and amount are required" },
        { status: 400 }
      )
    }

    const charge = await prisma.invoiceCharge.create({
      data: {
        invoiceId: params.id,
        chargeTypeId: chargeTypeId || null,
        description,
        amount: parseFloat(amount),
      },
      include: {
        chargeType: true,
      },
    })

    return NextResponse.json(charge, { status: 201 })
  } catch (error) {
    console.error("Error creating charge:", error)
    return NextResponse.json(
      { error: "Failed to create charge" },
      { status: 500 }
    )
  }
}
