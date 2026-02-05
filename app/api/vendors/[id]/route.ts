import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { VendorCategory } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const body = await request.json()
    const { name, email, category } = body

    // Validate category if provided
    if (category !== undefined) {
      if (!Object.values(VendorCategory).includes(category)) {
        return NextResponse.json(
          { error: `Invalid category: ${category}` },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email || null
    if (category !== undefined) updateData.category = category as VendorCategory

    const vendor = await prisma.vendor.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(vendor)
  } catch (error: any) {
    console.error("Error updating vendor:", error)
    
    // Provide more detailed error messages
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Vendor with this name already exists" },
        { status: 400 }
      )
    }
    
    const errorMessage = error.message || "Failed to update vendor"
    return NextResponse.json(
      { error: errorMessage, details: error.code || "Unknown error" },
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

    await prisma.vendor.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting vendor:", error)
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    )
  }
}
