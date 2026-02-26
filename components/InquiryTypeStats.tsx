"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { InquirySource, InquiryStatus } from "@prisma/client";

interface SourceEnhanced {
  source: string;
  total: number;
  won: number;
  conversionRate: number;
}

interface CountryStat {
  country: string;
  total: number;
  won: number;
  conversionRate: number;
}

interface InquiryTypeStatsData {
  bySource: Record<InquirySource, number>;
  byStatus: {
    won: number;
    lost: number;
    other: number;
  };
  total: number;
  averageResponseTime?: number;
  newLeadsCount7d?: number;
  newLeadsCount30d?: number;
  unassignedCount?: number;
  bySourceEnhanced?: SourceEnhanced[];
  bestSource?: string | null;
  worstSource?: string | null;
  winCount?: number;
  lossCount?: number;
  winRate?: number;
  lossRate?: number;
  failedLeadCount?: number;
  failedLeadRate?: number;
  secondAttemptFailureCount?: number;
  avgTimeToFirstContactHours?: number | null;
  pctContactedWithin24h?: number | null;
  avgTimeToCloseWonDays?: number | null;
  funnel?: Record<string, number>;
  byCountry?: CountryStat[];
}

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

const sourceColors: Record<InquirySource, string> = {
  WHATSAPP: "bg-green-500",
  EMAIL: "bg-blue-500",
  CHATBOT: "bg-orange-500",
  JCT_STOCK_INQUIRY: "bg-amber-500",
  STOCK_INQUIRY: "bg-amber-400",
  ONBOARDING_FORM: "bg-teal-500",
  HERO_INQUIRY: "bg-pink-500",
  INQUIRY_FORM: "bg-cyan-500",
  WEB: "bg-purple-500", // Legacy support
  CONTACT_US_INQUIRY_FORM: "bg-indigo-500", // Legacy support
};

const funnelOrder: InquiryStatus[] = [
  InquiryStatus.NEW,
  InquiryStatus.CONTACTED,
  InquiryStatus.QUALIFIED,
  InquiryStatus.DEPOSIT,
  InquiryStatus.CLOSED_WON,
  InquiryStatus.CLOSED_LOST,
  InquiryStatus.RECURRING,
];

const funnelLabels: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  DEPOSIT: "Deposit",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
  RECURRING: "Recurring",
};

export function InquiryTypeStats() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<InquiryTypeStatsData | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const response = await fetch(`/api/stats/inquiries?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching inquiry stats:", error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleFilter = () => {
    fetchStats();
  };

  const handleReset = () => {
    setStartDate("");
    setEndDate("");
    setTimeout(() => fetchStats(), 100);
  };

  if (!stats) {
    return (
      <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxSourceCount = Math.max(...Object.values(stats.bySource), 1);
  const winRate =
    stats.winRate ?? (stats.total > 0 ? (stats.byStatus.won / stats.total) * 100 : 0);
  const lossRate =
    stats.lossRate ?? (stats.total > 0 ? (stats.byStatus.lost / stats.total) * 100 : 0);
  const otherRate =
    stats.total > 0 ? (stats.byStatus.other / stats.total) * 100 : 0;

  // Sort sources by count for better visualization
  const sortedSources = Object.entries(stats.bySource)
    .map(([source, count]) => ({
      source: source as InquirySource,
      count,
      percentage: maxSourceCount > 0 ? (count / maxSourceCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Date Range Filter - Compact Design */}
      <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Date Range Filter
              </CardTitle>
              <CardDescription className="mt-1">
                Filter statistics by specific time period
              </CardDescription>
            </div>
            {(startDate || endDate) && (
              <Button
                onClick={handleReset}
                variant="outline"
                size="sm"
                disabled={loading}
                className="text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-[#A1A1A1] mb-1.5 block">
                Start Date
              </label>
              <DatePicker
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full h-9"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-[#A1A1A1] mb-1.5 block">
                End Date
              </label>
              <DatePicker
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleFilter}
                disabled={loading}
                className="h-9 px-6"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span>
                    Loading...
                  </span>
                ) : (
                  "Apply"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead quality & volume */}
      {(stats.newLeadsCount7d != null ||
        stats.unassignedCount != null ||
        stats.failedLeadCount != null) && (
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Lead Volume & Quality
            </CardTitle>
            <CardDescription className="mt-1">
              New leads and pipeline health (date filter applies where relevant)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {stats.newLeadsCount7d != null && (
                <div className="rounded-lg border border-gray-200 dark:border-[#2C2C2C] p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                    New leads (7d)
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.newLeadsCount7d.toLocaleString()}
                  </p>
                </div>
              )}
              {stats.newLeadsCount30d != null && (
                <div className="rounded-lg border border-gray-200 dark:border-[#2C2C2C] p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                    New leads (30d)
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.newLeadsCount30d.toLocaleString()}
                  </p>
                </div>
              )}
              {stats.unassignedCount != null && (
                <div className="rounded-lg border border-gray-200 dark:border-[#2C2C2C] p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                    Unassigned
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.unassignedCount.toLocaleString()}
                  </p>
                </div>
              )}
              {stats.failedLeadCount != null && (
                <div className="rounded-lg border border-gray-200 dark:border-[#2C2C2C] p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                    Failed leads
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.failedLeadCount}
                    {stats.failedLeadRate != null && (
                      <span className="text-sm font-normal text-gray-500 dark:text-[#A1A1A1] ml-1">
                        ({stats.failedLeadRate}%)
                      </span>
                    )}
                  </p>
                </div>
              )}
              {stats.secondAttemptFailureCount != null && (
                <div className="rounded-lg border border-gray-200 dark:border-[#2C2C2C] p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                    2nd attempt failures
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.secondAttemptFailureCount.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Time metrics */}
      {(stats.avgTimeToFirstContactHours != null ||
        stats.pctContactedWithin24h != null ||
        stats.avgTimeToCloseWonDays != null) && (
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Time Metrics
            </CardTitle>
            <CardDescription className="mt-1">
              First contact and time to close (won)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.avgTimeToFirstContactHours != null && (
                <div className="rounded-lg border border-gray-200 dark:border-[#2C2C2C] p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                    Avg time to first contact
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.avgTimeToFirstContactHours.toFixed(1)}h
                  </p>
                </div>
              )}
              {stats.pctContactedWithin24h != null && (
                <div className="rounded-lg border border-gray-200 dark:border-[#2C2C2C] p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                    Contacted within 24h
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.pctContactedWithin24h.toFixed(1)}%
                  </p>
                </div>
              )}
              {stats.avgTimeToCloseWonDays != null && (
                <div className="rounded-lg border border-gray-200 dark:border-[#2C2C2C] p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                    Avg time to close (won)
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stats.avgTimeToCloseWonDays.toFixed(1)} days
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Overview Cards - Enhanced Design */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#A1A1A1]">
                Closed Won
              </CardTitle>
              <span className="material-symbols-outlined text-xl text-green-500 dark:text-green-400">
                check_circle
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.byStatus.won}
                </span>
                <span className="text-sm text-gray-500 dark:text-[#A1A1A1]">
                  inquiries
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-[#A1A1A1]">
                    {winRate.toFixed(1)}% of total
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-[#2C2C2C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${winRate}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#A1A1A1]">
                Closed Lost
              </CardTitle>
              <span className="material-symbols-outlined text-xl text-red-500 dark:text-red-400">
                cancel
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.byStatus.lost}
                </span>
                <span className="text-sm text-gray-500 dark:text-[#A1A1A1]">
                  inquiries
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-[#A1A1A1]">
                    {lossRate.toFixed(1)}% of total
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-[#2C2C2C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 dark:bg-red-400 rounded-full transition-all duration-500"
                    style={{ width: `${lossRate}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#A1A1A1]">
                In Progress
              </CardTitle>
              <span className="material-symbols-outlined text-xl text-blue-500 dark:text-blue-400">
                pending
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.byStatus.other}
                </span>
                <span className="text-sm text-gray-500 dark:text-[#A1A1A1]">
                  inquiries
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-[#A1A1A1]">
                    {otherRate.toFixed(1)}% of total
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-[#2C2C2C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${otherRate}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inquiry Sources Visualization */}
      <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Inquiry Sources Breakdown
              </CardTitle>
              <CardDescription className="mt-1">
                Distribution of inquiries by source type • Total: {stats.total}
                {stats.bestSource != null && stats.worstSource != null && (
                  <span className="block mt-1 text-xs">
                    Best conversion: {sourceLabels[stats.bestSource as InquirySource] ?? stats.bestSource} • Worst: {sourceLabels[stats.worstSource as InquirySource] ?? stats.worstSource}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedSources.map(({ source, count, percentage }) => {
              if (count === 0) return null;
              return (
                <div key={source} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${sourceColors[source]}`}
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-[#D0D0D0]">
                        {sourceLabels[source]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {count}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-[#A1A1A1] w-12 text-right">
                        {stats.total > 0
                          ? ((count / stats.total) * 100).toFixed(1)
                          : 0}
                        %
                      </span>
                      {stats.bySourceEnhanced && (() => {
                        const enh = stats.bySourceEnhanced.find((e) => e.source === source);
                        return enh ? (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            {enh.conversionRate.toFixed(1)}% conv.
                          </span>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-[#2C2C2C] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${sourceColors[source]} rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {sortedSources.every((s) => s.count === 0) && (
              <div className="py-8 text-center text-gray-500 dark:text-[#A1A1A1]">
                <span className="material-symbols-outlined text-4xl mb-2 block">
                  bar_chart
                </span>
                <p className="text-sm">No inquiry data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
              Win Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-green-600 dark:text-green-400">
                {winRate.toFixed(1)}
              </span>
              <span className="text-xl text-gray-500 dark:text-[#A1A1A1]">
                %
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-[#A1A1A1] mt-2">
              {stats.byStatus.won} out of {stats.total} inquiries closed
              successfully
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
              Loss Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-red-600 dark:text-red-400">
                {lossRate.toFixed(1)}
              </span>
              <span className="text-xl text-gray-500 dark:text-[#A1A1A1]">
                %
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-[#A1A1A1] mt-2">
              {stats.byStatus.lost} out of {stats.total} inquiries were lost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline funnel */}
      {stats.funnel && Object.keys(stats.funnel).length > 0 && (
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Pipeline Funnel
            </CardTitle>
            <CardDescription className="mt-1">
              Inquiries by stage (filtered by date range)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {funnelOrder.map((status) => {
                const count = stats.funnel![status] ?? 0;
                if (count === 0 && stats.total === 0) return null;
                return (
                  <div
                    key={status}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-[#2C2C2C] px-4 py-2"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-[#D0D0D0]">
                      {funnelLabels[status] ?? status}
                    </span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {count.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats by country (Other = no/unidentifiable country) */}
      {stats.byCountry && stats.byCountry.length > 0 && (
        <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              Stats by Country
            </CardTitle>
            <CardDescription className="mt-1">
              Lead volume and conversion by country • &quot;Other&quot; = no or unidentifiable country
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#2C2C2C]">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700 dark:text-[#D0D0D0]">
                      Country
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-[#D0D0D0]">
                      Total
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-[#D0D0D0]">
                      Won
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-gray-700 dark:text-[#D0D0D0]">
                      Conversion %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.byCountry.map((row) => (
                    <tr
                      key={row.country}
                      className="border-b border-gray-100 dark:border-[#2C2C2C]/80"
                    >
                      <td className="py-2.5 px-2 font-medium text-gray-900 dark:text-white">
                        {row.country}
                      </td>
                      <td className="py-2.5 px-2 text-right text-gray-900 dark:text-white">
                        {row.total.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right text-gray-900 dark:text-white">
                        {row.won.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right text-green-600 dark:text-green-400 font-medium">
                        {row.conversionRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
