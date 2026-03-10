import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { canManageVehicleStages } from "@/lib/permissions"
import {
  isChargeSubtracting,
  getPositiveChargesSubtotal,
  getDiscountTotal,
  getDepositTotal,
} from "@/lib/charge-utils"
import { getInvoiceTotalWithTax, getInvoiceRevenueForProfit } from "@/lib/invoice-totals"

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
            costInvoice: {
              select: {
                costItems: { select: { amount: true } },
              },
            },
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

    // Total amount due (for balance due / payment tracking): discounts and deposits subtract
    let totalChargesDue = 0
    // Revenue for P&L (profit/margin/ROI): only discount subtracts; deposit does not
    let totalRevenue = 0
    // Breakdown for "All charges" display: Subtotal → Discount → Deposit → Tax → Total
    let chargesSubtotalPositive = 0
    let chargesDiscountTotal = 0
    let chargesDepositTotal = 0
    let chargesTaxTotal = 0
    vehicle.invoices.forEach((invoice) => {
      totalChargesDue += getInvoiceTotalWithTax(invoice)
      totalRevenue += getInvoiceRevenueForProfit(invoice)
      const invCharges = invoice.charges || []
      const pos = getPositiveChargesSubtotal(invCharges)
      const disc = getDiscountTotal(invCharges)
      const dep = getDepositTotal(invCharges)
      const afterDeposit = pos - disc - dep
      const tax = invoice.taxEnabled && invoice.taxRate
        ? afterDeposit * (parseFloat(invoice.taxRate.toString()) / 100)
        : 0
      chargesSubtotalPositive += pos
      chargesDiscountTotal += disc
      chargesDepositTotal += dep
      chargesTaxTotal += tax
    })

    // Calculate total cost: stage costs, shared invoice allocations, vehicle cost items, and legacy CostInvoice cost items (invoice-level expenses)
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
    const costInvoiceItemsTotal = (vehicle.invoices || []).reduce((sum, inv) => {
      const items = (inv as any).costInvoice?.costItems ?? []
      return sum + items.reduce((s: number, c: any) => s + parseFloat(String(c.amount ?? 0)), 0)
    }, 0)
    const totalCost = stageCostsTotal + sharedInvoiceCostsTotal + vehicleCostItemsTotal + costInvoiceItemsTotal

    // Calculate profit, margin, and ROI (revenue = revenue for P&L, deposit not subtracted)
    const profit = totalRevenue - totalCost
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0

    // totalCharges = amount due (already has deposit subtracted); totalReceived = incoming payments only
    const totalCharges = totalChargesDue
    const invoiceIds = vehicle.invoices.map((inv) => inv.id)
    // Include all INCOMING payments for this vehicle: linked by invoice OR by vehicle (so payments added with vehicle but no invoice still show)
    const incomingTx = await prisma.transaction.findMany({
      where: {
        direction: "INCOMING",
        OR: [
          ...(invoiceIds.length > 0 ? [{ invoiceId: { in: invoiceIds } }] : []),
          { vehicleId: params.id },
        ].filter(Boolean),
      },
      select: { id: true, amount: true, date: true, type: true, description: true, currency: true, referenceNumber: true, invoiceId: true },
    })
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
    // totalCharges already has deposit subtracted (invoice total = subtotal - discount - deposit + tax).
    // So "Received" = only actual incoming payments; do NOT add deposit applied (would double-count).
    const totalReceived = fromPayments
    const balanceDue = Math.max(0, totalCharges - totalReceived)

    const paymentStatus =
      balanceDue <= 0 && totalCharges > 0
        ? "PAID"
        : totalReceived > 0 && balanceDue > 0
          ? "PARTIALLY_PAID"
          : "PENDING"

    const invoiceTotalsByKey: Record<string, { total: number; status: string }> = {}
    vehicle.invoices.forEach((inv: any) => {
      const invTotal = getInvoiceTotalWithTax(inv)
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
      paymentStatus,
      depositApplied: fromDeposits.toString(),
      customerId: vehicle.customerId,
      invoices: vehicle.invoices,
      paymentTimeline,
      aggregatedCharges,
      invoiceCountAll: vehicle._count?.invoices ?? 0,
      chargesBreakdown: {
        subtotalPositive: chargesSubtotalPositive.toString(),
        discountTotal: chargesDiscountTotal.toString(),
        depositTotal: chargesDepositTotal.toString(),
        taxTotal: chargesTaxTotal.toString(),
      },
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
