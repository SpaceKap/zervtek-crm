"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";

interface FailedLead {
  id: string;
  source: string;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  assignedAt: string | null;
  currentAssignee: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  previouslyTriedBy: {
    userId: string;
    userName: string;
    triedAt: string;
  } | null;
  failedAt: string;
  attemptCount: number;
}

export function FailedLeadsTab() {
  const [failedLeads, setFailedLeads] = useState<FailedLead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFailedLeads();
  }, []);

  const fetchFailedLeads = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/inquiries/failed-leads");
      if (response.ok) {
        const data = await response.json();
        setFailedLeads(data);
      } else {
        console.error("Failed to fetch failed leads");
      }
    } catch (error) {
      console.error("Error fetching failed leads:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSourceLabel = (source: string) => {
    const sourceLabels: Record<string, string> = {
      hero_inquiry: "Hero Section Inquiry",
      inquiry_form: "Contact Form Inquiry",
    };
    return sourceLabels[source] || source;
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      NEW: "New",
      CONTACTED: "Contacted",
      QUALIFIED: "Qualified",
      DEPOSIT: "Deposit",
      NEGOTIATION: "Negotiation",
      CLOSED_WON: "Closed Won",
      CLOSED_LOST: "Closed Lost",
      RECURRING: "Recurring",
    };
    return statusLabels[status] || status;
  };

  if (loading) {
    return (
      <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading failed leads...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900 dark:text-white">
            Failed Leads
          </CardTitle>
          <CardDescription>
            Inquiries that were tried twice but did not result in a closed won
            status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {failedLeads.length === 0 ? (
            <div className="py-12 text-center">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-[#2C2C2C] mb-4 block">
                cancel
              </span>
              <p className="text-muted-foreground">No failed leads found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#2C2C2C]">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Contact
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Source
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Current Assignee
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Previously Tried By
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Attempts
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Failed At
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {failedLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-gray-100 dark:border-[#2C2C2C]/50 hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {lead.customerName || "Unknown"}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {lead.email && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {lead.email}
                            </p>
                          )}
                          {lead.phone && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {lead.phone}
                            </p>
                          )}
                          {!lead.email && !lead.phone && (
                            <p className="text-sm text-muted-foreground italic">
                              N/A
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {getSourceLabel(lead.source)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-xs font-medium px-2 py-1 rounded border bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600">
                          {getStatusLabel(lead.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {lead.currentAssignee ? (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {lead.currentAssignee.name ||
                              lead.currentAssignee.email}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            Unassigned
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {lead.previouslyTriedBy ? (
                          <div>
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              {lead.previouslyTriedBy.userName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(
                                new Date(lead.previouslyTriedBy.triedAt),
                                "MMM dd, yyyy",
                              )}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">
                            N/A
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {lead.attemptCount}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {format(new Date(lead.failedAt), "MMM dd, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lead.failedAt), "h:mm a")}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {format(new Date(lead.createdAt), "MMM dd, yyyy")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(lead.createdAt), "h:mm a")}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
