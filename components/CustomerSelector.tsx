"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CustomerForm } from "./CustomerForm"

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
}

interface CustomerSelectorProps {
  value: string
  onChange: (customerId: string) => void
}

export function CustomerSelector({ value, onChange }: CustomerSelectorProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState("")
  const [showDialog, setShowDialog] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  useEffect(() => {
    if (value) {
      fetchCustomer(value)
    }
  }, [value])

  useEffect(() => {
    if (search) {
      fetchCustomers(search)
    } else {
      setCustomers([])
    }
  }, [search])

  const fetchCustomer = async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}`)
      if (response.ok) {
        const customer = await response.json()
        setSelectedCustomer(customer)
      }
    } catch (error) {
      console.error("Error fetching customer:", error)
    }
  }

  const fetchCustomers = async (searchTerm: string) => {
    try {
      const response = await fetch(
        `/api/customers?search=${encodeURIComponent(searchTerm)}`
      )
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
    }
  }

  const handleSelect = (customer: Customer) => {
    setSelectedCustomer(customer)
    onChange(customer.id)
    setSearch("")
    setCustomers([])
  }

  const handleCreateNew = () => {
    setShowDialog(true)
  }

  const handleFormClose = () => {
    setShowDialog(false)
    // Refresh search if needed
  }

  return (
    <div className="space-y-2">
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
          <div>
            <div className="font-medium">{selectedCustomer.name}</div>
            <div className="text-sm text-muted-foreground">
              {selectedCustomer.email}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCustomer(null)
              onChange("")
            }}
          >
            Change
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {customers.length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-2 hover:bg-accent cursor-pointer"
                  onClick={() => handleSelect(customer)}
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.email}
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleCreateNew}
            className="w-full"
          >
            <span className="material-symbols-outlined text-lg mr-2">add</span>
            Create New Customer
          </Button>
        </div>
      )}

      {showDialog && (
        <CustomerForm customer={null} onClose={handleFormClose} />
      )}
    </div>
  )
}
