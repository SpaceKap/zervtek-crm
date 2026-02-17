"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "value" | "onChange"
> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
}

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

function toValue(date: Date | undefined): string {
  return date ? format(date, "yyyy-MM-dd") : "";
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  (
    {
      className,
      value,
      onChange,
      placeholder = "Select date",
      disabled = false,
      required = false,
      id,
      ...props
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const selectedDate = toDate(value);

    const handleSelect = (date: Date | undefined) => {
      const str = toValue(date);
      onChange?.({
        target: { value: str },
      } as React.ChangeEvent<HTMLInputElement>);
      if (date) setOpen(false);
    };

    const displayValue = value
      ? (() => {
          const d = toDate(value);
          return d ? format(d, "MMM dd, yyyy") : value;
        })()
      : "";

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            ref={ref}
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="dialog"
            aria-label="Select date"
            className={cn(
              "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
              "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "cursor-pointer",
              className
            )}
            onClick={() => !disabled && setOpen(true)}
            {...props}
          >
            <span className="material-symbols-outlined text-lg text-muted-foreground mr-2 shrink-0">
              calendar_today
            </span>
            <span
              className={cn(
                "flex-1 text-left",
                !displayValue && "text-muted-foreground"
              )}
            >
              {displayValue || placeholder}
            </span>
            {required && !value && (
              <span className="text-destructive">*</span>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }
);
DatePicker.displayName = "DatePicker";

export { DatePicker };
