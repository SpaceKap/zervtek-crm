import { notFound } from "next/navigation";
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
import { prisma } from "@/lib/db";
import { PortalHeader } from "@/components/PortalHeader";

function formatDate(d: Date | null | undefined): string {
  if (d == null) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy");
}

export default async function TokenWalletPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const customer = await prisma.customer.findUnique({
    where: { shareToken: token },
    select: { id: true, name: true },
  });

  if (!customer) notFound();

  const transactions = await prisma.transaction.findMany({
    where: { customerId: customer.id },
    select: {
      id: true,
      date: true,
      amount: true,
      currency: true,
      description: true,
      type: true,
      direction: true,
      invoiceId: true,
      depositReceivedAt: true,
      depositProofUrl: true,
      referenceNumber: true,
      invoice: { select: { invoiceNumber: true } },
    },
    orderBy: { date: "desc" },
  });

  // Wallet balance = Deposits − (Applied to invoice + Refunds). Do not add "Payment for Invoice".
  const totalDepositsJy = transactions
    .filter(
      (tx) =>
        tx.direction === "INCOMING" &&
        tx.description === "Deposit" &&
        (tx.currency || "JPY").toUpperCase() === "JPY"
    )
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const appliedToInvoiceJy = transactions
    .filter(
      (tx) =>
        tx.direction === "OUTGOING" &&
        tx.description?.includes("Applied from wallet") &&
        (tx.currency || "JPY").toUpperCase() === "JPY"
    )
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const refundsJy = transactions
    .filter(
      (tx) =>
        tx.direction === "OUTGOING" &&
        tx.description === "Refund" &&
        (tx.currency || "JPY").toUpperCase() === "JPY"
    )
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const balanceJy = totalDepositsJy - appliedToInvoiceJy - refundsJy;

  // Hide "Applied from wallet to Invoice" from list; deduction is shown on the invoice
  const transactionsToShow = transactions.filter(
    (tx) =>
      !(
        tx.direction === "OUTGOING" &&
        tx.description?.includes("Applied from wallet")
      )
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <PortalHeader
        title={customer.name}
        subtitle="Wallet"
        backLink={{ href: `/${token}`, label: "Back to portal" }}
        badge={
          <div className="flex min-h-[44px] items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 sm:min-h-0">
            <WalletIcon className="size-4 shrink-0 text-primary" />
            <span className="text-sm font-medium tabular-nums">
              ¥{balanceJy.toLocaleString()}
            </span>
          </div>
        }
      />

      <main className="container mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Card className="min-w-0 overflow-hidden mb-6">
          <CardHeader>
            <CardTitle>Wallet balance</CardTitle>
            <CardDescription>
              Deposits − (Applied to invoices + Refunds). Payments credited to
              invoices do not increase this balance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              ¥{balanceJy.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
            <CardDescription>
              All your deposits, payments and refunds in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsToShow.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {transactionsToShow.map((tx) => {
                  const isOutgoing = tx.direction === "OUTGOING";
                  const isRefund =
                    isOutgoing && (tx.description === "Refund" || false);
                  const isDeposit = tx.description === "Deposit";
                  const isPendingDeposit =
                    isDeposit && !tx.depositReceivedAt;
                  const label = isRefund
                      ? "Refund"
                      : isPendingDeposit
                        ? "Deposit (pending confirmation)"
                        : isDeposit
                          ? "Deposit"
                          : "Payment";
                  const amount = Number(tx.amount);
                  const showAsCredit = isRefund; // only actual refunds show as + green
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
                              showAsCredit
                                ? "text-green-600 dark:text-green-400"
                                : "text-foreground"
                            )}
                          >
                            {label}
                          </span>
                          {tx.invoice?.invoiceNumber && (
                            <span className="text-xs text-muted-foreground">
                              Invoice {tx.invoice.invoiceNumber}
                            </span>
                          )}
                        </div>
                        {tx.description && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {tx.description}
                          </p>
                        )}
                        {tx.referenceNumber && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Ref: {tx.referenceNumber}
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
                            showAsCredit
                              ? "text-green-600 dark:text-green-400"
                              : "text-foreground"
                          )}
                        >
                          {showAsCredit ? "+" : isOutgoing ? "−" : ""}
                          {tx.currency} {amount.toLocaleString()}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
