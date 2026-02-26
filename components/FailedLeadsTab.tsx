"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

interface FailedLeadsTabProps {
  users?: Array<{ id: string; name: string | null; email: string }>;
}

export function FailedLeadsTab({ users = [] }: FailedLeadsTabProps) {
  const [failedLeads, setFailedLeads] = useState<FailedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [periodPreset, setPeriodPreset] = useState<string>("all");
  const [previouslyTriedById, setPreviouslyTriedById] = useState<string>("all");

  const fetchFailedLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (previouslyTriedById && previouslyTriedById !== "all") {
        params.set("previouslyTriedById", previouslyTriedById);
      }
      const response = await fetch(`/api/inquiries/failed-leads?${params}`);
      if (response.ok) {
        const data = await response.json();
        setFailedLeads(data);
      }
    } catch (error) {
      console.error("Error fetching failed leads:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, previouslyTriedById]);

  useEffect(() => {
    fetchFailedLeads();
  }, [fetchFailedLeads]);

  useEffect(() => {
    const today = new Date();
    if (periodPreset === "today") {
      const d = format(today, "yyyy-MM-dd");
      setStartDate(d);
      setEndDate(d);
    } else if (periodPreset === "last7") {
      setStartDate(format(subDays(today, 7), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else if (periodPreset === "last30") {
      setStartDate(format(subDays(today, 30), "yyyy-MM-dd"));
      setEndDate(format(today, "yyyy-MM-dd"));
    } else if (periodPreset === "thisMonth") {
      setStartDate(format(startOfMonth(today), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(today), "yyyy-MM-dd"));
    } else if (periodPreset === "lastMonth") {
      const lm = subMonths(today, 1);
      setStartDate(format(startOfMonth(lm), "yyyy-MM-dd"));
      setEndDate(format(endOfMonth(lm), "yyyy-MM-dd"));
    } else {
      setStartDate("");
      setEndDate("");
    }
  }, [periodPreset]);

  const getSourceLabel = (source: string) => {
    const sourceLabels: Record<string, string> = {
      WHATSAPP: "WhatsApp",
      EMAIL: "Email",
      WEB: "Web",
      CHATBOT: "Chatbot",
      JCT_STOCK_INQUIRY: "JCT Stock Inquiry",
      STOCK_INQUIRY: "Stock Inquiry",
      ONBOARDING_FORM: "Onboarding Form",
      CONTACT_US_INQUIRY_FORM: "Contact Us Inquiry Form",
      HERO_INQUIRY: "Hero Section Inquiry",
      INQUIRY_FORM: "Contact Form Inquiry",
      REFERRAL: "Referral",
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

  if (loading && failedLeads.length === 0) {
    return (
      <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Loading failed leads...</p>
        </CardContent>
      </Card>
    );
  }

  // Stats derived from current results (respect filters)
  const totalFailed = failedLeads.length;
  const avgAttempts =
    totalFailed > 0
      ? (
          failedLeads.reduce((sum, l) => sum + (l.attemptCount || 0), 0) /
          totalFailed
        ).toFixed(1)
      : "0";
  const secondAttemptCount = failedLeads.filter(
    (l) => (l.attemptCount || 0) >= 2
  ).length;
  const bySource = failedLeads.reduce<Record<string, number>>((acc, l) => {
    const s = l.source || "Unknown";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const sourceEntries = Object.entries(bySource).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Total failed leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {totalFailed.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              In current filter
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Avg attempts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {avgAttempts}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Before marked failed
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              2nd+ attempt failures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {secondAttemptCount.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Tried more than once
            </p>
          </CardContent>
        </Card>
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] border-l-4 border-l-slate-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Top source
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sourceEntries.length > 0 ? (
              <>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {getSourceLabel(sourceEntries[0][0])}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {sourceEntries[0][1]} lead{sourceEntries[0][1] !== 1 ? "s" : ""}
                </p>
              </>
            ) : (
              <p className="text-lg text-muted-foreground">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* By source breakdown */}
      {sourceEntries.length > 0 && (
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-900 dark:text-white">
              Failed leads by source
            </CardTitle>
            <CardDescription>Count per source in current filter</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {sourceEntries.map(([source, count]) => (
                <div
                  key={source}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[#2C2C2C] px-4 py-2"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {getSourceLabel(source)}
                  </span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900 dark:text-white">
            Failed Leads
          </CardTitle>
          <CardDescription>
            Inquiries moved to trash from the pipeline (archived with full details)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm">Time period</Label>
              <Select value={periodPreset} onValueChange={setPeriodPreset}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="thisMonth">This month</SelectItem>
                  <SelectItem value="lastMonth">Last month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {periodPreset !== "all" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm">From</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">To</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-[140px]"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label className="text-sm">Previously tried by</Label>
              <Select value={previouslyTriedById} onValueChange={setPreviouslyTriedById}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchFailedLeads}>
              Apply
            </Button>
          </div>

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
