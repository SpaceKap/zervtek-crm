/**
 * PayPal Invoicing API v2 helpers.
 * Env: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_SANDBOX=true (optional, default false for production)
 */

const PAYPAL_API_BASE =
  process.env.PAYPAL_SANDBOX === "true"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com"

const PAYPAL_VIEW_BASE =
  process.env.PAYPAL_SANDBOX === "true"
    ? "https://www.sandbox.paypal.com"
    : "https://www.paypal.com"

export function getPayPalPayerViewUrl(invoiceId: string): string {
  return `${PAYPAL_VIEW_BASE}/invoice/payerView/details/${invoiceId}`
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET)")
  }
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal OAuth failed: ${res.status} ${err}`)
  }
  const data = await res.json()
  return data.access_token
}

export interface CreatePayPalInvoiceParams {
  amount: number
  currency: string
  recipientEmail: string | null
  recipientName: string
  memo?: string | null
  invoiceNumber?: string
}

/**
 * Create a draft PayPal invoice (single item: Deposit). Returns invoice id.
 * Does not send email; use getPayPalPayerViewUrl(id) to get the payment link.
 */
export async function createPayPalDraftInvoice(
  params: CreatePayPalInvoiceParams
): Promise<{ id: string }> {
  const { amount, currency, recipientEmail, recipientName, memo, invoiceNumber } = params
  const token = await getAccessToken()

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 3)

  const body = {
    detail: {
      invoice_number: invoiceNumber || undefined,
      currency_code: currency,
      note: memo || "Deposit payment",
      payment_term: {
        term_type: "DUE_ON_DATE_SPECIFIED",
        due_date: dueDate.toISOString().split("T")[0],
      },
    },
    primary_recipients: [
      {
        billing_info: {
          name: { given_name: recipientName.split(" ")[0] || recipientName, surname: recipientName.split(" ").slice(1).join(" ") || "" },
          email_address: recipientEmail || undefined,
        },
      },
    ],
    items: [
      {
        name: "Deposit",
        description: memo || "Customer deposit",
        quantity: "1",
        unit_amount: { currency_code: currency, value: amount.toFixed(2) },
      },
    ],
    amount: {
      currency_code: currency,
      value: amount.toFixed(2),
    },
  }

  const res = await fetch(`${PAYPAL_API_BASE}/v2/invoicing/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`PayPal create invoice failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  return { id: data.id }
}
