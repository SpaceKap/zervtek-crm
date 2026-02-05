import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canViewVehicles } from "@/lib/permissions"
import { ShippingStage, PurchaseSource } from "@prisma/client"
import { convertDecimalsToNumbers } from "@/lib/decimal"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canViewVehicles(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")
    const vin = searchParams.get("vin")
    const customerId = searchParams.get("customerId")
    const stage = searchParams.get("stage") as ShippingStage | null
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = {}
    if (vin) {
      where.vin = { contains: vin, mode: "insensitive" as const }
    } else if (search) {
      where.OR = [
        { vin: { contains: search, mode: "insensitive" as const } },
        { make: { contains: search, mode: "insensitive" as const } },
        { model: { contains: search, mode: "insensitive" as const } },
      ]
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (stage) {
      where.currentShippingStage = stage
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

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
          select: {
            stage: true,
            etd: true,
            eta: true,
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
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return NextResponse.json(convertDecimalsToNumbers(vehicles))
  } catch (error: any) {
    console.error("Error fetching vehicles:", error)
    // Return more detailed error for debugging
    return NextResponse.json(
      { 
        error: "Failed to fetch vehicles",
        details: error.message || String(error),
        code: error.code || "UNKNOWN"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      vin,
      stockNo,
      chassisNo,
      make,
      model,
      year,
      price,
      purchaseSource,
      auctionHouseId,
      lotNo,
      auctionSheetUrl,
      purchaseVendorId,
      purchasePhotoUrl,
      purchaseDate,
      inquiryId,
      customerId,
      isRegistered,
    } = body

    if (!vin) {
      return NextResponse.json(
        { error: "VIN is required" },
        { status: 400 }
      )
    }

    // Auto-generate stockNo if not provided
    let finalStockNo = stockNo
    if (!finalStockNo) {
      // Generate stock number: VEH-YYYYMMDD-HHMMSS-XXXX (last 4 chars of VIN)
      const now = new Date()
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "")
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "")
      const vinSuffix = vin.slice(-4).toUpperCase()
      finalStockNo = `VEH-${dateStr}-${timeStr}-${vinSuffix}`
    }

    // Set chassisNo to VIN if not provided (they're the same)
    const finalChassisNo = chassisNo || vin

    // Create vehicle with initial shipping stage
    const vehicle = await prisma.vehicle.create({
      data: {
        vin,
        stockNo: finalStockNo,
        chassisNo: finalChassisNo,
        make: make || null,
        model: model || null,
        year: year ? parseInt(year) : null,
        price: price ? parseFloat(price.toString()) : null,
        purchaseSource: purchaseSource || null,
        auctionHouseId: purchaseSource === "AUCTION" ? (auctionHouseId || null) : null,
        lotNo: purchaseSource === "AUCTION" ? (lotNo || null) : null,
        auctionSheetUrl: purchaseSource === "AUCTION" ? (auctionSheetUrl || null) : null,
        purchaseVendorId: purchaseSource === "DEALER" ? (purchaseVendorId || null) : null,
        purchasePhotoUrl: purchaseSource === "DEALER" ? (purchasePhotoUrl || null) : null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        inquiryId: inquiryId || null,
        customerId: customerId || null,
        isRegistered: isRegistered !== undefined ? isRegistered : null,
        currentShippingStage: "PURCHASE",
        createdById: session.user.id,
        shippingStage: {
          create: {
            stage: "PURCHASE",
          },
        },
      },
      include: {
        customer: true,
        shippingStage: true,
        auctionHouse: true,
        purchaseVendor: true,
      },
    })

    // Create initial stage history
    await prisma.vehicleStageHistory.create({
      data: {
        vehicleId: vehicle.id,
        userId: session.user.id,
        newStage: "PURCHASE",
        action: "Vehicle created",
      },
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Vehicle with this VIN already exists" },
        { status: 400 }
      )
    }
    console.error("Error creating vehicle:", error)
    return NextResponse.json(
      { error: "Failed to create vehicle" },
      { status: 500 }
    )
  }
}
