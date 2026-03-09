import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/permissions"
import { convertDecimalsToNumbers } from "@/lib/decimal"
import { RecurringCostFrequency } from "@prisma/client"

function addMonths(date: Date, months: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function daysInMonth(year: number, monthZeroBased: number): number {
  return new Date(year, monthZeroBased + 1, 0).getDate()
}

function addMonthsPreserveDay(date: Date, months: number): Date {
  const d = new Date(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + months)
  const maxDay = daysInMonth(d.getFullYear(), d.getMonth())
  d.setDate(Math.min(day, maxDay))
  return d
}

function generateDueDatesFromFirst(
  firstPaymentDeadline: Date,
  frequency: RecurringCostFrequency,
  count: number
): Date[] {
  // Use the exact date the user picked as the first due date.
  const start = new Date(firstPaymentDeadline)
  const dates: Date[] = []
  if (frequency === "MONTHLY") {
    for (let i = 0; i < count; i++) dates.push(addMonthsPreserveDay(start, i))
  } else if (frequency === "QUARTERLY") {
    for (let i = 0; i < count; i++)
      dates.push(addMonthsPreserveDay(start, i * 3))
  } else if (frequency === "SEMI_YEARLY") {
    for (let i = 0; i < count; i++)
      dates.push(addMonthsPreserveDay(start, i * 6))
  } else {
    for (let i = 0; i < count; i++) {
      const next = new Date(start)
      next.setFullYear(start.getFullYear() + i)
      // preserve day-of-month as best as possible
      const maxDay = daysInMonth(next.getFullYear(), next.getMonth())
      next.setDate(Math.min(start.getDate(), maxDay))
      dates.push(next)
    }
  }
  return dates
}

export async function GET() {
  try {
    await requireAuth()

    const templates = await prisma.recurringCostTemplate.findMany({
      include: {
        vendor: { select: { id: true, name: true, email: true } },
        instances: {
          orderBy: { dueDate: "asc" },
        },
      },
      orderBy: { name: "asc" },
    })

    const toDateStr = (d: Date | null | undefined) =>
      d ? (d instanceof Date ? d.toISOString() : String(d)) : null

    const formatted = templates.map((t) => ({
      ...t,
      instances: t.instances.map((i) => ({
        id: i.id,
        templateId: i.templateId,
        dueDate: toDateStr(i.dueDate),
        amountOverride: i.amountOverride,
        paidAt: toDateStr(i.paidAt),
        invoiceUrl: i.invoiceUrl,
        notes: i.notes,
        createdAt: toDateStr(i.createdAt),
        updatedAt: toDateStr(i.updatedAt),
      })),
    }))

    return NextResponse.json(convertDecimalsToNumbers(formatted))
  } catch (error) {
    console.error("Error fetching recurring cost templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch recurring cost templates" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth()

    const body = await request.json().catch(() => ({}))
    const {
      name,
      amount,
      currency,
      frequency,
      type,
      firstPaymentDeadline,
      vendorId,
      notes,
      generateInstances,
    } = body

    if (!name || amount == null || !frequency) {
      return NextResponse.json(
        { error: "Name, amount, and frequency are required" },
        { status: 400 }
      )
    }
    if (!vendorId) {
      return NextResponse.json(
        { error: "Vendor is required" },
        { status: 400 }
      )
    }

    const validFreq = ["MONTHLY", "QUARTERLY", "SEMI_YEARLY", "YEARLY"].includes(frequency)
    if (!validFreq) {
      return NextResponse.json(
        { error: "Frequency must be MONTHLY, QUARTERLY, SEMI_YEARLY, or YEARLY" },
        { status: 400 }
      )
    }

    const amountNum = parseFloat(String(amount))
    if (isNaN(amountNum) || amountNum < 0) {
      return NextResponse.json(
        { error: "Amount must be a non-negative number" },
        { status: 400 }
      )
    }

    const firstDue = firstPaymentDeadline ? new Date(firstPaymentDeadline) : null
    if (generateInstances !== false && !firstDue) {
      return NextResponse.json(
        { error: "First payment deadline is required to generate instances" },
        { status: 400 }
      )
    }

    const instanceCount =
      frequency === "MONTHLY" ? 12 : frequency === "QUARTERLY" ? 8 : frequency === "SEMI_YEARLY" ? 4 : 2
    const dueDates =
      generateInstances !== false && firstDue
        ? generateDueDatesFromFirst(firstDue, frequency as RecurringCostFrequency, instanceCount)
        : []

    const template = await prisma.recurringCostTemplate.create({
      data: {
        name: String(name).trim(),
        amount: amountNum,
        currency: currency || "JPY",
        frequency: frequency as RecurringCostFrequency,
        type: (type === "FIXED" ? "FIXED" : "RECURRING") as "RECURRING" | "FIXED",
        ...(firstDue && { firstPaymentDeadline: firstDue }),
        vendorId,
        notes: notes ? String(notes).trim() : null,
      },
      include: {
        vendor: { select: { id: true, name: true, email: true } },
        instances: true,
      },
    })

    if (dueDates.length > 0) {
      await prisma.recurringCostInstance.createMany({
        data: dueDates.map((dueDate) => ({
          templateId: template.id,
          dueDate,
        })),
      })
    }

    const withInstances = await prisma.recurringCostTemplate.findUnique({
      where: { id: template.id },
      include: {
        vendor: { select: { id: true, name: true, email: true } },
        instances: { orderBy: { dueDate: "asc" } },
      },
    })

    const toDateStr = (d: Date | null | undefined) =>
      d ? (d instanceof Date ? d.toISOString() : String(d)) : null

    const formatted = withInstances
      ? {
          ...withInstances,
          instances: withInstances.instances.map((i) => ({
            id: i.id,
            templateId: i.templateId,
            dueDate: toDateStr(i.dueDate),
            amountOverride: i.amountOverride,
            paidAt: toDateStr(i.paidAt),
            invoiceUrl: i.invoiceUrl,
            notes: i.notes,
            createdAt: toDateStr(i.createdAt),
            updatedAt: toDateStr(i.updatedAt),
          })),
        }
      : template

    return NextResponse.json(convertDecimalsToNumbers(formatted), { status: 201 })
  } catch (error: unknown) {
    console.error("Error creating recurring cost template:", error)
    return NextResponse.json(
      { error: "Failed to create recurring cost template" },
      { status: 500 }
    )
  }
}
