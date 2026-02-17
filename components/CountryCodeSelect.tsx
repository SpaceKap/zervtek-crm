"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneCodeOption } from "@/lib/countries-data";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";

interface CountryCodeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: PhoneCodeOption[];
  placeholder?: string;
  className?: string;
}

/** Flag image URL from flagcdn.com - works on Windows (unlike emoji flags) */
function FlagImage({ alpha2, className }: { alpha2: string; className?: string }) {
  const src = `https://flagcdn.com/w40/${alpha2.toLowerCase()}.png`;
  return (
    <img
      src={src}
      alt=""
      role="presentation"
      className={cn("h-5 w-7 object-cover rounded-sm shrink-0", className)}
      loading="lazy"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

export function CountryCodeSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select country code",
  className,
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOpt = options.find((o) => o.code === value);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter(
      (opt) =>
        opt.countryName.toLowerCase().includes(q) ||
        opt.code.replace("+", "").startsWith(q) ||
        opt.alpha2.toLowerCase().includes(q)
    );
  }, [options, search]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = (code: string) => {
    onValueChange(code);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && filteredOptions.length > 0 && !search) {
      handleSelect(filteredOptions[0].code);
      e.preventDefault();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-10 px-3",
            !value && "text-muted-foreground",
            className
          )}
        >
          {selectedOpt ? (
            <span className="flex items-center gap-2 truncate">
              <FlagImage alpha2={selectedOpt.alpha2} />
              <span>{selectedOpt.label}</span>
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="p-1.5 border-b">
          <Input
            ref={inputRef}
            placeholder="Type to search (e.g. Japan, 81, JP)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9"
          />
        </div>
        <div
          className="max-h-[280px] overflow-y-auto p-1"
          role="listbox"
        >
          {filteredOptions.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No country found
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={opt.code === value}
                onClick={() => handleSelect(opt.code)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                  opt.code === value && "bg-accent"
                )}
              >
                <FlagImage alpha2={opt.alpha2} />
                <span className="truncate">{opt.label}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
