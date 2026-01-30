import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/permissions"
import { InvoiceStatus } from "@prisma/client"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()

    const invoice = await prisma.invoice.findUnique({
      where: { id: params.id },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    if (!invoice.isLocked) {
      return NextResponse.json(
        { error: "Invoice is not locked" },
        { status: 400 }
      )
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: {
        isLocked: false,
        // Change status back to APPROVED when unlocked
        status: InvoiceStatus.APPROVED,
      },
      include: {
        customer: true,
        vehicle: true,
        charges: true,
      },
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Error unlocking invoice:", error)
    return NextResponse.json(
      { error: "Failed to unlock invoice" },
      { status: 500 }
    )
  }
}
