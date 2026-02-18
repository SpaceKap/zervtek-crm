"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InquirySource, InquiryStatus } from "@prisma/client";
import { formatDistanceToNow, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

interface InquiryCardProps {
  inquiry: {
    id: string;
    source: InquirySource;
    customerName: string | null;
    email: string | null;
    phone: string | null;
    message: string | null;
    status: InquiryStatus;
    assignedToId: string | null;
    createdAt: Date;
    metadata?: any;
    assignedTo?: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    } | null;
  };
  onAssign?: (id: string) => void;
  onAssignTo?: (id: string) => void;
  onRelease?: (id: string) => void;
  onView?: (id: string) => void;
  onNotes?: (id: string) => void;
  onDelete?: (id: string) => void;
  showAssignButton?: boolean;
  showAssignToButton?: boolean;
  showReleaseButton?: boolean;
  showNotesButton?: boolean;
  showCopyFieldIcons?: boolean;
  showDeleteButton?: boolean;
  currentUserId?: string;
  currentUserEmail?: string;
  isManager?: boolean;
  isAdmin?: boolean;
  hideSourceBadge?: boolean;
  hideStatusBadge?: boolean;
  dragHandleProps?: any;
  isInFunnel?: boolean; // Indicates if card is in the kanban board (funnel)
}

const statusColors: Record<InquiryStatus, string> = {
  NEW: "bg-blue-100 text-blue-700 border-blue-200",
  CONTACTED: "bg-yellow-100 text-yellow-700 border-yellow-200",
  QUALIFIED: "bg-green-100 text-green-700 border-green-200",
  DEPOSIT: "bg-purple-100 text-purple-700 border-purple-200",
  CLOSED_WON: "bg-green-100 text-green-700 border-green-200",
  CLOSED_LOST: "bg-gray-100 text-gray-700 border-gray-200",
  RECURRING: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

const statusLabels: Record<InquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  DEPOSIT: "Deposit",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
  RECURRING: "Recurring",
};

const sourceColors: Record<InquirySource, string> = {
  WHATSAPP: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  EMAIL: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CHATBOT:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  JCT_STOCK_INQUIRY:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  STOCK_INQUIRY:
    "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  ONBOARDING_FORM:
    "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  HERO_INQUIRY: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  INQUIRY_FORM: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  WEB: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", // Legacy support
  CONTACT_US_INQUIRY_FORM:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200", // Legacy support
};

const sourceLabels: Record<InquirySource, string> = {
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  CHATBOT: "Chatbot",
  JCT_STOCK_INQUIRY: "JCT Stock Inquiry",
  STOCK_INQUIRY: "Stock Inquiry",
  ONBOARDING_FORM: "Onboarding Form",
  HERO_INQUIRY: "Hero Section Inquiry",
  INQUIRY_FORM: "Contact Form Inquiry",
  WEB: "Web", // Legacy support
  CONTACT_US_INQUIRY_FORM: "Contact Us Inquiry Form", // Legacy support
};

export function InquiryCard({
  inquiry,
  onAssign,
  onAssignTo,
  onRelease,
  onView,
  onNotes,
  onDelete,
  showAssignButton = false,
  showAssignToButton = false,
  showReleaseButton = false,
  showNotesButton = false,
  showCopyFieldIcons = false,
  showDeleteButton = false,
  currentUserId,
  currentUserEmail,
  isManager = false,
  isAdmin = false,
  hideSourceBadge = false,
  hideStatusBadge = false,
  dragHandleProps,
  isInFunnel = false,
}: InquiryCardProps) {
  const canDelete = currentUserEmail === "avi@zervtek.com";
  const metadata = (inquiry.metadata as any) || {};
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyField = async (e: React.MouseEvent, text: string, fieldId: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(fieldId);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // fallback for older browsers
      document.execCommand("copy");
    }
  };
  const CopyIcon = ({ text, fieldId }: { text: string; fieldId: string }) => {
    if (!showCopyFieldIcons || !text?.trim()) return null;
    return (
      <button
        type="button"
        onClick={(e) => handleCopyField(e, text, fieldId)}
        className="ml-0.5 inline-flex shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-[#2C2C2C] text-gray-400 dark:text-[#A1A1A1] hover:text-gray-600 dark:hover:text-white transition-colors overflow-visible"
        title="Copy"
        aria-label="Copy to clipboard"
      >
        <span
          className="material-symbols-outlined select-none block leading-none"
          style={{ fontSize: 12 }}
        >
          {copiedId === fieldId ? "check" : "content_copy"}
        </span>
      </button>
    );
  };
  const lookingFor = metadata.lookingFor || null;
  const country = metadata.country || null;
  const notes = metadata.notes || "";
  const hasNotes = notes && notes.trim().length > 0;
  const previouslyTriedBy = metadata.previouslyTriedBy || null;
  
  // Message expansion state
  const [isMessageExpanded, setIsMessageExpanded] = useState(false);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  
  // Check if message is long enough to need truncation
  const messageLength = inquiry.message?.length || 0;
  const shouldTruncate = messageLength > 100; // Approximate 2 lines

  // Determine if card should be clickable (assigned or admin)
  const isClickable = inquiry.assignedToId !== null || isAdmin;

  // Determine if contact info should be visible
  // Only show if:
  // 1. Assigned to current user (they assigned it to themselves)
  // 2. AND it's in the funnel (kanban board)
  const isAssignedToCurrentUser = inquiry.assignedToId === currentUserId;
  const showContactInfo = isInFunnel && isAssignedToCurrentUser;

  // Check if inquiry is CLOSED_WON - show minimal info
  const isClosedWon = inquiry.status === InquiryStatus.CLOSED_WON;
  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name
        .split(" ")
        .filter((n) => n.length > 0)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email && email.length > 0 ? email[0].toUpperCase() : "?";
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on a button or interactive element
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest('[role="button"]')
    ) {
      return;
    }
    if (isClickable && onView) {
      onView(inquiry.id);
    }
  };

  return (
    <Card
      onClick={handleCardClick}
      onMouseDown={(e) => {
        // Allow drag to work, but also allow clicks
        if (dragHandleProps && !(e.target as HTMLElement).closest("button")) {
          // Let drag handle handle it
        }
      }}
      className={`bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#2C2C2C] transition-all group h-full flex flex-col ${
        isClickable
          ? "hover:border-gray-300 dark:hover:border-[#49454F] hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-black/20 cursor-pointer"
          : dragHandleProps
            ? "cursor-grab"
            : "opacity-75"
      }`}
    >
      <CardContent className="p-3 flex flex-col flex-1 min-h-0">
        {/* Header Section */}
        <div className="flex flex-col space-y-3 flex-shrink-0">
          {/* Badges + Title Row */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {!hideStatusBadge && (
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded border ${
                    statusColors[inquiry.status]
                  }`}
                >
                  {statusLabels[inquiry.status]}
                </span>
              )}
              {!hideSourceBadge && (
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    sourceColors[inquiry.source]
                  }`}
                >
                  {sourceLabels[inquiry.source]}
                </span>
              )}
              {previouslyTriedBy && (
                <span className="text-xs font-medium px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700">
                  Previously tried: {previouslyTriedBy.userName}
                </span>
              )}
            </div>
            <h3
              className={`font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 leading-snug flex-1 ${
                isClickable ? "cursor-pointer" : "cursor-not-allowed"
              }`}
            >
              <span className="inline-flex items-center gap-1">
                {inquiry.customerName ||
                  (showContactInfo ? inquiry.email : "Unknown Customer") ||
                  "Unknown Customer"}
                <CopyIcon
                  text={
                    inquiry.customerName || (showContactInfo && inquiry.email) || ""
                  }
                  fieldId="name"
                />
              </span>
            </h3>
          </div>
        </div>

        {/* Content Section */}
        {!isClosedWon ? (
          <div className="flex flex-col space-y-2.5 flex-1 min-h-[60px] mt-1">
            {/* Country */}
            {country && (
              <div className="text-xs text-gray-600 dark:text-[#A1A1A1] flex items-center gap-1">
                <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">
                  Country:
                </span>{" "}
                <span>{country}</span>
                <CopyIcon text={country} fieldId="country" />
              </div>
            )}

            {/* Description */}
            {lookingFor && (
              <div className="text-xs text-gray-600 dark:text-[#A1A1A1] flex items-start gap-1">
                <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">
                  Looking for:
                </span>{" "}
                <span className="line-clamp-2 leading-tight flex-1">{lookingFor}</span>
                <CopyIcon text={lookingFor} fieldId="lookingFor" />
              </div>
            )}

            {inquiry.message && (
              <div className="text-xs text-gray-600 dark:text-[#A1A1A1]">
                <span className="font-medium text-gray-700 dark:text-[#D0D0D0]">
                  Message:
                </span>{" "}
                <div className="mt-0.5 flex items-start gap-1">
                  <span
                    className={`leading-tight flex-1 ${
                      shouldTruncate && !isMessageExpanded
                        ? "line-clamp-2"
                        : ""
                    }`}
                  >
                    {inquiry.message}
                  </span>
                  <CopyIcon text={inquiry.message} fieldId="message" />
                  {shouldTruncate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMessageDialog(true);
                      }}
                      className="ml-1 text-blue-600 dark:text-blue-400 hover:underline font-medium text-xs"
                    >
                      Read more
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Contact Info - Only show if assigned or admin */}
            {showContactInfo && (inquiry.email || inquiry.phone) && (
              <div className="space-y-1.5 text-xs text-gray-600 dark:text-[#A1A1A1] pt-2 mt-2 border-t border-gray-100 dark:border-[#2C2C2C]">
                {inquiry.email && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm flex-shrink-0">
                      email
                    </span>
                    <span className="line-clamp-1 flex-1">{inquiry.email}</span>
                    <CopyIcon text={inquiry.email} fieldId="email" />
                  </div>
                )}
                {inquiry.phone && (
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm flex-shrink-0">
                      phone
                    </span>
                    <span className="flex-1">{inquiry.phone}</span>
                    <CopyIcon text={inquiry.phone} fieldId="phone" />
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col space-y-1 flex-1 min-h-[20px] mt-1">
            {/* Minimal info for CLOSED_WON */}
            <div className="text-xs text-gray-500 dark:text-[#A1A1A1] italic">
              Closed Won
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 mt-auto border-t border-gray-100 dark:border-[#2C2C2C] flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {inquiry.assignedTo ? (
              inquiry.assignedTo.image ? (
                <img
                  src={inquiry.assignedTo.image}
                  alt={inquiry.assignedTo.name || inquiry.assignedTo.email}
                  className="w-5 h-5 rounded-full flex-shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 dark:from-[#D4AF37] dark:to-[#FFD700] flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0">
                  {getInitials(
                    inquiry.assignedTo.name,
                    inquiry.assignedTo.email,
                  )}
                </div>
              )
            ) : (
              <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-[#2C2C2C] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-xs text-gray-400 dark:text-[#A1A1A1]">
                  person
                </span>
              </div>
            )}
            <span className="text-[11px] text-gray-500 dark:text-[#A1A1A1] truncate">
              {format(new Date(inquiry.createdAt), "dd MMM yyyy")}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {showNotesButton && onNotes && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNotes(inquiry.id);
                }}
                className={`flex items-center justify-center p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#2C2C2C] transition-colors ${
                  hasNotes
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-500 dark:text-[#A1A1A1]"
                }`}
                title={hasNotes ? "Edit notes" : "Add notes"}
              >
                <span className="material-symbols-outlined text-base">
                  {hasNotes ? "note" : "note_add"}
                </span>
              </button>
            )}
            {showAssignToButton && onAssignTo && (isManager || isAdmin) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssignTo(inquiry.id);
                }}
                className="h-7 px-2 text-xs flex items-center gap-1 shrink-0"
                title="Assign to a team member"
              >
                <span className="material-symbols-outlined text-sm">
                  person_add
                </span>
                Assign
              </Button>
            )}
            {showReleaseButton && onRelease && inquiry.assignedToId ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRelease(inquiry.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="h-7 px-2 text-xs flex items-center gap-1 shrink-0"
                title="Release to pool"
              >
                <span className="material-symbols-outlined text-sm">
                  person_remove
                </span>
                Release
              </Button>
            ) : null}
            {canDelete && showDeleteButton && onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (
                    confirm(
                      "Are you sure you want to permanently delete this inquiry? This action cannot be undone.",
                    )
                  ) {
                    onDelete(inquiry.id);
                  }
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center justify-center p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                title="Delete inquiry"
              >
                <span className="material-symbols-outlined text-base">
                  delete
                </span>
              </button>
            )}
          </div>
        </div>
      </CardContent>
      
      {/* Message Dialog */}
      <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
          <DialogClose
            onClose={() => setShowMessageDialog(false)}
            className="absolute right-4 top-4 z-10"
          />
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-gray-200 dark:border-[#2C2C2C]">
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Message
            </DialogTitle>
            <DialogDescription className="space-y-2">
              {inquiry.customerName && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-gray-500 dark:text-gray-400">
                    person
                  </span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {inquiry.customerName}
                  </span>
                </div>
              )}
              {/* Only show contact info if assigned to current user and in funnel */}
              {showContactInfo && inquiry.email && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-gray-500 dark:text-gray-400">
                    email
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {inquiry.email}
                  </span>
                </div>
              )}
              {showContactInfo && inquiry.phone && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-gray-500 dark:text-gray-400">
                    phone
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {inquiry.phone}
                  </span>
                </div>
              )}
              {!inquiry.customerName && !inquiry.email && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Unknown Customer
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="bg-gray-50 dark:bg-[#1E1E1E] rounded-lg p-5 border border-gray-200 dark:border-[#2C2C2C]">
              <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                {inquiry.message}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-[#2C2C2C] flex justify-end">
            <Button
              onClick={() => setShowMessageDialog(false)}
              variant="outline"
              className="min-w-[100px]"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
