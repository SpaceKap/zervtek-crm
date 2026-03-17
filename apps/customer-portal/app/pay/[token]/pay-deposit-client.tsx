"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PayDepositClientProps {
  token: string;
  apiBase: string;
}

type Status = "loading" | "PENDING" | "PAID" | "EXPIRED" | "error";

export function PayDepositClient({ token, apiBase }: PayDepositClientProps) {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>("");
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("JPY");
  const [customerName, setCustomerName] = useState<string>("");
  const [paypalPaymentUrl, setPaypalPaymentUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = `${apiBase}/api/deposit-links/public/${encodeURIComponent(token)}`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "PAID") {
          setStatus("PAID");
          setMessage(data.message || "This payment link has already been paid.");
        } else if (data.status === "EXPIRED") {
          setStatus("EXPIRED");
          setMessage(data.message || "This payment link has expired.");
        } else if (data.status === "PENDING" && data.paypalPaymentUrl) {
          setStatus("PENDING");
          setAmount(data.amount ?? null);
          setCurrency(data.currency ?? "JPY");
          setCustomerName(data.customerName ?? "");
          setPaypalPaymentUrl(data.paypalPaymentUrl);
        } else {
          setStatus("error");
          setMessage(data.error || data.message || "Invalid or expired link.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Could not load payment details.");
      });
  }, [token, apiBase]);

  if (status === "loading") {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "PAID" || status === "EXPIRED" || status === "error") {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {status === "PAID"
              ? "Already paid"
              : status === "EXPIRED"
                ? "Link expired"
                : "Unable to load"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Pay deposit</CardTitle>
        <CardDescription>
          {customerName && <span className="block">{customerName}</span>}
          {amount != null && (
            <span className="block font-semibold text-foreground mt-1">
              {currency} {amount.toLocaleString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          You will be redirected to PayPal to complete the payment securely. No login on this site is required.
        </p>
        {paypalPaymentUrl && (
          <Button
            className="w-full min-h-[44px]"
            onClick={() => {
              window.location.href = paypalPaymentUrl;
            }}
          >
            Pay with PayPal
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
