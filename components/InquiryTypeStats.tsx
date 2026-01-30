"use client";

import { useState, useEffect } from "react";
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

interface InquiryTypeStatsData {
  bySource: Record<InquirySource, number>;
  byStatus: {
    won: number;
    lost: number;
    other: number;
  };
  total: number;
  averageResponseTime?: number;
}

const sourceLabels: Record<InquirySource, string> = {
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
};

const sourceColors: Record<InquirySource, string> = {
  WHATSAPP: "bg-green-500",
  EMAIL: "bg-blue-500",
  WEB: "bg-purple-500",
  CHATBOT: "bg-orange-500",
  JCT_STOCK_INQUIRY: "bg-amber-500",
  STOCK_INQUIRY: "bg-amber-400",
  ONBOARDING_FORM: "bg-teal-500",
  CONTACT_US_INQUIRY_FORM: "bg-indigo-500",
  HERO_INQUIRY: "bg-pink-500",
  INQUIRY_FORM: "bg-cyan-500",
};

export function InquiryTypeStats() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<InquiryTypeStatsData | null>(null);

  const fetchStats = async () => {
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
  };

  useEffect(() => {
    fetchStats();
  }, []);

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

  // Calculate percentages for visualization
  const maxSourceCount = Math.max(...Object.values(stats.bySource));
  const winRate =
    stats.total > 0 ? (stats.byStatus.won / stats.total) * 100 : 0;
  const lossRate =
    stats.total > 0 ? (stats.byStatus.lost / stats.total) * 100 : 0;
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
    </div>
  );
}
