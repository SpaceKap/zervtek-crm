import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { convertDecimalsToNumbers } from "@/lib/decimal"

const toDateStr = (d: Date | null | undefined) =>
  d ? (d instanceof Date ? d.toISOString() : String(d)) : null

function formatInstance(i: {
  id: string
  templateId: string
  dueDate: Date
  amountOverride: unknown
  paidAt: Date | null
  invoiceUrl: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: i.id,
    templateId: i.templateId,
    dueDate: toDateStr(i.dueDate),
    amountOverride: i.amountOverride,
    paidAt: toDateStr(i.paidAt),
    invoiceUrl: i.invoiceUrl,
    notes: i.notes,
    createdAt: toDateStr(i.createdAt),
    updatedAt: toDateStr(i.updatedAt),
  }
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const params = await props.params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status") // due | paid | all

    const template = await prisma.recurringCostTemplate.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Recurring cost template not found" },
        { status: 404 }
      )
    }

    const where: {
      templateId: string
      paidAt?: null | { not: null }
    } = {
      templateId: params.id,
    }
    if (status === "due") where.paidAt = null
    if (status === "paid") where.paidAt = { not: null }

    const instances = await prisma.recurringCostInstance.findMany({
      where,
      orderBy: { dueDate: "asc" },
    })

    return NextResponse.json(
      convertDecimalsToNumbers(instances.map(formatInstance))
    )
  } catch (error) {
    console.error("Error fetching recurring cost instances:", error)
    return NextResponse.json(
      { error: "Failed to fetch recurring cost instances" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const params = await props.params

    const body = await request.json().catch(() => ({}))
    const { dueDate, amountOverride } = body

    if (!dueDate) {
      return NextResponse.json(
        { error: "Due date is required" },
        { status: 400 }
      )
    }

    const template = await prisma.recurringCostTemplate.findUnique({
      where: { id: params.id },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Recurring cost template not found" },
        { status: 404 }
      )
    }

    const amountOverrideNum =
      amountOverride != null ? parseFloat(String(amountOverride)) : null
    if (
      amountOverrideNum !== null &&
      (isNaN(amountOverrideNum) || amountOverrideNum < 0)
    ) {
      return NextResponse.json(
        { error: "Amount override must be a non-negative number" },
        { status: 400 }
      )
    }

    const instance = await prisma.recurringCostInstance.create({
      data: {
        templateId: params.id,
        dueDate: new Date(dueDate),
        amountOverride: amountOverrideNum,
      },
    })

    return NextResponse.json(
      convertDecimalsToNumbers(formatInstance(instance)),
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating recurring cost instance:", error)
    return NextResponse.json(
      { error: "Failed to create recurring cost instance" },
      { status: 500 }
    )
  }
}
