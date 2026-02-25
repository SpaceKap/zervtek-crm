"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Clipboard, Check } from "lucide-react";

export function CopyableField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!value) return null;

  return (
    <div className="flex flex-col gap-1">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
        <span className={`min-w-0 flex-1 truncate text-sm ${mono ? "font-mono" : ""}`}>
          {value}
        </span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Copy"
        >
          {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
        </button>
      </div>
    </div>
  );
}
