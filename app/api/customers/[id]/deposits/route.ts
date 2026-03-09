import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * GET: List deposit transactions for this customer that are not yet applied to any invoice charge.
 * Used when adding a DEPOSIT charge to an invoice so staff can select which deposit to apply.
 * Optional ?invoiceId=... : when editing an invoice, deposits applied on that invoice are still
 * included so the selected deposit can be shown and changed.
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customerId = params.id
    const { searchParams } = new URL(request.url)
    const currentInvoiceId = searchParams.get("invoiceId") ?? null

    const appliedCharges = await prisma.invoiceCharge.findMany({
      where: { appliedDepositTransactionId: { not: null } },
      select: {
        appliedDepositTransactionId: true,
        invoiceId: true,
      },
    })
    const appliedSet = new Set(
      appliedCharges
        .filter(
          (c) =>
            c.appliedDepositTransactionId != null &&
            (currentInvoiceId == null || c.invoiceId !== currentInvoiceId)
        )
        .map((c) => c.appliedDepositTransactionId as string)
    )

    const deposits = await prisma.transaction.findMany({
      where: {
        customerId,
        direction: "DEPOSIT",
        id: { notIn: [...appliedSet] },
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        date: true,
        description: true,
        type: true,
        depositNumber: true,
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(
      deposits.map((d) => ({
        id: d.id,
        amount: parseFloat(d.amount.toString()),
        currency: d.currency,
        date: d.date instanceof Date ? d.date.toISOString() : d.date,
        description: d.description,
        type: d.type,
        depositNumber: d.depositNumber ?? null,
      }))
    )
  } catch (error) {
    console.error("Error fetching customer deposits:", error)
    return NextResponse.json(
      { error: "Failed to fetch deposits" },
      { status: 500 }
    )
  }
}
