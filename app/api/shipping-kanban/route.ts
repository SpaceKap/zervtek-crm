import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ShippingStage, UserRole } from "@prisma/client"
import { canViewVehicles, canManageVehicleStages } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canViewVehicles(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get("customerId")
    const filterType = searchParams.get("filterType") // "all" or "mine"

    // Define shipping stages in order
    const shippingStages: ShippingStage[] = [
      ShippingStage.PURCHASE,
      ShippingStage.TRANSPORT,
      ShippingStage.REPAIR,
      ShippingStage.DOCUMENTS,
      ShippingStage.BOOKING,
      ShippingStage.SHIPPED,
      ShippingStage.DHL,
    ]

    // Build where clause
    const where: any = {}
    if (customerId) {
      where.customerId = customerId
    }

    // Role-based vehicle visibility (skip when filtering by customerId)
    if (!customerId) {
      const isAdmin = session.user.role === UserRole.ADMIN
      const isManager = session.user.role === UserRole.MANAGER
      const isBackOffice = session.user.role === UserRole.BACK_OFFICE_STAFF
      const isSales = session.user.role === UserRole.SALES

      if (isSales) {
        where.customer = { assignedToId: session.user.id }
      } else if (isManager) {
        if (filterType === "mine") {
          where.customer = { assignedToId: session.user.id }
        } else {
          const salesIds = await prisma.user.findMany({
            where: { role: UserRole.SALES },
            select: { id: true },
          })
          const allowedIds = [session.user.id, ...salesIds.map((u) => u.id)]
          where.OR = [
            { customerId: null },
            {
              customer: {
                OR: [
                  { assignedToId: { in: allowedIds } },
                  { assignedToId: null },
                ],
              },
            },
          ]
        }
      } else if (filterType === "mine" && (isAdmin || isBackOffice)) {
        where.customer = { assignedToId: session.user.id }
      }
    }

    // Get all vehicles
    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shippingStage: {
          include: {
            yard: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            documents: true,
            stageCosts: true,
            invoices: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Group vehicles by shipping stage
    const vehiclesByStage = vehicles.reduce((acc, vehicle) => {
      const stage = vehicle.currentShippingStage || ShippingStage.PURCHASE
      if (!acc[stage]) {
        acc[stage] = []
      }
      acc[stage].push(vehicle)
      return acc
    }, {} as Record<ShippingStage, typeof vehicles>)

    // Map stages with their vehicles
    const boardData = shippingStages.map((stage, index) => {
      let displayName = stage.charAt(0) + stage.slice(1).toLowerCase().replace(/_/g, " ");
      if (stage === ShippingStage.DHL) {
        displayName = "Completed";
      }
      return {
        id: stage,
        name: displayName,
        order: index,
        stage: stage,
        vehicles: vehiclesByStage[stage] || [],
      };
    })

    console.log(`[Shipping Kanban API] Returning ${boardData.length} stages with ${vehicles.length} total vehicles`)
    return NextResponse.json({
      stages: boardData,
    })
  } catch (error: any) {
    console.error("[Shipping Kanban API] Error fetching shipping kanban board:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch shipping kanban board",
        details: error.message || String(error),
        code: error.code || "UNKNOWN",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { vehicleId, newStage, dhlTracking } = body

    if (!vehicleId || !newStage) {
      return NextResponse.json(
        { error: "Missing vehicleId or newStage" },
        { status: 400 }
      )
    }

    if (!Object.values(ShippingStage).includes(newStage)) {
      return NextResponse.json(
        { error: "Invalid shipping stage" },
        { status: 400 }
      )
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { shippingStage: true },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      )
    }

    const previousStage = vehicle.currentShippingStage || vehicle.shippingStage?.stage

    // Update vehicle stage
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { currentShippingStage: newStage as ShippingStage },
    })

    // Update or create shipping stage record
    const updateData: any = { stage: newStage as ShippingStage }
    if (newStage === ShippingStage.DHL && dhlTracking) {
      updateData.dhlTracking = dhlTracking
    }

    await prisma.vehicleShippingStage.upsert({
      where: { vehicleId },
      update: updateData,
      create: {
        vehicleId,
        stage: newStage as ShippingStage,
        ...(newStage === ShippingStage.DHL && dhlTracking
          ? { dhlTracking }
          : {}),
      },
    })

    // Create stage history entry
    await prisma.vehicleStageHistory.create({
      data: {
        vehicleId,
        userId: session.user.id,
        previousStage: previousStage || null,
        newStage: newStage as ShippingStage,
        action: `Stage changed from ${previousStage || "N/A"} to ${newStage}`,
      },
    })

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        actorUserId: session.user.id,
        entityType: "vehicle",
        entityId: vehicleId,
        action: "stage_change",
        beforeJson: { stage: previousStage },
        afterJson: { stage: newStage },
      },
    })

    const updatedVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shippingStage: {
          include: {
            yard: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            documents: true,
            stageCosts: true,
            invoices: true,
          },
        },
      },
    })

    return NextResponse.json(updatedVehicle)
  } catch (error) {
    console.error("Error updating shipping stage:", error)
    return NextResponse.json(
      { error: "Failed to update shipping stage" },
      { status: 500 }
    )
  }
}
