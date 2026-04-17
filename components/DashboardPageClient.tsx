"use client";

import { useState } from "react";
import { InquiryPool } from "./InquiryPool";
import { DashboardControls } from "./DashboardControls";
interface User {
  id: string;
  name: string | null;
  email: string;
}

interface DashboardPageClientProps {
  isManager: boolean;
  isAdmin: boolean;
  canAssign: boolean;
  canAssignOnCreate: boolean;
  users: User[];
  currentUserId: string;
  currentUserEmail: string;
  showUnassignedOnly: boolean;
}

export function DashboardPageClient({
  isManager,
  isAdmin,
  canAssign,
  canAssignOnCreate,
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

  const handleInquiryCreated = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="material-symbols-outlined shrink-0 text-3xl text-primary dark:text-[#D4AF37] sm:text-4xl">
            inbox
          </span>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Dashboard
          </h1>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DashboardControls
            isManager={isManager}
            canAssignOnCreate={canAssignOnCreate}
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
