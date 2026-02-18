import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const body = await request.json()
    const {
      description,
      amount,
      currency,
      date,
      vendorId,
      invoiceUrl,
      documentId,
      notes,
    } = body

    const existingCost = await prisma.generalCost.findUnique({
      where: { id: params.id },
    })

    if (!existingCost) {
      return NextResponse.json(
        { error: "General cost not found" },
        { status: 404 }
      )
    }

    const updateData: any = {}
    if (description !== undefined) updateData.description = description
    if (amount !== undefined) updateData.amount = parseFloat(amount.toString())
    if (currency !== undefined) updateData.currency = currency
    if (date !== undefined) updateData.date = new Date(date)
    if (vendorId !== undefined) updateData.vendorId = vendorId || null
    if (invoiceUrl !== undefined) updateData.invoiceUrl = invoiceUrl || null
    if (documentId !== undefined) updateData.documentId = documentId || null
    if (notes !== undefined) updateData.notes = notes || null

    const generalCost = await prisma.generalCost.update({
      where: { id: params.id },
      data: updateData,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(generalCost)
  } catch (error) {
    console.error("Error updating general cost:", error)
    return NextResponse.json(
      { error: "Failed to update general cost" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const generalCost = await prisma.generalCost.findUnique({
      where: { id: params.id },
    })

    if (!generalCost) {
      return NextResponse.json(
        { error: "General cost not found" },
        { status: 404 }
      )
    }

    await prisma.generalCost.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting general cost:", error)
    return NextResponse.json(
      { error: "Failed to delete general cost" },
      { status: 500 }
    )
  }
}
