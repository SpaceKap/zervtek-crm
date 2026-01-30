"use client";

import { Button } from "@/components/ui/button";
import { AddInquiryDialog } from "./AddInquiryDialog";

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
  return (
    <>
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          onClick={() => onDialogOpenChange(true)}
          className="flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Add Inquiry
        </Button>
        {isManager && users.length > 0 && (
          <select
            value={filterUserId}
            onChange={(e) => onFilterUserIdChange(e.target.value)}
            className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
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
          className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
        >
          <option value="all">All Sources</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="EMAIL">Email</option>
          <option value="WEB">Web</option>
          <option value="CHATBOT">Chatbot</option>
          <option value="JCT_STOCK_INQUIRY">JCT Stock Inquiry</option>
          <option value="ONBOARDING_FORM">Onboarding Form</option>
          <option value="CONTACT_US_INQUIRY_FORM">
            Contact Us Inquiry Form
          </option>
          <option value="HERO_INQUIRY">Hero Section Inquiry</option>
          <option value="INQUIRY_FORM">Contact Form Inquiry</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => onFilterStatusChange(e.target.value)}
          className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
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
        <Button
          onClick={onRefresh}
          variant="outline"
          className="flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">refresh</span>
          Refresh
        </Button>
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
