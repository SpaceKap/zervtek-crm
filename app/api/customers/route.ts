import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canViewCustomers } from "@/lib/permissions"
import { UserRole } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!canViewCustomers(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    const searchWhere = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { country: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}

    // Role-based: Sales = own, Manager = own + sales staff + unassigned, Admin/BackOffice/Accountant = all
    let roleWhere: Record<string, unknown> = {}
    if (user.role === UserRole.SALES) {
      roleWhere = { assignedToId: user.id }
    } else if (user.role === UserRole.MANAGER) {
      const salesIds = await prisma.user.findMany({
        where: { role: UserRole.SALES },
        select: { id: true },
      })
      const allowedIds = [user.id, ...salesIds.map((u) => u.id)]
      roleWhere = {
        OR: [
          { assignedToId: { in: allowedIds } },
          { assignedToId: null },
        ],
      }
    }

    const where =
      Object.keys(searchWhere).length > 0 && Object.keys(roleWhere).length > 0
        ? { AND: [searchWhere, roleWhere] }
        : Object.keys(roleWhere).length > 0
          ? roleWhere
          : searchWhere

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            invoices: true,
            vehicles: true,
            transactions: true,
          },
        },
      },
    })

    console.log(`[Customers API] Returning ${customers.length} customers`)
    return NextResponse.json(customers)
  } catch (error: any) {
    console.error("[Customers API] Error fetching customers:", error)
    return NextResponse.json(
      { 
        error: "Failed to fetch customers",
        details: error.message || String(error),
        code: error.code || "UNKNOWN",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
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
      assignedToId,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: "Customer name is required" },
        { status: 400 }
      )
    }

    const customer = await prisma.customer.create({
      data: {
        name: String(name),
        email: email || null,
        phone: phone || null,
        country: country || null,
        billingAddress: billingAddress || null,
        shippingAddress: shippingAddress || null,
        portOfDestination: portOfDestination || null,
        assignedToId: assignedToId || null,
      } as any, // Type assertion to bypass Prisma type checking
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
