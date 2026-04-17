"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AddInquiryDialog } from "./AddInquiryDialog";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface DashboardControlsProps {
  isManager: boolean;
  canAssignOnCreate: boolean;
  users: User[];
  filterUserId: string;
  filterSource: string;
  filterStatus: string;
  onFilterUserIdChange: (value: string) => void;
  onFilterSourceChange: (value: string) => void;
  onFilterStatusChange: (value: string) => void;
  onRefresh: () => void;
  onDialogOpenChange: (open: boolean) => void;
  dialogOpen: boolean;
  onInquiryCreated: () => void;
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";

export function DashboardControls({
  isManager,
  canAssignOnCreate,
  users,
  filterUserId,
  filterSource,
  filterStatus,
  onFilterUserIdChange,
  onFilterSourceChange,
  onFilterStatusChange,
  onRefresh,
  onDialogOpenChange,
  dialogOpen,
  onInquiryCreated,
}: DashboardControlsProps) {
  const isPwaStandalone = useStandalonePwa();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilters =
    filterUserId !== "all" ||
    filterSource !== "all" ||
    filterStatus !== "all";

  const iconBtn = isPwaStandalone ? "h-11 w-11 shrink-0 rounded-full" : "h-10 w-10 shrink-0 rounded-lg";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => onDialogOpenChange(true)}
          size={isPwaStandalone ? "icon" : "default"}
          aria-label="Add inquiry"
          className={cn(
            isPwaStandalone &&
              "h-11 w-11 shrink-0 rounded-full border border-primary/30",
            !isPwaStandalone && "flex items-center gap-2",
          )}
        >
          <span
            className={cn(
              "material-symbols-outlined",
              isPwaStandalone ? "text-2xl" : "text-lg",
            )}
          >
            add
          </span>
          {!isPwaStandalone && "Add Inquiry"}
        </Button>
        <Button
          onClick={onRefresh}
          variant="outline"
          size={isPwaStandalone ? "icon" : "default"}
          aria-label="Refresh inquiries"
          className={cn(
            isPwaStandalone && "h-11 w-11 shrink-0 rounded-full",
            !isPwaStandalone && "flex items-center gap-2",
          )}
        >
          <span className="material-symbols-outlined text-xl">refresh</span>
          {!isPwaStandalone && "Refresh"}
        </Button>

        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Filter inquiries by scope, source, and status"
              className={cn(
                iconBtn,
                hasActiveFilters
                  ? "border-primary/40 bg-primary/10 text-primary dark:border-[#D4AF37]/40 dark:bg-[#D4AF37]/10 dark:text-[#D4AF37]"
                  : "text-gray-700 dark:text-white",
              )}
            >
              <span className="material-symbols-outlined text-xl">tune</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[min(calc(100vw-2rem),20rem)] p-4"
            align="end"
            sideOffset={8}
          >
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Filters</p>
              {isManager && users.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="dash-filter-user" className="text-xs">
                    Inquiries
                  </Label>
                  <select
                    id="dash-filter-user"
                    value={filterUserId}
                    onChange={(e) => onFilterUserIdChange(e.target.value)}
                    className={selectClass}
                  >
                    <option value="all">All Inquiries</option>
                    <option value="me">My Inquiries</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="dash-filter-source" className="text-xs">
                  Source
                </Label>
                <select
                  id="dash-filter-source"
                  value={filterSource}
                  onChange={(e) => onFilterSourceChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">All Sources</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="CHATBOT">Chatbot</option>
                  <option value="JCT_STOCK_INQUIRY">JCT Stock Inquiry</option>
                  <option value="STOCK_INQUIRY">Stock Inquiry</option>
                  <option value="ONBOARDING_FORM">Onboarding Form</option>
                  <option value="HERO_INQUIRY">Hero Section Inquiry</option>
                  <option value="INQUIRY_FORM">Contact Form Inquiry</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dash-filter-status" className="text-xs">
                  Status
                </Label>
                <select
                  id="dash-filter-status"
                  value={filterStatus}
                  onChange={(e) => onFilterStatusChange(e.target.value)}
                  className={selectClass}
                >
                  <option value="all">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="NEGOTIATION">Negotiation</option>
                  <option value="CLOSED_WON">Closed Won</option>
                  <option value="CLOSED_LOST">Closed Lost</option>
                  <option value="RECURRING">Recurring</option>
                </select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <AddInquiryDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        onSuccess={onInquiryCreated}
        canAssignOnCreate={canAssignOnCreate}
        users={users}
      />
    </>
  );
}
