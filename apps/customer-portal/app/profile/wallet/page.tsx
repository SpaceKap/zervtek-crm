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
              All your payments and refunds in one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions yet.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {transactions.map((tx) => {
                  const isRefund = tx.direction === "OUTGOING";
                  const label = isRefund ? "Refund" : "Payment";
                  const amount = Number(tx.amount);
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
                              isRefund
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
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(tx.date)}
                        </p>
                      </div>
                      <div className="mt-1 shrink-0 sm:mt-0">
                        <span
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            isRefund
                              ? "text-green-600 dark:text-green-400"
                              : "text-foreground"
                          )}
                        >
                          {isRefund ? "+" : ""}
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
