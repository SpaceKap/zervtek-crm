import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { ShippingStage, DocumentCategory } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const stage = searchParams.get("stage") as ShippingStage | null
    const category = searchParams.get("category") as DocumentCategory | null

    const where: any = { vehicleId: params.id }
    if (stage) {
      where.stage = stage
    }
    if (category) {
      where.category = category
    }

    const documents = await prisma.vehicleDocument.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let body: any
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    const {
      stage,
      category,
      name,
      fileUrl,
      fileType,
      fileSize,
      description,
      visibleToCustomer,
    } = body

    if (!name || !fileUrl || !category) {
      return NextResponse.json(
        { error: "Name, fileUrl, and category are required" },
        { status: 400 }
      )
    }

    const document = await prisma.vehicleDocument.create({
      data: {
        vehicleId: params.id,
        stage: stage || null,
        category,
        name,
        fileUrl,
        fileType: fileType || null,
        fileSize: fileSize || null,
        description: description || null,
        visibleToCustomer: visibleToCustomer || false,
        uploadedById: session.user.id,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error("Error creating document:", error)
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    )
  }
}
