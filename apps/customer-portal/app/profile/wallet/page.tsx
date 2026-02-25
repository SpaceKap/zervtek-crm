import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Lock, Wallet as WalletIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RecordDepositFormWrapper } from "./RecordDepositFormWrapper";

function formatDate(d: Date | null | undefined): string {
  if (d == null) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return isNaN(date.getTime()) ? "—" : format(date, "MMM d, yyyy");
}

export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const customerId = session.user.id as string;

  const [transactions, companyInfo] = await Promise.all([
    prisma.transaction.findMany({
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
        depositReceivedAt: true,
        depositProofUrl: true,
        referenceNumber: true,
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.companyInfo.findFirst({
      select: { bankDetails1: true },
    }),
  ]);

  const bankDetailsRaw =
    companyInfo?.bankDetails1 != null
      ? typeof companyInfo.bankDetails1 === "string"
        ? (JSON.parse(companyInfo.bankDetails1) as Record<string, string>)
        : (companyInfo.bankDetails1 as Record<string, string>)
      : null;
  const bankDetails: Record<string, string> | null =
    bankDetailsRaw != null &&
    typeof bankDetailsRaw === "object" &&
    !Array.isArray(bankDetailsRaw)
      ? bankDetailsRaw
      : null;

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

        <Card className="relative min-w-0 overflow-hidden mb-6 border-2 shadow-md pt-0">
          <div className="border-b bg-muted/40 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                  <WalletIcon className="size-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold tracking-tight">
                    Add funds to your wallet
                  </CardTitle>
                  <CardDescription className="mt-0 text-xs">
                    All amounts in JPY · Secure payment
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Wallet balance
                  </p>
                  <p className="text-xl font-semibold tabular-nums">
                    ¥{balanceJy.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Deposits − (Applied to invoices + Refunds)
                  </p>
                </div>
                <div className="hidden items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground sm:flex">
                  <Lock className="size-3.5" />
                  <span>Secured</span>
                </div>
              </div>
            </div>
          </div>
          <CardContent className="pt-6">
            <RecordDepositFormWrapper bankDetails={bankDetails} />
            <div className="mt-6 flex items-center justify-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
              <Lock className="size-3.5" />
              <span>Your payment details are protected with encryption.</span>
            </div>
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
                  const isPendingDeposit = isDeposit && !tx.depositReceivedAt;
                  const label = isRefund
                      ? "Refund"
                      : isPendingDeposit
                        ? "Deposit (pending confirmation)"
                        : isDeposit
                          ? "Deposit"
                          : "Payment";
                  const amount = Number(tx.amount);
                  const showAsCredit = isRefund;
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
      </div>
    </div>
  );
}
