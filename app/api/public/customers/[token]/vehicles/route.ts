import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { shareToken: params.token },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Invalid share token" },
        { status: 404 }
      )
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { customerId: customer.id },
      select: {
        id: true,
        make: true,
        model: true,
        year: true,
        vin: true,
        stockNo: true,
        currentShippingStage: true,
        shippingStage: {
          include: {
            yard: true,
          },
        },
        documents: {
          where: {
            visibleToCustomer: true, // Only show documents visible to customer
          },
          select: {
            id: true,
            name: true,
            category: true,
            fileUrl: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        invoices: {
          where: {
            status: "FINALIZED",
          },
          select: {
            id: true,
            invoiceNumber: true,
            issueDate: true,
            dueDate: true,
            paymentStatus: true,
            charges: {
              select: {
                description: true,
                amount: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      customer,
      vehicles,
    })
  } catch (error) {
    console.error("Error fetching public customer vehicles:", error)
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    )
  }
}
