"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface AssignToDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiryId: string;
  users: User[];
  onSuccess?: () => void;
}

export function AssignToDialog({
  open,
  onOpenChange,
  inquiryId,
  users,
  onSuccess,
}: AssignToDialogProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const salesUsers = users.filter((u) => u.id); // All users for now; could filter by role if available

  const handleAssign = async () => {
    if (!selectedUserId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/inquiries/${inquiryId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignToId: selectedUserId }),
      });
      if (response.ok) {
        onSuccess?.();
        onOpenChange(false);
        setSelectedUserId("");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to assign inquiry");
      }
    } catch (error) {
      console.error("Error assigning:", error);
      alert("Failed to assign inquiry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">
              person_add
            </span>
            Assign to Sales Staff
          </DialogTitle>
          <DialogDescription>
            Select a team member (sales staff, managers, or admins) to assign this inquiry to
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select
            value={selectedUserId}
            onValueChange={setSelectedUserId}
            disabled={loading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select team member..." />
            </SelectTrigger>
            <SelectContent>
              {salesUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name || user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedUserId || loading}
            className="flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            {loading ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
