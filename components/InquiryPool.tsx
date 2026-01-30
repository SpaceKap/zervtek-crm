"use client";

import { useEffect, useState } from "react";
import { InquiryCard } from "./InquiryCard";
import { Button } from "@/components/ui/button";
import { InquirySource, InquiryStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { AddInquiryDialog } from "./AddInquiryDialog";

interface Inquiry {
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
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface InquiryPoolProps {
  userId?: string;
  users?: User[];
  isManager?: boolean;
  isAdmin?: boolean;
  showUnassignedOnly?: boolean;
  currentUserId?: string;
  hideControls?: boolean;
  filterUserId?: string;
  filterSource?: string;
  filterStatus?: string;
  onFilterUserIdChange?: (value: string) => void;
  onFilterSourceChange?: (value: string) => void;
  onFilterStatusChange?: (value: string) => void;
}

export function InquiryPool({
  userId,
  users = [],
  isManager = false,
  isAdmin = false,
  showUnassignedOnly = true,
  currentUserId,
  hideControls = false,
  filterUserId: externalFilterUserId,
  filterSource: externalFilterSource,
  filterStatus: externalFilterStatus,
  onFilterUserIdChange,
  onFilterSourceChange,
  onFilterStatusChange,
}: InquiryPoolProps) {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState<string>(
    externalFilterSource || "all",
  );
  const [filterStatus, setFilterStatus] = useState<string>(
    externalFilterStatus || "all",
  );
  const [filterUserId, setFilterUserId] = useState<string>(
    externalFilterUserId || userId || "all",
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  // Use external filters if provided, otherwise use internal state
  const currentFilterSource =
    externalFilterSource !== undefined ? externalFilterSource : filterSource;
  const currentFilterStatus =
    externalFilterStatus !== undefined ? externalFilterStatus : filterStatus;
  const currentFilterUserId =
    externalFilterUserId !== undefined ? externalFilterUserId : filterUserId;

  // Update internal state when external props change
  useEffect(() => {
    if (externalFilterSource !== undefined)
      setFilterSource(externalFilterSource);
    if (externalFilterStatus !== undefined)
      setFilterStatus(externalFilterStatus);
    if (externalFilterUserId !== undefined)
      setFilterUserId(externalFilterUserId);
  }, [externalFilterSource, externalFilterStatus, externalFilterUserId]);

  // Update filterUserId when userId prop changes
  useEffect(() => {
    if (userId !== undefined && externalFilterUserId === undefined) {
      setFilterUserId(userId || "all");
    }
  }, [userId, externalFilterUserId]);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (currentFilterSource !== "all")
        params.append("source", currentFilterSource);
      if (currentFilterStatus !== "all")
        params.append("status", currentFilterStatus);

      // When showing unassigned inquiries, explicitly request them from API
      if (showUnassignedOnly) {
        params.append("unassignedOnly", "true");
      } else {
        // Only filter by userId when NOT showing unassigned inquiries
        if (isManager && currentFilterUserId !== "all") {
          params.append("userId", currentFilterUserId);
        }
      }

      const response = await fetch(`/api/inquiries?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        console.log(
          "Fetched inquiries:",
          data.length,
          "total",
          "showUnassignedOnly:",
          showUnassignedOnly,
        );
        // When unassignedOnly=true is passed to API, it already filters server-side
        // But we still filter client-side as a safety measure
        if (showUnassignedOnly) {
          // Show ONLY unassigned inquiries (assignedToId is null)
          const unassigned = data.filter((inq: Inquiry) => !inq.assignedToId);
          console.log("Unassigned inquiries after filter:", unassigned.length);
          setInquiries(unassigned);
        } else {
          setInquiries(data);
        }
      } else {
        console.error(
          "Failed to fetch inquiries:",
          response.status,
          response.statusText,
        );
        const errorData = await response.text();
        console.error("Error response:", errorData);
      }
    } catch (error) {
      console.error("Error fetching inquiries:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
    // Refresh every 30 seconds
    const interval = setInterval(fetchInquiries, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilterSource, currentFilterStatus, currentFilterUserId]);

  const handleAssign = async (inquiryId: string) => {
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/assign`, {
        method: "POST",
      });
      if (response.ok) {
        // Remove from pool
        setInquiries(inquiries.filter((inq) => inq.id !== inquiryId));
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to assign inquiry");
      }
    } catch (error) {
      console.error("Error assigning inquiry:", error);
      alert("Failed to assign inquiry");
    }
  };

  const handleRelease = async (inquiryId: string) => {
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/release`, {
        method: "POST",
      });
      if (response.ok) {
        // Refresh the list to show the released inquiry
        fetchInquiries();
        router.refresh();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to release inquiry");
      }
    } catch (error) {
      console.error("Error releasing inquiry:", error);
      alert("Failed to release inquiry");
    }
  };

  const handleView = (inquiryId: string) => {
    router.push(`/dashboard/inquiries/${inquiryId}`);
  };

  if (loading) {
    return <div className="text-center py-8">Loading inquiries...</div>;
  }

  const handleFilterSourceChange = (value: string) => {
    if (onFilterSourceChange) {
      onFilterSourceChange(value);
    } else {
      setFilterSource(value);
    }
  };

  const handleFilterStatusChange = (value: string) => {
    if (onFilterStatusChange) {
      onFilterStatusChange(value);
    } else {
      setFilterStatus(value);
    }
  };

  const handleFilterUserIdChange = (value: string) => {
    if (onFilterUserIdChange) {
      onFilterUserIdChange(value);
    } else {
      setFilterUserId(value);
    }
  };

  return (
    <div className="space-y-4">
      {!hideControls && (
        <>
          <div className="flex items-center gap-4 flex-wrap">
            <Button
              onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add Inquiry
            </Button>
            {isManager && users.length > 0 && (
              <select
                value={currentFilterUserId}
                onChange={(e) => handleFilterUserIdChange(e.target.value)}
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
              value={currentFilterSource}
              onChange={(e) => handleFilterSourceChange(e.target.value)}
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
              value={currentFilterStatus}
              onChange={(e) => handleFilterStatusChange(e.target.value)}
              className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="all">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="PROPOSAL_SENT">Proposal Sent</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="CLOSED_WON">Closed Won</option>
              <option value="CLOSED_LOST">Closed Lost</option>
            </select>
            <Button
              onClick={fetchInquiries}
              variant="outline"
              className="flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              Refresh
            </Button>
          </div>

          <AddInquiryDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            onSuccess={fetchInquiries}
            isManager={isManager}
            users={users}
          />
        </>
      )}

      {inquiries.length === 0 ? (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-[#2C2C2C] mb-4 block">
            inbox
          </span>
          <p className="text-muted-foreground">
            No available inquiries in the pool
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {inquiries.map((inquiry) => (
            <InquiryCard
              key={inquiry.id}
              inquiry={inquiry}
              onAssign={handleAssign}
              onRelease={handleRelease}
              onView={handleView}
              showAssignButton={!inquiry.assignedToId}
              showReleaseButton={!!inquiry.assignedToId}
              currentUserId={currentUserId}
              isManager={isManager}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
