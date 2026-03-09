import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { convertDecimalsToNumbers } from "@/lib/decimal"
import { RecurringCostFrequency, RecurringCostType } from "@prisma/client"

const toDateStr = (d: Date | null | undefined) =>
  d ? (d instanceof Date ? d.toISOString() : String(d)) : null

function formatTemplate(t: {
  id: string
  name: string
  amount: unknown
  currency: string
  frequency: string
  type: string
  vendorId: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  vendor?: { id: string; name: string; email: string | null } | null
  instances?: Array<{
    id: string
    templateId: string
    dueDate: Date
    amountOverride: unknown
    paidAt: Date | null
    invoiceUrl: string | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
  }>
}) {
  return {
    ...t,
    instances: (t.instances || []).map((i) => ({
      id: i.id,
      templateId: i.templateId,
      dueDate: toDateStr(i.dueDate),
      amountOverride: i.amountOverride,
      paidAt: toDateStr(i.paidAt),
      invoiceUrl: i.invoiceUrl,
      notes: i.notes,
      createdAt: toDateStr(i.createdAt),
      updatedAt: toDateStr(i.updatedAt),
    })),
  }
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const params = await props.params

    const template = await prisma.recurringCostTemplate.findUnique({
      where: { id: params.id },
      include: {
        vendor: { select: { id: true, name: true, email: true } },
        instances: { orderBy: { dueDate: "asc" } },
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Recurring cost template not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      convertDecimalsToNumbers(formatTemplate(template))
    )
  } catch (error) {
    console.error("Error fetching recurring cost template:", error)
    return NextResponse.json(
      { error: "Failed to fetch recurring cost template" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const params = await props.params

    const body = await request.json().catch(() => ({}))
    const { name, amount, currency, frequency, type, firstPaymentDeadline, vendorId, notes } = body

    const existing = await prisma.recurringCostTemplate.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring cost template not found" },
        { status: 404 }
      )
    }

    const updateData: {
      name?: string
      amount?: number
      currency?: string
      frequency?: RecurringCostFrequency
      type?: RecurringCostType
      firstPaymentDeadline?: Date | null
      vendorId?: string | null
      notes?: string | null
    } = {}
    if (name !== undefined) updateData.name = String(name).trim()
    if (amount !== undefined) {
      const n = parseFloat(String(amount))
      if (isNaN(n) || n < 0) {
        return NextResponse.json(
          { error: "Amount must be a non-negative number" },
          { status: 400 }
        )
      }
      updateData.amount = n
    }
    if (currency !== undefined) updateData.currency = String(currency)
    if (frequency !== undefined) {
      if (!["MONTHLY", "QUARTERLY", "SEMI_YEARLY", "YEARLY"].includes(frequency)) {
        return NextResponse.json(
          { error: "Invalid frequency" },
          { status: 400 }
        )
      }
      updateData.frequency = frequency as RecurringCostFrequency
    }
    if (firstPaymentDeadline !== undefined)
      updateData.firstPaymentDeadline = firstPaymentDeadline ? new Date(firstPaymentDeadline) : null
    if (type !== undefined)
      updateData.type =
        type === "FIXED" ? ("FIXED" as RecurringCostType) : ("RECURRING" as RecurringCostType)
    if (vendorId !== undefined) updateData.vendorId = vendorId || null
    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null

    const updated = await prisma.recurringCostTemplate.update({
      where: { id: params.id },
      data: updateData,
      include: {
        vendor: { select: { id: true, name: true, email: true } },
        instances: { orderBy: { dueDate: "asc" } },
      },
    })

    return NextResponse.json(
      convertDecimalsToNumbers(formatTemplate(updated))
    )
  } catch (error) {
    console.error("Error updating recurring cost template:", error)
    return NextResponse.json(
      { error: "Failed to update recurring cost template" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const params = await props.params

    const existing = await prisma.recurringCostTemplate.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring cost template not found" },
        { status: 404 }
      )
    }

    await prisma.recurringCostTemplate.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting recurring cost template:", error)
    return NextResponse.json(
      { error: "Failed to delete recurring cost template" },
      { status: 500 }
    )
  }
}
