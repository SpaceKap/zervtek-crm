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
        PROPOSAL_SENT: 0,
        NEGOTIATION: 0,
        CLOSED_WON: 0,
        CLOSED_LOST: 0,
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
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
          analytics
        </span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Statistics
          </h1>
          <p className="text-muted-foreground">
            Performance metrics and transaction history
          </p>
        </div>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList>
          <TabsTrigger value="sales">Sales Statistics</TabsTrigger>
          {canViewTransactions && (
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          )}
          <TabsTrigger value="failed-leads">Failed Leads</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" className="mt-6 space-y-6">
          {/* Aggregate Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-[#A1A1A1]">
                  Total Staff
                </CardTitle>
                <span className="material-symbols-outlined text-2xl text-blue-500 dark:text-[#D4AF37]">
                  groups
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {aggregateStats.totalStaff}
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-[#A1A1A1]">
                  Total Inquiries
                </CardTitle>
                <span className="material-symbols-outlined text-2xl text-purple-500 dark:text-[#D4AF37]">
                  inbox
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {aggregateStats.totalInquiries}
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-[#A1A1A1]">
                  Total Converted
                </CardTitle>
                <span className="material-symbols-outlined text-2xl text-green-500 dark:text-green-400">
                  check_circle
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {aggregateStats.totalConverted}
                </div>
              </CardContent>
            </Card>
            <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-[#A1A1A1]">
                  Overall Conversion Rate
                </CardTitle>
                <span className="material-symbols-outlined text-2xl text-orange-500 dark:text-orange-400">
                  trending_up
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {aggregateConversionRate}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Individual Staff Stats */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Individual Performance
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {staffStats.map((stats) => (
                <Card
                  key={stats.userId}
                  className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]"
                >
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">
                      {stats.userName || stats.userEmail}
                    </CardTitle>
                    <CardDescription>{stats.userEmail}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stats.totalInquiries}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Active</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {stats.activeInquiries}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Converted
                        </p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {stats.convertedInquiries}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Conversion
                        </p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-[#D4AF37]">
                          {stats.conversionRate}%
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200 dark:border-[#2C2C2C]">
                      <p className="text-sm font-medium text-gray-700 dark:text-[#A1A1A1] mb-2">
                        By Status
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New:</span>
                          <span className="font-medium">
                            {stats.inquiriesByStatus.NEW}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Contacted:
                          </span>
                          <span className="font-medium">
                            {stats.inquiriesByStatus.CONTACTED}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Qualified:
                          </span>
                          <span className="font-medium">
                            {stats.inquiriesByStatus.QUALIFIED}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Proposal:
                          </span>
                          <span className="font-medium">
                            {stats.inquiriesByStatus.PROPOSAL_SENT}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Negotiation:
                          </span>
                          <span className="font-medium">
                            {stats.inquiriesByStatus.NEGOTIATION}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Closed Lost:
                          </span>
                          <span className="font-medium">
                            {stats.inquiriesByStatus.CLOSED_LOST}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {staffStats.length === 0 && (
              <Card className="dark:bg-[#1E1E1E] dark:border-[#2C2C2C]">
                <CardContent className="py-12 text-center">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-[#2C2C2C] mb-4 block">
                    groups
                  </span>
                  <p className="text-muted-foreground">No sales staff found</p>
                </CardContent>
              </Card>
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
