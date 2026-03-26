"use client";

import { useState, useEffect } from "react";
import { InquiryPool } from "./InquiryPool";
import { DashboardControls } from "./DashboardControls";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface DashboardPageClientProps {
  isManager: boolean;
  isAdmin: boolean;
  canAssign: boolean;
  users: User[];
  currentUserId: string;
  currentUserEmail: string;
  showUnassignedOnly: boolean;
}

export function DashboardPageClient({
  isManager,
  isAdmin,
  canAssign,
  users,
  currentUserId,
  currentUserEmail,
  showUnassignedOnly,
}: DashboardPageClientProps) {
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const isPwaStandalone = useStandalonePwa();

  const handleInquiryCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className={cn("space-y-6", isPwaStandalone && "max-sm:space-y-4")}>
      <div
        className={cn(
          "flex gap-4",
          isPwaStandalone
            ? "flex-col items-stretch sm:flex-row sm:items-start sm:justify-between"
            : "flex-wrap items-center justify-between",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              "material-symbols-outlined shrink-0 text-primary dark:text-[#D4AF37]",
              isPwaStandalone ? "text-3xl sm:text-4xl" : "text-4xl",
            )}
          >
            inbox
          </span>
          <div className="min-w-0">
            <h1
              className={cn(
                "font-bold text-gray-900 dark:text-white",
                isPwaStandalone ? "text-2xl sm:text-3xl" : "text-3xl",
              )}
            >
              Dashboard
            </h1>
            <p
              className={cn(
                "text-muted-foreground",
                isPwaStandalone && "text-sm sm:text-base",
              )}
            >
              Pick inquiries from the pool to start working on them
            </p>
          </div>
        </div>
        <div className={cn(isPwaStandalone ? "w-full min-w-0 sm:w-auto" : "flex-shrink-0")}>
          <DashboardControls
            isManager={isManager}
            users={users}
            filterUserId={filterUserId}
            filterSource={filterSource}
            filterStatus={filterStatus}
            onFilterUserIdChange={setFilterUserId}
            onFilterSourceChange={setFilterSource}
            onFilterStatusChange={setFilterStatus}
            onRefresh={() => setRefreshKey((prev) => prev + 1)}
            onDialogOpenChange={setDialogOpen}
            dialogOpen={dialogOpen}
            onInquiryCreated={handleInquiryCreated}
          />
        </div>
      </div>
      <InquiryPool
        key={refreshKey}
        isManager={isManager}
        isAdmin={isAdmin}
        canAssign={canAssign}
        users={users}
        showUnassignedOnly={showUnassignedOnly}
        currentUserId={currentUserId}
        currentUserEmail={currentUserEmail}
        hideControls={true}
        filterUserId={filterUserId}
        filterSource={filterSource}
        filterStatus={filterStatus}
        onFilterUserIdChange={setFilterUserId}
        onFilterSourceChange={setFilterSource}
        onFilterStatusChange={setFilterStatus}
      />
    </div>
  );
}
