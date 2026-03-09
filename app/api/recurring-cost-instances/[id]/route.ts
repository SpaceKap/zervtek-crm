import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { convertDecimalsToNumbers } from "@/lib/decimal"

const toDateStr = (d: Date | null | undefined) =>
  d ? (d instanceof Date ? d.toISOString() : String(d)) : null

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const params = await props.params

    const body = await request.json().catch(() => ({}))
    const { paidAt, invoiceUrl, notes, amountOverride } = body

    const existing = await prisma.recurringCostInstance.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring cost instance not found" },
        { status: 404 }
      )
    }

    const updateData: {
      paidAt?: Date | null
      invoiceUrl?: string | null
      notes?: string | null
      amountOverride?: number | null
    } = {}
    if (paidAt !== undefined)
      updateData.paidAt = paidAt ? new Date(paidAt) : null
    if (invoiceUrl !== undefined) updateData.invoiceUrl = invoiceUrl || null
    if (notes !== undefined) updateData.notes = notes ? String(notes).trim() : null
    if (amountOverride !== undefined) {
      const n = amountOverride == null ? null : parseFloat(String(amountOverride))
      if (n !== null && (isNaN(n) || n < 0)) {
        return NextResponse.json(
          { error: "Amount override must be a non-negative number" },
          { status: 400 }
        )
      }
      updateData.amountOverride = n
    }

    const updated = await prisma.recurringCostInstance.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(
      convertDecimalsToNumbers({
        id: updated.id,
        templateId: updated.templateId,
        dueDate: toDateStr(updated.dueDate),
        amountOverride: updated.amountOverride,
        paidAt: toDateStr(updated.paidAt),
        invoiceUrl: updated.invoiceUrl,
        notes: updated.notes,
        createdAt: toDateStr(updated.createdAt),
        updatedAt: toDateStr(updated.updatedAt),
      })
    )
  } catch (error) {
    console.error("Error updating recurring cost instance:", error)
    return NextResponse.json(
      { error: "Failed to update recurring cost instance" },
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

    const existing = await prisma.recurringCostInstance.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring cost instance not found" },
        { status: 404 }
      )
    }

    await prisma.recurringCostInstance.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting recurring cost instance:", error)
    return NextResponse.json(
      { error: "Failed to delete recurring cost instance" },
      { status: 500 }
    )
  }
}
