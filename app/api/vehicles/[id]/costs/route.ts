import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { ShippingStage } from "@prisma/client"

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

    const where: any = { vehicleId: params.id }
    if (stage) {
      where.stage = stage
    }

    const costs = await prisma.vehicleStageCost.findMany({
      where,
      include: {
        vendor: true,
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(costs)
  } catch (error) {
    console.error("Error fetching costs:", error)
    return NextResponse.json(
      { error: "Failed to fetch costs" },
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

    const body = await request.json()
    const { stage, costType, amount, vendorId, currency, paymentDeadline, paymentDate } = body

    if (!stage || !costType || !amount || !vendorId) {
      return NextResponse.json(
        { error: "Stage, costType, amount, and vendorId are required" },
        { status: 400 }
      )
    }

    const cost = await prisma.vehicleStageCost.create({
      data: {
        vehicleId: params.id,
        stage,
        costType,
        amount: parseFloat(amount),
        vendorId,
        currency: currency || "JPY",
        paymentDeadline: paymentDeadline ? new Date(paymentDeadline) : null,
        paymentDate: paymentDate ? new Date(paymentDate) : null,
      },
      include: {
        vendor: true,
      },
    })

    return NextResponse.json(cost, { status: 201 })
  } catch (error) {
    console.error("Error creating cost:", error)
    return NextResponse.json(
      { error: "Failed to create cost" },
      { status: 500 }
    )
  }
}
