"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "./KanbanBoard";
import { InquiryPool } from "./InquiryPool";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface ManagerViewProps {
  users: User[];
  currentUserId: string;
  isAdmin?: boolean;
}

export function ManagerView({
  users,
  currentUserId,
  isAdmin = false,
}: ManagerViewProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Overview</CardTitle>
          <CardDescription>
            View inquiries and kanban boards for individual team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium">View User:</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="me">My Inquiries</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="kanban" className="w-full">
            <TabsList>
              <TabsTrigger value="kanban">Pipeline</TabsTrigger>
              <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
            </TabsList>
            <TabsContent value="kanban" className="mt-4">
              <KanbanBoard
                userId={
                  selectedUserId === "all"
                    ? undefined
                    : selectedUserId === "me"
                      ? "me"
                      : selectedUserId
                }
                isManager={true}
                isAdmin={isAdmin}
                users={users}
                currentUserId={currentUserId}
              />
            </TabsContent>
            <TabsContent value="inquiries" className="mt-4">
              <InquiryPool
                isManager={true}
                isAdmin={isAdmin}
                users={users}
                userId={
                  selectedUserId === "all"
                    ? undefined
                    : selectedUserId === "me"
                      ? "me"
                      : selectedUserId
                }
                showUnassignedOnly={false}
                currentUserId={currentUserId}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
