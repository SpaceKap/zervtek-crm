"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyableField } from "@/components/CopyableField";
import { ArrowLeft, Building2, CreditCard, Landmark } from "lucide-react";

const PAYPAL_MAX_JPY = 250_000;
const PAYPAL_FEE_RATE = 0.043;

const QUICK_AMOUNTS = [100_000, 150_000, 200_000, 250_000] as const;

function formatAmountDisplay(digits: string): string {
  if (!digits) return "";
  const n = parseInt(digits, 10);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString();
}

function parseAmountDigits(digits: string): number {
  if (!digits) return NaN;
  const n = parseInt(digits, 10);
  return Number.isNaN(n) ? NaN : n;
}

type BankDetails = Record<string, string> | null;
type Method = "WISE" | "PAYPAL" | "BANK_TRANSFER" | null;

interface DepositOptions {
  wisePaymentLink: string | null;
  paypalClientId: string | null;
}

export function RecordDepositForm({
  bankDetails,
  onSuccess,
}: {
  bankDetails: BankDetails;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState<Method>(null);
  const [amount, setAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<DepositOptions | null>(null);
  const paypalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/deposit-options", { credentials: "include" })
      .then((r) => r.json())
      .then(setOptions)
      .catch(() => setOptions({ wisePaymentLink: null, paypalClientId: null }));
  }, []);

  const numAmount = parseAmountDigits(amount);
  const validAmount = Number.isFinite(numAmount) && numAmount > 0;
  const amountDisplay = formatAmountDisplay(amount);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setAmount(digits);
  };

  const quickAmountButtons = (
    <div className="flex flex-wrap gap-2">
      <span className="w-full text-xs text-muted-foreground">Quick select</span>
      {QUICK_AMOUNTS.map((q) => (
        <Button
          key={q}
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => setAmount(String(q))}
        >
          ¥{q.toLocaleString()}
        </Button>
      ))}
    </div>
  );
  const paypalOverLimit = method === "PAYPAL" && validAmount && numAmount > PAYPAL_MAX_JPY;
  const totalCharge =
    method === "PAYPAL" && validAmount
      ? Math.round((numAmount / (1 - PAYPAL_FEE_RATE)) * 100) / 100
      : 0;

  const handleWisePay = async () => {
    if (!validAmount || !options?.wisePaymentLink) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: numAmount,
          method: "WISE",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create deposit");
      }
      const baseUrl = options.wisePaymentLink.split("?")[0];
      const params = new URLSearchParams();
      params.set("amount", numAmount.toFixed(2));
      params.set("currency", "JPY");
      params.set("description", "Deposit");
      window.location.href = `${baseUrl}?${params.toString()}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validAmount) {
      setError("Please enter a valid amount.");
      return;
    }
    const hasProof = screenshotFile || referenceNumber.trim();
    if (!hasProof) {
      setError("Please add a reference number or upload a screenshot.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      let depositProofUrl: string | undefined;
      if (screenshotFile) {
        const formData = new FormData();
        formData.append("file", screenshotFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to upload screenshot");
        }
        const uploadData = await uploadRes.json();
        const relativeUrl = uploadData.url as string;
        depositProofUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}${relativeUrl}`
            : relativeUrl;
      }
      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount: numAmount,
          method: "BANK_TRANSFER",
          referenceNumber: referenceNumber.trim() || undefined,
          depositProofUrl,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to record deposit");
      }
      setAmount("");
      setReferenceNumber("");
      setScreenshotFile(null);
      setMethod(null);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const hasWise = Boolean(options?.wisePaymentLink);
  const hasPayPal = Boolean(options?.paypalClientId);
  const hasBank = Boolean(bankDetails);
  const optionsLoaded = options !== null;
  const hasAnyMethod = hasWise || hasPayPal || hasBank;

  const renderMethodChoice = () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Select payment method
        </p>
      </div>
      {!optionsLoaded ? (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 py-8 text-center text-sm text-muted-foreground">
          Loading payment methods…
        </div>
      ) : !hasAnyMethod ? (
        <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 py-8 text-center text-sm text-muted-foreground">
          No payment methods are configured. Please contact support.
        </div>
      ) : (
        <div className="grid gap-3">
          {hasPayPal && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMethod("PAYPAL");
              }}
              className="group flex w-full items-start gap-4 rounded-xl border-2 border-input bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#003087]/10 text-[#003087] dark:bg-[#0070ba]/20 dark:text-[#0070ba]">
                <CreditCard className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground">PayPal</div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Pay through PayPal, instantly. Deposits up to 250,000 JPY. 4.3% transfer fee.
                </p>
              </div>
            </button>
          )}
          {hasWise && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMethod("WISE");
              }}
              className="group flex w-full items-start gap-4 rounded-xl border-2 border-input bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#9fe870]/20 text-[#009a6e] dark:bg-[#9fe870]/30">
                <Landmark className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground">Wise</div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Deposit through Wise, instantly.
                </p>
              </div>
            </button>
          )}
          {hasBank && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMethod("BANK_TRANSFER");
              }}
              className="group flex w-full items-start gap-4 rounded-xl border-2 border-input bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-foreground">Bank Transfer</div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Manually transfer using ZervTek&apos;s bank details. Transfers can take 2–3 business days.
                </p>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );

  const renderWise = () => {
    if (!options?.wisePaymentLink) return null;
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => { setError(null); setMethod(null); }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Change payment method
        </button>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Amount
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              JPY
            </span>
            <Input
              id="wise-amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              className="h-12 pl-14 text-lg font-semibold tabular-nums"
              value={amountDisplay}
              onChange={handleAmountChange}
            />
          </div>
          {quickAmountButtons}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="button"
          className="w-full"
          size="lg"
          disabled={!validAmount || loading}
          onClick={handleWisePay}
        >
          {loading ? "Redirecting to Wise…" : "Continue to Wise"}
        </Button>
      </div>
    );
  };

  const renderPayPal = () => {
    if (!options?.paypalClientId) return null;
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => { setError(null); setMethod(null); }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Change payment method
        </button>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Amount we receive
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              JPY
            </span>
            <Input
              id="paypal-amount"
              type="text"
              inputMode="numeric"
              placeholder="0"
              className="h-12 pl-14 text-lg font-semibold tabular-nums"
              value={amountDisplay}
              onChange={handleAmountChange}
            />
          </div>
          {quickAmountButtons}
          {validAmount && (
            <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              You pay <span className="font-medium text-foreground">{totalCharge.toLocaleString()} JPY</span> (includes 4.3% fee). We receive {numAmount.toLocaleString()} JPY.
            </p>
          )}
          {paypalOverLimit && (
            <p className="text-sm text-destructive">
              PayPal deposits are limited to {PAYPAL_MAX_JPY.toLocaleString()} JPY.
            </p>
          )}
        </div>
        {validAmount && !paypalOverLimit && (
          <>
            <div ref={paypalContainerRef} className="min-h-[45px]" />
            <PayPalButton
              amountReceived={numAmount}
              totalCharge={totalCharge}
              clientId={options.paypalClientId}
              containerRef={paypalContainerRef}
              onSuccess={() => {
                setAmount("");
                setMethod(null);
                onSuccess();
              }}
              onError={setError}
            />
          </>
        )}
      </div>
    );
  };

  const renderBank = () => {
    if (!bankDetails) return null;
    const fields = [
      { key: "name", label: "Bank name" },
      { key: "accountName", label: "Account name" },
      { key: "accountNo", label: "Account number", mono: true },
      { key: "swiftCode", label: "SWIFT", mono: true },
      { key: "branchName", label: "Branch" },
      { key: "bankAddress", label: "Bank address" },
    ];
    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => { setError(null); setMethod(null); }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Change payment method
        </button>
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Bank details
          </p>
          <div className="rounded-xl border-2 border-muted bg-muted/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map(
                (f) =>
                  bankDetails[f.key] && (
                    <CopyableField
                      key={f.key}
                      label={f.label}
                      value={bankDetails[f.key]}
                      mono={f.mono}
                    />
                  )
              )}
            </div>
          </div>
        </div>
        <form onSubmit={handleBankSubmit} className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Amount
            </p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                JPY
              </span>
              <Input
                id="bank-amount"
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="h-12 pl-14 text-lg font-semibold tabular-nums"
                value={amountDisplay}
                onChange={handleAmountChange}
                required
              />
            </div>
            {quickAmountButtons}
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Proof of transfer
            </p>
            <p className="text-sm text-muted-foreground">
              Add a reference or upload a screenshot (at least one required).
            </p>
            <Input
              id="bank-ref"
              type="text"
              placeholder="Reference number or link"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              className="h-11"
            />
            <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 px-4 py-3">
              <Label htmlFor="bank-screenshot" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Upload screenshot or proof
              </Label>
              <Input
                id="bank-screenshot"
                type="file"
                accept="image/*,.pdf"
                className="mt-2 h-auto border-0 bg-transparent p-0 file:mr-2 file:rounded-md file:border file:border-input file:bg-muted file:px-3 file:py-1.5 file:text-sm"
                onChange={(e) =>
                  setScreenshotFile(e.target.files?.[0] ?? null)
                }
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Submitting…" : "Confirm deposit"}
          </Button>
        </form>
      </div>
    );
  };

  if (method === "WISE") return renderWise();
  if (method === "PAYPAL") return renderPayPal();
  if (method === "BANK_TRANSFER") return renderBank();
  return renderMethodChoice();
}

function PayPalButton({
  amountReceived,
  totalCharge,
  clientId,
  containerRef,
  onSuccess,
  onError,
}: {
  amountReceived: number;
  totalCharge: number;
  clientId: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const amountRef = useRef(amountReceived);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  amountRef.current = amountReceived;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!clientId) return;
    const existing = document.querySelector('script[src*="paypal.com/sdk/js"]');
    if (existing) {
      if ((window as unknown as { paypal?: unknown }).paypal) {
        setScriptLoaded(true);
      } else {
        existing.addEventListener("load", () => setScriptLoaded(true));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=JPY&intent=capture&components=buttons`;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
    return () => {
      // Don't remove script so we don't break re-mounts; SDK stays loaded
    };
  }, [clientId]);

  useEffect(() => {
    if (!scriptLoaded || !containerRef?.current) return;
    const win = window as unknown as { paypal?: { Buttons: (arg: unknown) => { render: (el: HTMLElement) => Promise<unknown> } } };
    if (!win.paypal) return;
    const paypal = win.paypal;
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = "";
    paypal
      .Buttons({
        createOrder: async () => {
          const amount = amountRef.current;
          setLoading(true);
          try {
            const res = await fetch("/api/deposits/create-paypal-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ amount }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create order");
            return data.orderId;
          } catch (e) {
            onErrorRef.current(e instanceof Error ? e.message : "PayPal error");
            throw e;
          } finally {
            setLoading(false);
          }
        },
        onApprove: async (data: { orderID: string }) => {
          const amount = amountRef.current;
          setLoading(true);
          try {
            const res = await fetch("/api/deposits/capture-paypal-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                orderId: data.orderID,
                amountReceived: amount,
              }),
            });
            const dataRes = await res.json();
            if (!res.ok) throw new Error(dataRes.error || "Capture failed");
            onSuccessRef.current();
          } catch (e) {
            onErrorRef.current(e instanceof Error ? e.message : "Payment failed");
          } finally {
            setLoading(false);
          }
        },
        onError: (err: { message?: string }) => {
          onErrorRef.current(err?.message || "PayPal error");
        },
      })
      .render(container);
  }, [scriptLoaded, containerRef]);

  return null;
}
