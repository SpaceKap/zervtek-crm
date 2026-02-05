import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        shippingStage: {
          select: {
            totalCharges: true,
            totalReceived: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            charges: {
              select: {
                id: true,
                description: true,
                amount: true,
              },
            },
            paymentStatus: true,
          },
        },
      },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      )
    }

    // Calculate totals
    const totalCharges = vehicle.shippingStage?.totalCharges || 0
    const totalReceived = vehicle.shippingStage?.totalReceived || 0
    const balanceDue = totalCharges - totalReceived

    return NextResponse.json({
      totalCharges: totalCharges.toString(),
      totalReceived: totalReceived.toString(),
      balanceDue: balanceDue.toString(),
      invoices: vehicle.invoices,
    })
  } catch (error) {
    console.error("Error fetching vehicle payments:", error)
    return NextResponse.json(
      { error: "Failed to fetch vehicle payments" },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const { totalCharges, totalReceived } = body

    const updateData: any = {}
    if (totalCharges !== undefined) {
      updateData.totalCharges = parseFloat(totalCharges)
    }
    if (totalReceived !== undefined) {
      updateData.totalReceived = parseFloat(totalReceived)
    }

    const stage = await prisma.vehicleShippingStage.upsert({
      where: { vehicleId: params.id },
      update: updateData,
      create: {
        vehicleId: params.id,
        stage: "PAYMENT",
        ...updateData,
      },
    })

    return NextResponse.json(stage)
  } catch (error) {
    console.error("Error updating vehicle payments:", error)
    return NextResponse.json(
      { error: "Failed to update vehicle payments" },
      { status: 500 }
    )
  }
}
