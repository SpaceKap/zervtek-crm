import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

/**
 * GET /api/customers/[id]/wallet-balance
 * Returns the customer's wallet balance: Deposits − (Applied to invoice + Refunds).
 * Only INCOMING with description "Deposit" add to balance; INCOMING "Payment for Invoice" do not.
 * Allowed for admin, manager, accountant.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const allowed: UserRole[] = [UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT];
    if (!allowed.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customerId = params.id;
    if (!customerId) {
      return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
    }

    const transactions = await prisma.transaction.findMany({
      where: { customerId },
      select: { direction: true, amount: true, currency: true, description: true },
    });

    // Deposits − (Applied to invoice + Refunds). Do not add "Payment for Invoice" to balance.
    const balanceJy = transactions.reduce((sum, tx) => {
      const amt = Number(tx.amount);
      const isJy = (tx.currency || "JPY").toUpperCase() === "JPY";
      if (!isJy) return sum;
      if (tx.direction === "INCOMING") {
        if (tx.description === "Deposit") return sum + amt;
        return sum;
      }
      return sum - amt;
    }, 0);

    return NextResponse.json({
      balance: Math.round(balanceJy * 100) / 100,
      currency: "JPY",
    });
  } catch (error) {
    console.error("Wallet balance error:", error);
    return NextResponse.json(
      { error: "Failed to get wallet balance" },
      { status: 500 }
    );
  }
}
