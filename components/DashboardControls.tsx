"use client";

import { Button } from "@/components/ui/button";
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

export function DashboardControls({
  isManager,
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
  const selectClass = cn(
    "flex rounded-md border border-input bg-background px-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100",
    isPwaStandalone
      ? "min-h-11 w-full min-w-0 touch-manipulation py-2 text-base"
      : "h-10 w-48 py-2 text-sm",
  );

  return (
    <>
      <div
        className={cn(
          "flex gap-4",
          isPwaStandalone
            ? "w-full max-w-full flex-col items-stretch"
            : "flex-wrap items-center",
        )}
      >
        <div
          className={cn(
            "flex gap-2",
            isPwaStandalone ? "items-center" : "contents",
          )}
        >
          <Button
            onClick={() => onDialogOpenChange(true)}
            size={isPwaStandalone ? "icon" : "default"}
            aria-label="Add inquiry"
            className={cn(
              isPwaStandalone &&
                "h-11 w-11 shrink-0 touch-manipulation rounded-full border border-primary/30",
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
              isPwaStandalone && "h-11 w-11 shrink-0 touch-manipulation rounded-full",
              !isPwaStandalone && "flex items-center gap-2",
            )}
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
            {!isPwaStandalone && "Refresh"}
          </Button>
        </div>
        {isManager && users.length > 0 && (
          <select
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
        )}
        <select
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
        <select
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
      <AddInquiryDialog
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        onSuccess={onInquiryCreated}
        isManager={isManager}
        users={users}
      />
    </>
  );
}
