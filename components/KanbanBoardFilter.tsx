"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

interface User {
  id: string
  name: string | null
  email: string
}

interface KanbanBoardFilterProps {
  currentUserId: string
  users: User[]
}

export function KanbanBoardFilter({ currentUserId, users }: KanbanBoardFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [currentFilter, setCurrentFilter] = useState<string>("all")

  useEffect(() => {
    const userId = searchParams.get("userId")
    setCurrentFilter(userId || "all")
  }, [searchParams])

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === "all") {
      params.delete("userId")
    } else if (value === "me") {
      params.set("userId", "me")
    } else {
      params.set("userId", value)
    }
    router.push(`/dashboard/kanban?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-[#A1A1A1]">View:</label>
      <select
        value={currentFilter}
        onChange={(e) => handleFilterChange(e.target.value)}
        className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
      >
        <option value="all">All Inquiries</option>
        <option value="me">My Inquiries</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name || user.email}
          </option>
        ))}
      </select>
    </div>
  )
}
