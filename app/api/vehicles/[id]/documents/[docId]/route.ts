import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { ShippingStage, DocumentCategory } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { stage, category, name, fileUrl, fileType, fileSize, description, visibleToCustomer, paperlessDocumentId } = body

    const updateData: any = {
      stage: stage ? (stage as ShippingStage) : null,
      category: category as DocumentCategory,
      name,
      fileUrl,
      fileType: fileType || null,
      fileSize: fileSize || null,
      description: description || null,
      visibleToCustomer: visibleToCustomer || false,
    }
    if (paperlessDocumentId !== undefined) {
      updateData.paperlessDocumentId = paperlessDocumentId || null
    }

    const document = await prisma.vehicleDocument.update({
      where: { id: params.docId },
      data: updateData,
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; docId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.vehicleDocument.delete({
      where: { id: params.docId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    )
  }
}
