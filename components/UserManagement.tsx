"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserRole } from "@prisma/client";
import { User, Shield, Users } from "lucide-react";
import { useStandalonePwa } from "@/hooks/useStandalonePwa";
import { cn } from "@/lib/utils";

interface UserData {
  id: string
  email: string
  name: string | null
  role: UserRole
  image: string | null
  createdAt: Date
  _count: {
    assignedInquiries: number
  }
}

export function UserManagement() {
  const isPwa = useStandalonePwa();
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/users")
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdating(userId)
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        await fetchUsers()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to update role")
      }
    } catch (error) {
      console.error("Error updating role:", error)
      alert("Failed to update role")
    } finally {
      setUpdating(null)
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="w-4 h-4" />
      case "MANAGER":
        return <Users className="w-4 h-4" />
      default:
        return <User className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-700 border-red-200"
      case "MANAGER":
        return "bg-blue-100 text-blue-700 border-blue-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  const getInitials = (name: string | null | undefined, email: string) => {
    if (name) {
      return name
        .split(" ")
        .filter((n) => n.length > 0)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email && email.length > 0 ? email[0].toUpperCase() : "?"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading users...</p>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className={cn(isPwa && "space-y-1 pb-3")}>
        <CardTitle>Team Members</CardTitle>
        <CardDescription>
          Assign roles to manage access and permissions
        </CardDescription>
      </CardHeader>
      <CardContent className={cn(isPwa && "px-3 sm:px-6")}>
        <div className={cn("space-y-4", isPwa && "space-y-3")}>
          {users.map((user) => (
            <div
              key={user.id}
              className={cn(
                "rounded-lg border border-gray-200 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/40",
                isPwa ? "p-3" : "flex items-center justify-between p-4",
              )}
            >
              <div
                className={cn(
                  "flex-1 min-w-0",
                  isPwa
                    ? "flex flex-col gap-3"
                    : "flex items-center gap-4",
                )}
              >
                <div
                  className={cn(
                    "flex min-w-0 flex-1 gap-3",
                    isPwa ? "items-start" : "items-center gap-4",
                  )}
                >
                  {user.image ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={user.image}
                      alt={user.name || user.email || "User avatar"}
                      className="h-10 w-10 shrink-0 rounded-full"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 font-medium text-white">
                      {getInitials(user.name, user.email)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "flex gap-2",
                        isPwa ? "flex-col items-start" : "items-center",
                      )}
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {user.name || user.email}
                      </p>
                      <span
                        className={`inline-flex w-fit items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${getRoleColor(
                          user.role,
                        )}`}
                      >
                        {getRoleIcon(user.role)}
                        {user.role}
                      </span>
                    </div>
                    <p className="break-all text-sm text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {user._count.assignedInquiries} assigned inquiries
                    </p>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-2",
                    isPwa ? "w-full flex-col items-stretch sm:flex-row sm:items-center" : "gap-3",
                  )}
                >
                  <label
                    className={cn(
                      "font-medium text-gray-700 dark:text-gray-300",
                      isPwa ? "sr-only" : "text-sm",
                    )}
                  >
                    Role
                  </label>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value as UserRole)
                      }
                      disabled={updating === user.id}
                      className={cn(
                        "flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        isPwa ? "min-h-[44px] w-full" : "w-40",
                      )}
                      aria-label={`Role for ${user.name || user.email}`}
                    >
                      <option value="SALES">Sales</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    {updating === user.id && (
                      <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-b-2 border-gray-900 dark:border-gray-100" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
