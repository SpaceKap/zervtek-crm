"use client";

import { useState, useEffect } from "react";
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
  users: User[];
  currentUserId: string;
  showUnassignedOnly: boolean;
}

export function DashboardPageClient({
  isManager,
  isAdmin,
  users,
  currentUserId,
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-primary dark:text-[#D4AF37]">
            inbox
          </span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Pick inquiries from the pool to start working on them
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
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
        users={users}
        showUnassignedOnly={showUnassignedOnly}
        currentUserId={currentUserId}
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
