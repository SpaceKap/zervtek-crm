import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: any = {}
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const generalCosts = await prisma.generalCost.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { date: "desc" },
    })

    return NextResponse.json(generalCosts)
  } catch (error) {
    console.error("Error fetching general costs:", error)
    return NextResponse.json(
      { error: "Failed to fetch general costs" },
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
      description,
      amount,
      currency,
      date,
      vendorId,
      invoiceUrl,
      documentId,
      notes,
    } = body

    if (!description || !amount || !date) {
      return NextResponse.json(
        { error: "Description, amount, and date are required" },
        { status: 400 }
      )
    }

    const generalCost = await prisma.generalCost.create({
      data: {
        description: String(description),
        amount: parseFloat(amount.toString()),
        currency: currency || "JPY",
        date: new Date(date),
        vendorId: vendorId || null,
        invoiceUrl: invoiceUrl || null,
        documentId: documentId || null,
        notes: notes || null,
        createdById: session.user.id,
      } as any, // Type assertion to bypass Prisma type checking
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(generalCost, { status: 201 })
  } catch (error) {
    console.error("Error creating general cost:", error)
    return NextResponse.json(
      { error: "Failed to create general cost" },
      { status: 500 }
    )
  }
}
