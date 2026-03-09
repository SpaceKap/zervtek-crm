import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { convertDecimalsToNumbers } from "@/lib/decimal"

const toDateStr = (d: Date | null | undefined) =>
  d ? (d instanceof Date ? d.toISOString() : String(d)) : null

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = request.nextUrl
    const withinDays = Math.min(31, Math.max(1, parseInt(searchParams.get("withinDays") || "7", 10)))

    const now = new Date()
    const end = new Date(now)
    end.setDate(end.getDate() + withinDays)

    const instances = await prisma.recurringCostInstance.findMany({
      where: {
        paidAt: null,
        dueDate: { lte: end },
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
            amount: true,
            currency: true,
            type: true,
            vendorId: true,
            vendor: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    })

    const formatted = instances.map((i) => ({
      id: i.id,
      templateId: i.templateId,
      dueDate: toDateStr(i.dueDate),
      amountOverride: i.amountOverride,
      paidAt: toDateStr(i.paidAt),
      invoiceUrl: i.invoiceUrl,
      notes: i.notes,
      template: {
        ...i.template,
        amount: i.template.amount,
      },
    }))

    return NextResponse.json(convertDecimalsToNumbers(formatted))
  } catch (error) {
    console.error("Error fetching due recurring instances:", error)
    return NextResponse.json(
      { error: "Failed to fetch due recurring instances" },
      { status: 500 }
    )
  }
}
