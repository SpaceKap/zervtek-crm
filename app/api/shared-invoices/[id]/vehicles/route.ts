import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canViewAllInquiries } from "@/lib/permissions"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth()

    const vehicles = await prisma.sharedInvoiceVehicle.findMany({
      where: { sharedInvoiceId: params.id },
      include: {
        vehicle: {
          select: {
            id: true,
            vin: true,
            make: true,
            model: true,
            year: true,
          },
        },
      },
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error("Error fetching shared invoice vehicles:", error)
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    if (!canViewAllInquiries(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { vehicleIds } = body

    if (!vehicleIds || vehicleIds.length === 0) {
      return NextResponse.json(
        { error: "At least one vehicle is required" },
        { status: 400 }
      )
    }

    const sharedInvoice = await prisma.sharedInvoice.findUnique({
      where: { id: params.id },
      include: {
        vehicles: true,
      },
    })

    if (!sharedInvoice) {
      return NextResponse.json(
        { error: "Shared invoice not found" },
        { status: 404 }
      )
    }

    // Recalculate allocated amount
    const totalVehicles = sharedInvoice.vehicles.length + vehicleIds.length
    const allocatedAmount = parseFloat(sharedInvoice.totalAmount.toString()) / totalVehicles

    // Update existing allocations
    await prisma.sharedInvoiceVehicle.updateMany({
      where: { sharedInvoiceId: params.id },
      data: {
        allocatedAmount: Math.round(allocatedAmount * 100) / 100,
      },
    })

    // Add new vehicles
    await prisma.sharedInvoiceVehicle.createMany({
      data: vehicleIds.map((vehicleId: string) => ({
        sharedInvoiceId: params.id,
        vehicleId,
        allocatedAmount: Math.round(allocatedAmount * 100) / 100,
      })),
    })

    // Reapply to cost invoices
    // This would need to be implemented similarly to the POST in shared-invoices/route.ts

    const updated = await prisma.sharedInvoice.findUnique({
      where: { id: params.id },
      include: {
        vehicles: {
          include: {
            vehicle: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error adding vehicles to shared invoice:", error)
    return NextResponse.json(
      { error: "Failed to add vehicles" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    if (!canViewAllInquiries(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get("vehicleId")

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId query parameter is required" },
        { status: 400 }
      )
    }

    await prisma.sharedInvoiceVehicle.deleteMany({
      where: {
        sharedInvoiceId: params.id,
        vehicleId,
      },
    })

    // Recalculate allocations for remaining vehicles
    const sharedInvoice = await prisma.sharedInvoice.findUnique({
      where: { id: params.id },
      include: {
        vehicles: true,
      },
    })

    if (sharedInvoice && sharedInvoice.vehicles.length > 0) {
      const allocatedAmount =
        parseFloat(sharedInvoice.totalAmount.toString()) /
        sharedInvoice.vehicles.length

      await prisma.sharedInvoiceVehicle.updateMany({
        where: { sharedInvoiceId: params.id },
        data: {
          allocatedAmount: Math.round(allocatedAmount * 100) / 100,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing vehicle from shared invoice:", error)
    return NextResponse.json(
      { error: "Failed to remove vehicle" },
      { status: 500 }
    )
  }
}
