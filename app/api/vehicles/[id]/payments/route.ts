import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import { getChargesSubtotal, isChargeSubtracting } from "@/lib/charge-utils"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        customerId: true,
        _count: {
          select: { invoices: true },
        },
        shippingStage: {
          select: {
            totalCharges: true,
            totalReceived: true,
          },
        },
        invoices: {
          select: {
            id: true,
            customerId: true,
            invoiceNumber: true,
            charges: {
              select: {
                id: true,
                description: true,
                amount: true,
                chargeType: { select: { name: true } },
                appliedDepositTransactionId: true,
                appliedDepositTransaction: {
                  select: { id: true, date: true, amount: true, description: true, type: true, depositNumber: true },
                },
              },
            },
            paymentStatus: true,
            taxEnabled: true,
            taxRate: true,
          },
        },
        stageCosts: {
          select: {
            id: true,
            amount: true,
          },
        },
        vehicleCostItems: {
          select: {
            id: true,
            amount: true,
          },
        },
        sharedInvoiceVehicles: {
          select: {
            id: true,
            allocatedAmount: true,
            sharedInvoice: {
              select: {
                id: true,
                type: true,
                invoiceNumber: true,
              },
            },
          },
        },
      },
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      )
    }

    // Calculate total revenue from finalized invoices (including tax) - discounts/deposits subtract
    let totalRevenue = 0
    vehicle.invoices.forEach((invoice) => {
      const chargesTotal = getChargesSubtotal(invoice.charges)
      let subtotal = chargesTotal
      if (invoice.taxEnabled && invoice.taxRate) {
        const taxRate = parseFloat(invoice.taxRate.toString())
        const taxAmount = subtotal * (taxRate / 100)
        subtotal += taxAmount
      }
      totalRevenue += subtotal
    })

    // Calculate total cost from stage costs, shared invoice allocations, and vehicle cost items (not invoice cost breakdown)
    const stageCostsTotal = vehicle.stageCosts.reduce(
      (sum, cost) => sum + parseFloat(cost.amount.toString()),
      0,
    )
    const sharedInvoiceCostsTotal = vehicle.sharedInvoiceVehicles.reduce(
      (sum, siv) => sum + parseFloat(siv.allocatedAmount.toString()),
      0,
    )
    const vehicleCostItemsTotal = (vehicle.vehicleCostItems || []).reduce(
      (sum, item) => sum + parseFloat(item.amount.toString()),
      0,
    )
    const totalCost = stageCostsTotal + sharedInvoiceCostsTotal + vehicleCostItemsTotal

    // Calculate profit, margin, and ROI
    const profit = totalRevenue - totalCost
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0

    // totalCharges = invoice revenue; totalReceived = incoming payments + deposit applied to vehicle's invoices
    const totalCharges = totalRevenue
    const invoiceIds = vehicle.invoices.map((inv) => inv.id)
    const incomingTx = invoiceIds.length > 0
      ? await prisma.transaction.findMany({
          where: {
            direction: "INCOMING",
            invoiceId: { in: invoiceIds },
          },
          select: { id: true, amount: true, date: true, type: true, description: true, currency: true, referenceNumber: true, invoiceId: true },
        })
      : []
    const fromPayments = incomingTx.reduce(
      (sum, t) => sum + parseFloat(t.amount.toString()),
      0,
    )
    const fromDeposits = vehicle.invoices.reduce((sum, inv) => {
      const depositCharges = (inv.charges || []).filter(
        (c: any) =>
          c.appliedDepositTransactionId &&
          (c.chargeType?.name?.toLowerCase() === "deposit" || c.chargeType?.name === "DEPOSIT")
      )
      return sum + depositCharges.reduce((s: number, c: any) => s + Math.abs(parseFloat(String(c.amount ?? 0))), 0)
    }, 0)
    const totalReceived = fromPayments + fromDeposits
    const balanceDue = Math.max(0, totalCharges - totalReceived)

    const invoiceTotalsByKey: Record<string, { total: number; status: string }> = {}
    vehicle.invoices.forEach((inv: any) => {
      let invTotal = getChargesSubtotal(inv.charges || [])
      if (inv.taxEnabled && inv.taxRate) {
        invTotal += invTotal * (parseFloat(inv.taxRate.toString()) / 100)
      }
      invoiceTotalsByKey[inv.id] = { total: invTotal, status: inv.paymentStatus || "PENDING" }
    })

    const paymentTimeline = [
      ...incomingTx.map((t) => {
        const invMeta = t.invoiceId ? invoiceTotalsByKey[t.invoiceId] : null
        const inv = vehicle.invoices.find((i: any) => i.id === t.invoiceId)
        return {
          id: t.id,
          date: t.date,
          amount: parseFloat(t.amount.toString()),
          currency: "JPY",
          kind: "payment" as const,
          type: t.type,
          description: t.description,
          referenceNumber: t.referenceNumber,
          invoiceId: t.invoiceId,
          invoiceNumber: inv?.invoiceNumber ?? null,
          invoiceTotal: invMeta?.total ?? null,
          invoicePaymentStatus: invMeta?.status ?? null,
        }
      }),
      ...vehicle.invoices.flatMap((inv: any) =>
        (inv.charges || [])
          .filter(
            (c: any) =>
              c.appliedDepositTransactionId &&
              (c.chargeType?.name?.toLowerCase() === "deposit" || c.chargeType?.name === "DEPOSIT")
          )
          .map((c: any) => {
            const invMeta = invoiceTotalsByKey[inv.id]
            return {
              id: `deposit-${c.id}`,
              date: c.appliedDepositTransaction?.date || c.createdAt,
              amount: Math.abs(parseFloat(c.amount)),
              currency: "JPY",
              kind: "deposit_applied" as const,
              type: null,
              depositNumber: c.appliedDepositTransaction?.depositNumber ?? null,
              description: `Deposit applied to ${inv.invoiceNumber}`,
              referenceNumber: null,
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              invoiceTotal: invMeta?.total ?? null,
              invoicePaymentStatus: invMeta?.status ?? null,
            }
          })
      ),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Aggregated charges from all invoices (discount/deposit as negative, same as invoice)
    const aggregatedCharges = vehicle.invoices.flatMap((inv: any) =>
      (inv.charges || []).map((c: any) => {
        const raw = parseFloat(c.amount?.toString() ?? "0")
        const amount = isChargeSubtracting(c) ? -raw : raw
        return {
          id: c.id,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          description: c.description,
          chargeTypeName: c.chargeType?.name ?? null,
          amount,
          appliedDepositTransactionId: c.appliedDepositTransactionId ?? null,
        }
      })
    )

    return NextResponse.json({
      totalRevenue: totalRevenue.toString(),
      totalCost: totalCost.toString(),
      profit: profit.toString(),
      margin: margin.toFixed(2),
      roi: roi.toFixed(2),
      totalCharges: totalCharges.toString(),
      totalReceived: totalReceived.toString(),
      balanceDue: balanceDue.toString(),
      customerId: vehicle.customerId,
      invoices: vehicle.invoices,
      paymentTimeline,
      aggregatedCharges,
      invoiceCountAll: vehicle._count?.invoices ?? 0,
    })
  } catch (error: any) {
    console.error("Error fetching vehicle payments:", error)
    const message =
      process.env.NODE_ENV === "development" && error?.message
        ? error.message
        : "Failed to fetch vehicle payments"
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageVehicleStages(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { totalCharges, totalReceived } = body

    const updateData: any = {}
    if (totalCharges !== undefined) {
      updateData.totalCharges = parseFloat(totalCharges)
    }
    if (totalReceived !== undefined) {
      updateData.totalReceived = parseFloat(totalReceived)
    }

    const stage = await prisma.vehicleShippingStage.upsert({
      where: { vehicleId: params.id },
      update: updateData,
      create: {
        vehicleId: params.id,
        stage: "PAYMENT",
        ...updateData,
      },
    })

    return NextResponse.json(stage)
  } catch (error) {
    console.error("Error updating vehicle payments:", error)
    return NextResponse.json(
      { error: "Failed to update vehicle payments" },
      { status: 500 }
    )
  }
}
