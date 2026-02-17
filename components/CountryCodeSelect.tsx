"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneCodeOption } from "@/lib/countries-data";

interface CountryCodeSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: PhoneCodeOption[];
  placeholder?: string;
  className?: string;
}

export function CountryCodeSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select country code",
  className,
}: CountryCodeSelectProps) {
  return (
    <Select value={value || ""} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[320px]">
        {options.map((opt) => (
          <SelectItem
            key={opt.code}
            value={opt.code}
            className="py-2"
          >
            <span className="flex items-center gap-2">
              <span
                className="text-lg leading-none"
                aria-hidden
              >
                {opt.flag}
              </span>
              <span>{opt.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
