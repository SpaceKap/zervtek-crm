import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Wallet as WalletIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDate(d: Date | null | undefined): string {
  if (d == null) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy");
}

/**
 * Wallet balance = Deposits − (Applied to invoice + Refunds).
 * CRM: when adding a deposit use description containing "Deposit"; when applying wallet to an invoice
 * create OUTGOING with description like "Applied from wallet to Invoice INV-001"; for refunds use "Refund".
 */
/** INCOMING with description containing "deposit" → increases wallet */
function isDeposit(direction: string, description: string | null): boolean {
  return direction === "INCOMING" && /deposit/i.test(description ?? "");
}

/** OUTGOING applied from wallet to an invoice → decreases wallet (e.g. "Applied from wallet to Invoice INV-001") */
function isAppliedFromWallet(direction: string, description: string | null): boolean {
  return direction === "OUTGOING" && /applied.*(wallet|to invoice)|from wallet/i.test(description ?? "");
}

/** OUTGOING refund → decreases wallet */
function isRefund(direction: string, description: string | null): boolean {
  return direction === "OUTGOING" && /refund/i.test(description ?? "");
}

/** INCOMING "Payment for Invoice" → does NOT change wallet (records invoice payment only) */
function isPaymentForInvoice(direction: string, description: string | null): boolean {
  return direction === "INCOMING" && /payment for invoice/i.test(description ?? "");
}

/** Wallet balance = Deposits − (Applied to invoice + Refunds). Payment for Invoice does not add to wallet. */
function computeWalletBalance(
  transactions: { direction: string; amount: unknown; description: string | null }[]
): number {
  let balance = 0;
  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    const desc = tx.description ?? "";
    if (isDeposit(tx.direction, desc)) balance += amount;
    else if (isAppliedFromWallet(tx.direction, desc) || isRefund(tx.direction, desc)) balance -= amount;
  }
  return balance;
}

function getTransactionLabel(
  direction: string,
  description: string | null
): { label: string; affectsWallet: boolean; isRefund: boolean; isDeduction: boolean } {
  if (isDeposit(direction, description))
    return { label: "Deposit", affectsWallet: true, isRefund: false, isDeduction: false };
  if (isAppliedFromWallet(direction, description))
    return { label: "Applied to invoice", affectsWallet: true, isRefund: false, isDeduction: true };
  if (isRefund(direction, description))
    return { label: "Refund", affectsWallet: true, isRefund: true, isDeduction: false };
  if (isPaymentForInvoice(direction, description))
    return { label: "Payment for invoice", affectsWallet: false, isRefund: false, isDeduction: false };
  if (direction === "OUTGOING")
    return { label: "Outgoing", affectsWallet: false, isRefund: false, isDeduction: true };
  return { label: "Incoming", affectsWallet: false, isRefund: false, isDeduction: false };
}

export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const customerId = session.user.id as string;
  const transactions = await prisma.transaction.findMany({
    where: { customerId },
    select: {
      id: true,
      date: true,
      amount: true,
      currency: true,
      description: true,
      type: true,
      direction: true,
      invoiceId: true,
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { date: "desc" },
  });

  const walletBalance = computeWalletBalance(transactions);
  const currency = transactions[0]?.currency ?? "JPY";

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mb-4 inline-flex min-h-[44px] items-center sm:min-h-0"
          )}
        >
          <ArrowLeft className="mr-2 size-4 shrink-0" />
          Back to portal
        </Link>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="size-5" />
              Wallet
            </CardTitle>
            <CardDescription>
              Funds available to apply to future invoices or request as a refund. Balance = Deposits − (Applied to invoice + Refunds). Payments for invoices do not add to your wallet.
            </CardDescription>
            <div className="mt-4 rounded-lg border bg-muted/50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Available balance
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {currency} {walletBalance.toLocaleString()}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {transactions.map((tx) => {
                  const amount = Number(tx.amount);
                  const { label, affectsWallet, isRefund, isDeduction } = getTransactionLabel(
                    tx.direction,
                    tx.description
                  );
                  const amountDisplay =
                    isRefund ? `+ ${tx.currency} ${amount.toLocaleString()}`
                    : isDeduction && affectsWallet ? `− ${tx.currency} ${amount.toLocaleString()}`
                    : `${tx.currency} ${amount.toLocaleString()}`;
                  return (
                    <li
                      key={tx.id}
                      className="flex flex-col gap-1 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isRefund ? "text-green-600 dark:text-green-400" : "text-foreground"
                            )}
                          >
                            {label}
                          </span>
                          {tx.invoice?.invoiceNumber && (
                            <span className="text-xs text-muted-foreground">
                              Invoice {tx.invoice.invoiceNumber}
                            </span>
                          )}
                          {!affectsWallet && label === "Payment for invoice" && (
                            <span className="text-xs text-muted-foreground">(does not change wallet)</span>
                          )}
                        </div>
                        {tx.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {tx.description}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                      <div className="mt-1 shrink-0 sm:mt-0">
                        <span
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            isRefund ? "text-green-600 dark:text-green-400" : "text-foreground"
                          )}
                        >
                          {amountDisplay}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
