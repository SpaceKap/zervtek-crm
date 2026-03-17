"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
}

const CLIENT_PAY_BASE = process.env.NEXT_PUBLIC_CLIENT_PAY_BASE_URL || "https://clients.zervtek.com"

export function DepositLinkForm() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [customerId, setCustomerId] = useState<string>("")
  const [createNew, setCreateNew] = useState(false)
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [amount, setAmount] = useState("")
  const [memo, setMemo] = useState("")
  const [result, setResult] = useState<{
    link: string
    paypalPaymentUrl: string
    expiresAt: string
    amount: number
    currency: string
    customerName: string
  } | null>(null)

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    if (createNew) {
      if (!newName.trim()) {
        alert("Name is required")
        return
      }
    } else {
      if (!customerId) {
        alert("Select a customer")
        return
      }
    }

    const amountNum = parseFloat(amount.replace(/,/g, ""))
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Enter a valid amount")
      return
    }

    setSubmitting(true)
    setResult(null)
    try {
      const body = createNew
        ? {
            createCustomer: {
              name: newName.trim(),
              email: newEmail.trim() || undefined,
              phone: newPhone.trim() || undefined,
            },
            amount: amountNum,
            currency: "JPY",
            memo: memo.trim() || undefined,
          }
        : {
            customerId,
            amount: amountNum,
            currency: "JPY",
            memo: memo.trim() || undefined,
          }

      const res = await fetch("/api/deposit-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(data.error || "Failed to create link")
        return
      }

      setResult({
        link: data.link,
        paypalPaymentUrl: data.paypalPaymentUrl,
        expiresAt: data.expiresAt,
        amount: data.amount,
        currency: data.currency,
        customerName: data.customerName,
      })
      setAmount("")
      setMemo("")
      if (createNew) {
        setNewName("")
        setNewEmail("")
        setNewPhone("")
      }
    } catch (err) {
      alert("Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    alert("Copied to clipboard")
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading customers...</div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create deposit link</CardTitle>
          <CardDescription>
            Pick a customer or create one, enter the amount. A link valid for 3 days will be generated (clients.zervtek.com).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant={createNew ? "outline" : "default"}
                size="sm"
                onClick={() => setCreateNew(false)}
              >
                Pick customer
              </Button>
              <Button
                type="button"
                variant={createNew ? "default" : "outline"}
                size="sm"
                onClick={() => setCreateNew(true)}
              >
                Create new customer
              </Button>
            </div>

            {createNew ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="newName">Name *</Label>
                  <Input
                    id="newName"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Customer name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newEmail">Email</Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPhone">Phone</Label>
                  <Input
                    id="newPhone"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+1234567890"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={customerId} onValueChange={setCustomerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.email ? ` (${c.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d.]/g, "")
                    setAmount(v === "" ? "" : parseFloat(v) > 0 ? v : e.target.value)
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="memo">Memo (optional)</Label>
                <Input
                  id="memo"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="e.g. Deposit for vehicle XYZ"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating…" : "Create link"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Deposit link created</CardTitle>
            <CardDescription>
              Share this link with the customer. It expires in 3 days. Customer pays via PayPal (no login on our site).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Customer</p>
              <p className="font-medium">{result.customerName}</p>
              <p className="text-sm">
                {result.currency} {result.amount.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                Expires: {new Date(result.expiresAt).toLocaleString()}
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Link (our page)</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.link} className="font-mono text-sm" />
                <Button type="button" variant="outline" onClick={() => copyLink(result.link)}>
                  Copy
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">PayPal payment page (direct)</Label>
              <div className="flex gap-2">
                <Input readOnly value={result.paypalPaymentUrl} className="font-mono text-sm truncate" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => copyLink(result.paypalPaymentUrl)}
                >
                  Copy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
