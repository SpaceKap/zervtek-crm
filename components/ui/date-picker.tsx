"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface DatePickerProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, id, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const combinedRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        if (ref) {
          if (typeof ref === "function") {
            ref(node);
          } else {
            ref.current = node;
          }
        }
        inputRef.current = node;
      },
      [ref],
    );

    const handleIconClick = () => {
      if (inputRef.current) {
        // Try to use showPicker() if available (modern browsers)
        if (typeof inputRef.current.showPicker === "function") {
          inputRef.current.showPicker();
        } else {
          // Fallback: focus the input to open the date picker
          inputRef.current.focus();
          inputRef.current.click();
        }
      }
    };

    return (
      <div className="relative">
        <input
          type="date"
          id={id}
          ref={combinedRef}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={handleIconClick}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          tabIndex={-1}
          aria-label="Open date picker"
        >
          <span className="material-symbols-outlined text-lg">
            calendar_today
          </span>
        </button>
      </div>
    );
  },
);
DatePicker.displayName = "DatePicker";

export { DatePicker };
