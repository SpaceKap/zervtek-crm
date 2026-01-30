import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canViewAllInquiries } from "@/lib/permissions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { ReleaseInquiryButton } from "@/components/ReleaseInquiryButton";

export default async function InquiryDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const inquiry = await prisma.inquiry.findUnique({
    where: { id: params.id },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      history: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!inquiry) {
    return <div>Inquiry not found</div>;
  }

  // Check permissions
  const canViewAll = canViewAllInquiries(session.user.role);
  if (
    !canViewAll &&
    inquiry.assignedToId !== session.user.id &&
    inquiry.assignedToId !== null
  ) {
    redirect("/dashboard");
  }

  const sourceColors: Record<string, string> = {
    WHATSAPP: "bg-green-100 text-green-800",
    EMAIL: "bg-blue-100 text-blue-800",
    WEB: "bg-purple-100 text-purple-800",
    CHATBOT: "bg-orange-100 text-orange-800",
  };

  const sourceLabels: Record<string, string> = {
    WHATSAPP: "WhatsApp",
    EMAIL: "Email",
    WEB: "Web",
    CHATBOT: "Chatbot",
  };

  const metadata = (inquiry.metadata as any) || {};
  const lookingFor = metadata.lookingFor;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {inquiry.customerName || "Unknown Customer"}
          </h1>
          <p className="text-muted-foreground">Inquiry Details</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/invoices/new?inquiryId=${inquiry.id}`}>
            <Button className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">receipt</span>
              Create Invoice
            </Button>
          </Link>
          {inquiry.assignedToId &&
            (inquiry.assignedToId === session.user.id || canViewAll) && (
              <ReleaseInquiryButton inquiryId={inquiry.id} />
            )}
          <Link href="/dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">
                arrow_back
              </span>
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Source
              </Label>
              <div className="mt-1">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    sourceColors[inquiry.source] || "bg-gray-100 text-gray-800"
                  }`}
                >
                  {sourceLabels[inquiry.source] || inquiry.source}
                </span>
              </div>
            </div>
            {inquiry.email && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Email
                </Label>
                <p className="mt-1">{inquiry.email}</p>
              </div>
            )}
            {inquiry.phone && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Phone
                </Label>
                <p className="mt-1">{inquiry.phone}</p>
              </div>
            )}
            {inquiry.assignedTo && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Assigned To
                </Label>
                <p className="mt-1">
                  {inquiry.assignedTo.name || inquiry.assignedTo.email}
                </p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Status
              </Label>
              <p className="mt-1">{inquiry.status}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Created
              </Label>
              <p className="mt-1">
                {formatDistanceToNow(new Date(inquiry.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inquiry Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {lookingFor && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Looking For
                </Label>
                <p className="mt-1 whitespace-pre-wrap">{lookingFor}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                Message
              </Label>
              {inquiry.message ? (
                <p className="mt-1 whitespace-pre-wrap">{inquiry.message}</p>
              ) : (
                <p className="mt-1 text-muted-foreground">
                  No message provided
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Activity log for this inquiry</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {inquiry.history.length === 0 ? (
              <p className="text-muted-foreground">No history available</p>
            ) : (
              inquiry.history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between border-b pb-4"
                >
                  <div>
                    <p className="font-medium">{entry.action}</p>
                    {entry.previousStatus && entry.newStatus && (
                      <p className="text-sm text-muted-foreground">
                        {entry.previousStatus} → {entry.newStatus}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{entry.user.name || entry.user.email}</p>
                    <p>
                      {formatDistanceToNow(new Date(entry.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Label({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <label className={className}>{children}</label>;
}
