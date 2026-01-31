import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { ManagerView } from "@/components/ManagerView";

export default async function ManagerDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  // Only allow ADMIN role
  if (session.user.role !== UserRole.ADMIN) {
    redirect("/dashboard");
  }

  const isAdmin = session.user.role === UserRole.ADMIN;

  // Get all users
  const users = await prisma.user.findMany({
    where: {
      role: "SALES",
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

  // Get statistics
  const totalInquiries = await prisma.inquiry.count();
  const unassignedInquiries = await prisma.inquiry.count({
    where: { assignedToId: null },
  });
  const convertedInquiries = await prisma.inquiry.count({
    where: { status: "CLOSED_WON" },
  });

  // Get inquiries by user
  const inquiriesByUser = await prisma.inquiry.groupBy({
    by: ["assignedToId"],
    _count: {
      id: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of all inquiries, assignments, and team performance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inquiries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInquiries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unassignedInquiries}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{convertedInquiries}</div>
            <p className="text-xs text-muted-foreground">
              {totalInquiries > 0
                ? `${Math.round((convertedInquiries / totalInquiries) * 100)}% conversion rate`
                : "0% conversion rate"}
            </p>
          </CardContent>
        </Card>
      </div>

      <ManagerView
        users={users}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
      />
    </div>
  );
}
