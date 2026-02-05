import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserRole, InquiryStatus } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionsTab } from "@/components/TransactionsTab";
import { FailedLeadsTab } from "@/components/FailedLeadsTab";
import { InquiryTypeStats } from "@/components/InquiryTypeStats";

interface StaffStats {
  userId: string;
  userName: string | null;
  userEmail: string;
  totalInquiries: number;
  activeInquiries: number;
  convertedInquiries: number;
  conversionRate: number;
  inquiriesByStatus: Record<InquiryStatus, number>;
}

const statusLabels: Record<InquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  DEPOSIT: "Deposit",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
  RECURRING: "Recurring",
};

const statusColors: Record<InquiryStatus, string> = {
  NEW: "bg-blue-500",
  CONTACTED: "bg-yellow-500",
  QUALIFIED: "bg-green-500",
  DEPOSIT: "bg-purple-500",
  CLOSED_WON: "bg-emerald-500",
  CLOSED_LOST: "bg-gray-500",
  RECURRING: "bg-cyan-500",
};

export default async function StatsPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // Only managers, admins, and back-office staff can access this page
  if (
    session.user.role !== UserRole.MANAGER &&
    session.user.role !== UserRole.ADMIN &&
    session.user.role !== UserRole.BACK_OFFICE_STAFF
  ) {
    redirect("/dashboard");
  }

  // Transactions tab is only visible to admins and back-office staff
  const canViewTransactions =
    session.user.role === UserRole.ADMIN ||
    session.user.role === UserRole.BACK_OFFICE_STAFF;

  // Get all sales staff
  const salesStaff = await prisma.user.findMany({
    where: {
      role: UserRole.SALES,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  // Calculate stats for each staff member
  const staffStats: StaffStats[] = await Promise.all(
    salesStaff.map(async (staff) => {
      const totalInquiries = await prisma.inquiry.count({
        where: { assignedToId: staff.id },
      });

      const activeInquiries = await prisma.inquiry.count({
        where: {
          assignedToId: staff.id,
          status: {
            not: InquiryStatus.CLOSED_WON,
          },
        },
      });

      const convertedInquiries = await prisma.inquiry.count({
        where: {
          assignedToId: staff.id,
          status: InquiryStatus.CLOSED_WON,
        },
      });

      const conversionRate =
        totalInquiries > 0
          ? Math.round((convertedInquiries / totalInquiries) * 100)
          : 0;

      // Get inquiries by status
      const inquiriesByStatus = await prisma.inquiry.groupBy({
        by: ["status"],
        where: { assignedToId: staff.id },
        _count: { id: true },
      });

      const statusCounts: Record<InquiryStatus, number> = {
        NEW: 0,
        CONTACTED: 0,
        QUALIFIED: 0,
        DEPOSIT: 0,
        CLOSED_WON: 0,
        CLOSED_LOST: 0,
        RECURRING: 0,
      };

      inquiriesByStatus.forEach((item) => {
        statusCounts[item.status] = item._count.id;
      });

      return {
        userId: staff.id,
        userName: staff.name,
        userEmail: staff.email,
        totalInquiries,
        activeInquiries,
        convertedInquiries,
        conversionRate,
        inquiriesByStatus: statusCounts,
      };
    }),
  );

  // Calculate aggregate stats for all sales staff
  const aggregateStats = {
    totalStaff: salesStaff.length,
    totalInquiries: await prisma.inquiry.count({
      where: {
        assignedToId: {
          in: salesStaff.map((s) => s.id),
        },
      },
    }),
    totalActiveInquiries: await prisma.inquiry.count({
      where: {
        assignedToId: {
          in: salesStaff.map((s) => s.id),
        },
        status: {
          not: InquiryStatus.CLOSED_WON,
        },
      },
    }),
    totalConverted: await prisma.inquiry.count({
      where: {
        assignedToId: {
          in: salesStaff.map((s) => s.id),
        },
        status: InquiryStatus.CLOSED_WON,
      },
    }),
  };

  const aggregateConversionRate =
    aggregateStats.totalInquiries > 0
      ? Math.round(
          (aggregateStats.totalConverted / aggregateStats.totalInquiries) * 100,
        )
      : 0;

  return (
    <div className="space-y-8 pb-8">
      {/* Enhanced Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 dark:bg-[#D4AF37]/20">
              <span className="material-symbols-outlined text-3xl text-primary dark:text-[#D4AF37]">
                analytics
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground mt-0.5">
                Comprehensive performance metrics and insights
              </p>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
          <TabsTrigger value="sales" className="text-sm font-medium">
            Sales Performance
          </TabsTrigger>
          {canViewTransactions && (
            <TabsTrigger value="transactions" className="text-sm font-medium">
              Transactions
            </TabsTrigger>
          )}
          <TabsTrigger value="failed-leads" className="text-sm font-medium">
            Failed Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-6 space-y-8">
          {/* Enhanced Aggregate Stats */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#A1A1A1] uppercase tracking-wide">
                    Total Staff
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <span className="material-symbols-outlined text-xl text-blue-600 dark:text-blue-400">
                      groups
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {aggregateStats.totalStaff}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-[#A1A1A1]">
                    members
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#A1A1A1] uppercase tracking-wide">
                    Total Inquiries
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                    <span className="material-symbols-outlined text-xl text-purple-600 dark:text-purple-400">
                      inbox
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {aggregateStats.totalInquiries.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-[#A1A1A1]">
                    inquiries
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-[#A1A1A1] mt-2">
                  {aggregateStats.totalActiveInquiries} active
                </p>
              </CardContent>
            </Card>

            <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-green-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#A1A1A1] uppercase tracking-wide">
                    Converted
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <span className="material-symbols-outlined text-xl text-green-600 dark:text-green-400">
                      check_circle
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {aggregateStats.totalConverted.toLocaleString()}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-[#A1A1A1]">
                    won
                  </span>
                </div>
                <div className="mt-2 h-1.5 bg-gray-200 dark:bg-[#2C2C2C] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 dark:bg-green-400 rounded-full transition-all"
                    style={{
                      width: `${aggregateConversionRate}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-orange-500">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-[#A1A1A1] uppercase tracking-wide">
                    Conversion Rate
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                    <span className="material-symbols-outlined text-xl text-orange-600 dark:text-orange-400">
                      trending_up
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white">
                    {aggregateConversionRate}
                  </span>
                  <span className="text-lg text-gray-500 dark:text-[#A1A1A1]">
                    %
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-[#A1A1A1] mt-2">
                  Overall success rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Inquiry Type Stats */}
          <InquiryTypeStats />

          {/* Enhanced Individual Staff Stats */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Team Performance
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Individual metrics for each team member
                </p>
              </div>
            </div>

            {staffStats.length === 0 ? (
              <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
                <CardContent className="py-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-[#2C2C2C] mb-4">
                    <span className="material-symbols-outlined text-3xl text-gray-400 dark:text-[#49454F]">
                      groups
                    </span>
                  </div>
                  <p className="text-muted-foreground font-medium">
                    No sales staff found
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add team members to start tracking performance
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {staffStats.map((stats) => {
                  const statusEntries = Object.entries(stats.inquiriesByStatus)
                    .filter(([_, count]) => count > 0)
                    .sort((a, b) => b[1] - a[1]);

                  return (
                    <Card
                      key={stats.userId}
                      className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C] shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                              {stats.userName || stats.userEmail.split("@")[0]}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {stats.userEmail}
                            </CardDescription>
                          </div>
                          <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 dark:bg-[#D4AF37]/20">
                            <span className="text-xs font-semibold text-primary dark:text-[#D4AF37]">
                              {stats.conversionRate}%
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {/* Key Metrics Grid */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                              Total
                            </p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {stats.totalInquiries}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                              Active
                            </p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {stats.activeInquiries}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                              Converted
                            </p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {stats.convertedInquiries}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-gray-500 dark:text-[#A1A1A1] uppercase tracking-wide">
                              Rate
                            </p>
                            <p className="text-2xl font-bold text-purple-600 dark:text-[#D4AF37]">
                              {stats.conversionRate}%
                            </p>
                          </div>
                        </div>

                        {/* Conversion Rate Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-[#A1A1A1] font-medium">
                              Conversion Progress
                            </span>
                            <span className="text-gray-900 dark:text-white font-semibold">
                              {stats.conversionRate}%
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-[#2C2C2C] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-500 to-[#D4AF37] rounded-full transition-all duration-500"
                              style={{
                                width: `${stats.conversionRate}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Status Breakdown */}
                        {statusEntries.length > 0 && (
                          <div className="pt-4 border-t border-gray-200 dark:border-[#2C2C2C]">
                            <p className="text-xs font-semibold text-gray-700 dark:text-[#A1A1A1] mb-3 uppercase tracking-wide">
                              Status Distribution
                            </p>
                            <div className="space-y-2.5">
                              {statusEntries
                                .slice(0, 6)
                                .map(([status, count]) => {
                                  const percentage =
                                    stats.totalInquiries > 0
                                      ? (count / stats.totalInquiries) * 100
                                      : 0;
                                  return (
                                    <div key={status} className="space-y-1.5">
                                      <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                          <div
                                            className={`w-2 h-2 rounded-full ${statusColors[status as InquiryStatus]}`}
                                          />
                                          <span className="text-gray-700 dark:text-[#D0D0D0] font-medium">
                                            {
                                              statusLabels[
                                                status as InquiryStatus
                                              ]
                                            }
                                          </span>
                                        </div>
                                        <span className="text-gray-900 dark:text-white font-semibold">
                                          {count}
                                        </span>
                                      </div>
                                      <div className="h-1.5 bg-gray-100 dark:bg-[#2C2C2C] rounded-full overflow-hidden">
                                        <div
                                          className={`h-full ${statusColors[status as InquiryStatus]} rounded-full transition-all duration-500`}
                                          style={{ width: `${percentage}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {canViewTransactions && (
          <TabsContent value="transactions" className="mt-6">
            <TransactionsTab />
          </TabsContent>
        )}

        <TabsContent value="failed-leads" className="mt-6">
          <FailedLeadsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
