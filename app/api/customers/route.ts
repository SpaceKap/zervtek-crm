import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    const where: any = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}

    // All authenticated users can see all customers (universal access)
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      take: 50,
    })

    return NextResponse.json(customers)
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json()
    const {
      name,
      email,
      phone,
      country,
      billingAddress,
      shippingAddress,
      portOfDestination,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        country: country || null,
        billingAddress: billingAddress || null,
        shippingAddress: shippingAddress || null,
        portOfDestination: portOfDestination || null,
      },
    })

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    )
  }
}
