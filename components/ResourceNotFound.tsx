"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export type ResourceNotFoundVariant =
  | "vehicle"
  | "invoice"
  | "customer"
  | "lead"
  | "container-invoice"
  | "cost-invoice"
  | "page";

const RESOURCE_CONFIG: Record<
  ResourceNotFoundVariant,
  { title: string; description: string; icon: string; backHref: string; backLabel: string; secondaryHref?: string; secondaryLabel?: string }
> = {
  vehicle: {
    title: "Vehicle not found",
    description: "This vehicle doesn't exist or has been removed.",
    icon: "directions_car",
    backHref: "/dashboard/financial-operations?section=vehicles",
    backLabel: "Back to Vehicles",
    secondaryHref: "/dashboard",
    secondaryLabel: "Dashboard",
  },
  invoice: {
    title: "Invoice not found",
    description: "This invoice doesn't exist or you don't have access to it.",
    icon: "receipt_long",
    backHref: "/dashboard/financial-operations",
    backLabel: "Back to Financial Operations",
    secondaryHref: "/dashboard",
    secondaryLabel: "Dashboard",
  },
  customer: {
    title: "Customer not found",
    description: "This customer doesn't exist or has been removed.",
    icon: "person",
    backHref: "/dashboard/financial-operations?section=customers",
    backLabel: "Back to Customers",
    secondaryHref: "/dashboard",
    secondaryLabel: "Dashboard",
  },
  lead: {
    title: "Lead not found",
    description: "This lead or inquiry doesn't exist or has been removed.",
    icon: "inbox",
    backHref: "/dashboard",
    backLabel: "Back to Dashboard",
    secondaryHref: "/dashboard/manager",
    secondaryLabel: "Manager view",
  },
  "container-invoice": {
    title: "Container invoice not found",
    description: "This container invoice doesn't exist or you don't have access to it.",
    icon: "inventory_2",
    backHref: "/dashboard/financial-operations",
    backLabel: "Back to Financial Operations",
    secondaryHref: "/dashboard",
    secondaryLabel: "Dashboard",
  },
  "cost-invoice": {
    title: "Cost invoice not found",
    description: "This cost invoice doesn't exist or you don't have access to it.",
    icon: "summarize",
    backHref: "/dashboard/financial-operations",
    backLabel: "Back to Financial Operations",
    secondaryHref: "/dashboard",
    secondaryLabel: "Dashboard",
  },
  page: {
    title: "Page not found",
    description: "The page you're looking for doesn't exist or has been moved.",
    icon: "search_off",
    backHref: "/dashboard",
    backLabel: "Go to Dashboard",
    secondaryHref: "/dashboard",
    secondaryLabel: "Dashboard",
  },
};

interface ResourceNotFoundProps {
  variant: ResourceNotFoundVariant;
  /** Optional identifier to show (e.g. ID or slug) */
  id?: string | null;
  /** Override description */
  description?: string;
  /** Use when you need custom back link (e.g. public invoice) */
  backHref?: string;
  backLabel?: string;
  /** Full-width layout (e.g. standalone page). Default true for consistent min-height. */
  fullPage?: boolean;
}

export function ResourceNotFound({
  variant,
  id,
  description: descriptionOverride,
  backHref: backHrefOverride,
  backLabel: backLabelOverride,
  fullPage = true,
}: ResourceNotFoundProps) {
  const config = RESOURCE_CONFIG[variant];
  const title = config.title;
  const description = descriptionOverride ?? config.description;
  const backHref = backHrefOverride ?? config.backHref;
  const backLabel = backLabelOverride ?? config.backLabel;

  const content = (
    <div className="flex flex-col items-center justify-center text-center px-4 py-12 sm:py-16">
      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gray-100 dark:bg-[#2C2C2C] flex items-center justify-center mx-auto mb-6 ring-4 ring-gray-200/50 dark:ring-white/5">
        <span
          className="material-symbols-outlined text-4xl sm:text-5xl text-gray-500 dark:text-[#A1A1A1]"
          aria-hidden
        >
          {config.icon}
        </span>
      </div>
      <p className="text-sm font-medium text-primary dark:text-[#D4AF37] uppercase tracking-wider mb-2">
        404
      </p>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
        {title}
      </h1>
      <p className="text-gray-600 dark:text-[#A1A1A1] max-w-md mb-8">
        {description}
        {id != null && id !== "" && (
          <span className="block mt-2 text-sm text-gray-500 dark:text-[#666] font-mono">
            {id}
          </span>
        )}
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button asChild size="lg" className="gap-2 min-w-[180px]">
          <Link href={backHref}>
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            {backLabel}
          </Link>
        </Button>
        {config.secondaryHref && config.secondaryLabel && (
          <Button asChild variant="outline" size="lg" className="gap-2 min-w-[180px]">
            <Link href={config.secondaryHref}>
              <span className="material-symbols-outlined text-lg">home</span>
              {config.secondaryLabel}
            </Link>
          </Button>
        )}
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-[60vh] sm:min-h-[70vh] flex items-center justify-center bg-gray-50 dark:bg-[#121212] rounded-xl border border-gray-200/50 dark:border-white/5">
        {content}
      </div>
    );
  }

  return content;
}
