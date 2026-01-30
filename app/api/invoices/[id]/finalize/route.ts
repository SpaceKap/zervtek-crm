import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canFinalizeInvoice } from "@/lib/permissions"
import { InvoiceStatus } from "@prisma/client"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canFinalizeInvoice(session.user.role)) {
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

    if (invoice.status !== InvoiceStatus.APPROVED) {
      return NextResponse.json(
        { error: "Invoice must be approved before finalization" },
        { status: 400 }
      )
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        status: InvoiceStatus.FINALIZED,
        finalizedById: session.user.id,
        finalizedAt: new Date(),
        isLocked: true,
      },
      include: {
        customer: true,
        vehicle: true,
        charges: true,
      },
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Error finalizing invoice:", error)
    return NextResponse.json(
      { error: "Failed to finalize invoice" },
      { status: 500 }
    )
  }
}
