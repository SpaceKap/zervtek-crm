# Wallet & Deposits System – Testing Guide

## Automated test (balance formula & data)

From the repo root:

```bash
# Create 3 test customers with mixed transactions and assert balances
npm run test:wallet

# Re-run assertions only (no new seed)
npm run test:wallet:only

# Remove test customers (shareToken like "wallet-test-1")
npm run test:wallet:clean
```

**What the script does:**

- **Customer 1:** Deposits (WISE 100k, PayPal 50k, Bank 30k) + one “Payment for Invoice” (80k, does *not* add to balance) − Applied from wallet (40k) − Refund (10k).  
  **Expected balance: ¥130,000.**

- **Customer 2:** Deposits only (WISE 200k, PayPal 100k).  
  **Expected balance: ¥300,000.**

- **Customer 3:** One deposit (150k) − Applied from wallet (120k).  
  **Expected balance: ¥30,000.**

- **E2E flow:** Creates a test customer, adds one deposit (¥80,000), then simulates the CRM applying ¥30,000 from wallet to an invoice. Asserts the customer’s wallet balance is ¥50,000 so the portal correctly reflects the deduction.

Balance rule: **Deposits (INCOMING "Deposit") − all OUTGOING.** Invoice payments (INCOMING with `invoiceId`) do not increase the wallet balance.

---

## Manual security & behaviour checks

### 1. Customer portal – own data only

- Log in as a customer (portal).
- Open **Profile → Wallet**.
- Confirm you see only that customer’s transactions and the correct wallet balance (deposits − applied/refunds).
- Confirm you cannot see or change another customer’s wallet or transactions (no way to switch customer in the UI; APIs are session-scoped).

### 2. Admin – apply from wallet

- In **Financial Operations** (or Transactions), pick an invoice for a customer who has wallet balance.
- Use **Mark payment received** and enter an amount.
- Check **“Apply from customer wallet”** and submit.
- In the **customer portal**, log in as that customer and open **Wallet**.
- Confirm balance decreased by the applied amount and that an OUTGOING “Applied from wallet to Invoice …” appears.

### 3. Admin – wallet balance API

- `GET /api/customers/[id]/wallet-balance` must:
  - Require auth (Admin / Manager / Accountant).
  - Return `{ balance, currency: "JPY" }` for that customer only (same formula as the script and portal).

### 4. Deposit types

- **Wise:** Choose Wise → amount → “Continue to Wise”; confirm a pending deposit is created and redirect goes to Wise with amount.
- **PayPal:** Choose PayPal → amount (≤ 250k) → pay with PayPal; confirm one INCOMING “Deposit” with `depositReceivedAt` set.
- **Bank transfer:** Choose Bank transfer → amount + reference or screenshot → submit; confirm one INCOMING “Deposit” (pending until staff marks received).

Running the automated test plus these manual checks covers balance correctness, deduction behaviour, and basic security.
