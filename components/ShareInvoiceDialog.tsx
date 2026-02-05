"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ShareInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}

export function ShareInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
}: ShareInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateShareLink = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/share`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        setPublicUrl(data.publicUrl);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to generate share link");
      }
    } catch (error) {
      setError("Failed to generate share link. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    if (open && !publicUrl) {
      generateShareLink();
    }
  }, [open, publicUrl, generateShareLink]);

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      setError("Failed to copy link. Please try again.");
    }
  };

  const handleOpenLink = () => {
    if (publicUrl) {
      window.open(publicUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader className="space-y-3 px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <span className="material-symbols-outlined text-primary text-xl">
                share
              </span>
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">
                Share Invoice
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-sm leading-relaxed">
                Generate a secure public link to share this invoice with your
                customer. They can view the invoice and make payments directly.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 px-6 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="relative">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
              </div>
              <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                Generating share link...
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                This will only take a moment
              </p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 mt-0.5">
                  error
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Error generating link
                  </p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </p>
                  <Button
                    onClick={generateShareLink}
                    variant="outline"
                    size="sm"
                    className="mt-3 border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          ) : publicUrl ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-gray-900 dark:text-white">
                    Public Invoice Link
                  </Label>
                  {copied && (
                    <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                      <span className="material-symbols-outlined text-base">
                        check_circle
                      </span>
                      <span className="font-medium">Copied!</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      value={publicUrl}
                      readOnly
                      className="pr-10 font-mono text-xs bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700"
                    />
                    <button
                      onClick={() => {
                        const input = document.querySelector(
                          'input[value*="invoice/"]',
                        ) as HTMLInputElement;
                        if (input) {
                          input.select();
                          input.setSelectionRange(0, 99999);
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      title="Select all"
                    >
                      <span className="material-symbols-outlined text-sm">
                        select_all
                      </span>
                    </button>
                  </div>
                  <Button
                    onClick={handleCopy}
                    variant={copied ? "default" : "outline"}
                    size="icon"
                    className={`shrink-0 h-10 w-10 transition-all ${
                      copied
                        ? "bg-green-600 hover:bg-green-700 border-green-600"
                        : ""
                    }`}
                    title={copied ? "Copied!" : "Copy link"}
                  >
                    <span className="material-symbols-outlined text-base">
                      {copied ? "check" : "content_copy"}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleOpenLink}
                  variant="outline"
                  className="flex-1"
                >
                  <span className="material-symbols-outlined mr-2 text-base">
                    open_in_new
                  </span>
                  Open Link
                </Button>
                <Button
                  onClick={() => {
                    if (publicUrl) {
                      window.location.href = `mailto:?subject=Invoice&body=${encodeURIComponent(publicUrl)}`;
                    }
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  <span className="material-symbols-outlined mr-2 text-base">
                    email
                  </span>
                  Email Link
                </Button>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 mt-0.5 shrink-0">
                    info
                  </span>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      Security Notice
                    </p>
                    <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                      This link provides public access to your invoice. Only
                      share it with authorized recipients. Anyone with the link
                      can view the invoice details.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <span className="material-symbols-outlined text-primary text-3xl">
                  link
                </span>
              </div>
              <p className="mb-1 text-sm font-medium text-gray-900 dark:text-white">
                Ready to share your invoice?
              </p>
              <p className="mb-6 text-sm text-muted-foreground">
                Generate a secure public link that your customer can use to view
                and pay the invoice.
              </p>
              <Button onClick={generateShareLink} size="lg" className="px-6">
                <span className="material-symbols-outlined mr-2 text-base">
                  add_link
                </span>
                Generate Share Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
