import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth, canViewCustomers } from "@/lib/permissions"
import { UserRole } from "@prisma/client"
import { getCached, invalidateCachePattern, cacheKeyFromSearchParams } from "@/lib/cache"

const CUSTOMERS_LIST_TTL = 90

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    if (!canViewCustomers(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const cacheKey = `customers:list:${user.id}:${cacheKeyFromSearchParams(searchParams)}`
    const customers = await getCached(
      cacheKey,
      async () => {
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

        return prisma.customer.findMany({
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
      },
      CUSTOMERS_LIST_TTL
    )

    console.log(`[Customers API] Returning ${customers.length} customers`)
    return NextResponse.json(customers)
  } catch (error: unknown) {
    console.error("[Customers API] Error fetching customers:", error)
    const err = error as { message?: string; code?: string; stack?: string }
    return NextResponse.json(
      {
        error: "Failed to fetch customers",
        details: err?.message || String(error),
        code: err?.code || "UNKNOWN",
        stack: process.env.NODE_ENV === "development" ? err?.stack : undefined,
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

    await invalidateCachePattern("customers:list:")

    return NextResponse.json(customer, { status: 201 })
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    )
  }
}
