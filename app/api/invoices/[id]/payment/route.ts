import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PaymentStatus, UserRole } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update payment status (or via webhook with secret)
    const body = await request.json()
    const { paymentStatus, paidAt, webhookSecret } = body

    // Check webhook secret if provided (for Wise webhooks)
    if (webhookSecret) {
      const expectedSecret = process.env.WISE_WEBHOOK_SECRET
      if (!expectedSecret || webhookSecret !== expectedSecret) {
        return NextResponse.json({ error: "Invalid webhook secret" }, { status: 403 })
      }
    } else {
      // If no webhook secret, require admin role
      if (session.user.role !== UserRole.ADMIN) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
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

    // Validate payment status
    const validStatuses = Object.values(PaymentStatus)
    if (paymentStatus && !validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 }
      )
    }

    // Update payment status
    const updateData: any = {}
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus
    }
    if (paidAt) {
      updateData.paidAt = new Date(paidAt)
    } else if (paymentStatus === PaymentStatus.PAID && !invoice.paidAt) {
      updateData.paidAt = new Date()
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        vehicle: true,
      },
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Error updating payment status:", error)
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    )
  }
}
