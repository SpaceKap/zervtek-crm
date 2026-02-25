/**
 * Test script: Wallet / deposits system with multiple customers and transaction types.
 *
 * Verifies:
 * 1. Wallet balance formula: deposits only (INCOMING "Deposit") minus all OUTGOING.
 * 2. Invoice payments (INCOMING with invoiceId) do NOT add to balance.
 * 3. Multiple deposit types (WISE, PAYPAL, BANK_TRANSFER) and apply-from-wallet deductions.
 * 4. Per-customer isolation: balance is computed only from that customer's transactions.
 * 5. E2E: Customer deposit → CRM applies deposit to invoice → portal balance reflects deduction.
 *
 * Run from repo root (uses DATABASE_URL from .env):
 *   npm run test:wallet          # seed + assertions + e2e flow
 *   npm run test:wallet:only      # assertions only (no seed)
 *   npm run test:wallet:clean    # delete test customers (shareToken starts with "wallet-test-")
 *
 * Manual security checks (recommended):
 * - Customer portal: Log in as customer A; confirm wallet page shows only A's transactions and balance.
 * - Customer portal: Try to access another customer's data (e.g. another wallet URL); should 403 or show only own data.
 * - Admin: In Financial Operations, mark payment with "Apply from wallet"; confirm balance decreases in portal for that customer.
 * - Admin: Wallet balance API GET /api/customers/[id]/wallet-balance should require Admin/Manager/Accountant and return only that customer's balance.
 */

import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  TransactionDirection,
  TransactionType,
  PaymentStatus,
  InvoiceStatus,
} from "@prisma/client";

const TEST_PREFIX = "wallet-test-";
const NUM_SCALE_CUSTOMERS = 100;
const DEPOSITS_PER_CUSTOMER = 3;
const INVOICES_PER_CUSTOMER = 2;
const APPLY_FROM_WALLET_PER_CUSTOMER = 1;

function computeWalletBalance(
  transactions: Array<{
    direction: string;
    amount: unknown;
    currency: string | null;
    description: string | null;
  }>
): number {
  return transactions.reduce((sum, tx) => {
    const amt = Number(tx.amount);
    const isJy = (tx.currency || "JPY").toUpperCase() === "JPY";
    if (!isJy) return sum;
    if (tx.direction === "INCOMING") {
      if (tx.description === "Deposit") return sum + amt;
      return sum;
    }
    return sum - amt;
  }, 0);
}

type CustomerExpectation = { id: string; expectedBalance: number };

async function seedTestData(): Promise<CustomerExpectation[]> {
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    throw new Error("No user in DB; create one to run wallet test (needed for invoice createdById).");
  }

  const customers: { id: string; shareToken: string }[] = [];
  for (let i = 1; i <= NUM_SCALE_CUSTOMERS; i++) {
    const shareToken = `${TEST_PREFIX}${i}`;
    const c = await prisma.customer.upsert({
      where: { shareToken },
      update: {},
      create: {
        name: `${TEST_PREFIX}Customer ${i}`,
        email: `${TEST_PREFIX}customer${i}@test.local`,
        shareToken,
      },
      select: { id: true, shareToken: true },
    });
    customers.push(c);
  }

  const customerIds = customers.map((c) => c.id);
  await prisma.transaction.deleteMany({ where: { customerId: { in: customerIds } } });
  await prisma.invoice.deleteMany({ where: { customerId: { in: customerIds } } });

  const expectations: CustomerExpectation[] = [];
  const depositAmounts = [50_000, 100_000, 75_000];
  const applyAmount = 40_000;

  for (let i = 0; i < customers.length; i++) {
    const c = customers[i];
    const totalDeposits = depositAmounts[0] + depositAmounts[1] + depositAmounts[2];
    const expectedBalance = totalDeposits - applyAmount;

    const types: TransactionType[] = [
      TransactionType.WISE,
      TransactionType.PAYPAL,
      TransactionType.BANK_TRANSFER,
    ];
    for (let d = 0; d < DEPOSITS_PER_CUSTOMER; d++) {
      await prisma.transaction.create({
        data: {
          direction: TransactionDirection.INCOMING,
          type: types[d],
          amount: depositAmounts[d],
          currency: "JPY",
          date: new Date(),
          description: "Deposit",
          customerId: c.id,
          depositReceivedAt: new Date(),
        },
      });
    }

    const invoiceNumbers: string[] = [];
    for (let inv = 0; inv < INVOICES_PER_CUSTOMER; inv++) {
      const invNum = `WALLET-TEST-${i + 1}-${inv + 1}-${Date.now()}`;
      invoiceNumbers.push(invNum);
      await prisma.invoice.create({
        data: {
          invoiceNumber: invNum,
          customerId: c.id,
          createdById: user.id,
          status: InvoiceStatus.APPROVED,
          paymentStatus: PaymentStatus.PENDING,
          issueDate: new Date(),
        },
      });
    }

    const invoiceToApply = await prisma.invoice.findFirst({
      where: { invoiceNumber: invoiceNumbers[0] },
      select: { id: true, invoiceNumber: true },
    });
    if (invoiceToApply) {
      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            direction: TransactionDirection.OUTGOING,
            type: TransactionType.BANK_TRANSFER,
            amount: applyAmount,
            currency: "JPY",
            date: new Date(),
            description: `Applied from wallet to Invoice ${invoiceToApply.invoiceNumber}`,
            customerId: c.id,
            createdById: user.id,
          },
        });
        await tx.transaction.create({
          data: {
            direction: TransactionDirection.INCOMING,
            type: TransactionType.BANK_TRANSFER,
            amount: applyAmount,
            currency: "JPY",
            date: new Date(),
            description: `Payment for Invoice ${invoiceToApply.invoiceNumber}`,
            invoiceId: invoiceToApply.id,
            customerId: c.id,
            createdById: user.id,
          },
        });
        await tx.invoice.update({
          where: { id: invoiceToApply.id },
          data: { paymentStatus: PaymentStatus.PARTIALLY_PAID, paidAt: new Date() },
        });
      });
    }

    expectations.push({ id: c.id, expectedBalance });
  }

  return expectations;
}

async function runAssertions(expectations?: CustomerExpectation[]) {
  const testCustomers = expectations
    ?? (await prisma.customer
        .findMany({
          where: { shareToken: { startsWith: TEST_PREFIX } },
          orderBy: { shareToken: "asc" },
          select: { id: true },
        })
        .then((rows) => rows.map((r) => ({ id: r.id, expectedBalance: 0 }))));

  if (testCustomers.length === 0) {
    console.log("No test customers found. Run with --seed first.");
    return;
  }

  let passed = 0;
  const failures: { index: number; computed: number; expected: number }[] = [];

  for (let i = 0; i < testCustomers.length; i++) {
    const { id, expectedBalance } = testCustomers[i];
    const transactions = await prisma.transaction.findMany({
      where: { customerId: id },
      select: {
        direction: true,
        amount: true,
        currency: true,
        description: true,
      },
    });
    const computed = Math.round(computeWalletBalance(transactions) * 100) / 100;
    const ok = Math.abs(computed - expectedBalance) < 0.01;
    if (ok) {
      passed++;
    } else {
      failures.push({ index: i + 1, computed, expected: expectedBalance });
    }
  }

  const verbose = testCustomers.length <= 10;
  if (verbose) {
    for (let i = 0; i < testCustomers.length; i++) {
      const { expectedBalance } = testCustomers[i];
      const f = failures.find((x) => x.index === i + 1);
      const msg = f
        ? `  Customer ${i + 1}: balance ¥${f.computed.toLocaleString()} expected ¥${f.expected.toLocaleString()} FAIL`
        : `  Customer ${i + 1}: balance ¥${expectedBalance.toLocaleString()} OK`;
      console.log(msg);
    }
  }
  console.log("");
  console.log(`Portal balance assertions: ${passed}/${testCustomers.length} passed`);
  if (failures.length > 0) {
    if (!verbose) {
      failures.slice(0, 10).forEach((f) =>
        console.log(`  Customer ${f.index}: got ¥${f.computed.toLocaleString()}, expected ¥${f.expected.toLocaleString()}`)
      );
      if (failures.length > 10) console.log(`  ... and ${failures.length - 10} more`);
    }
    process.exit(1);
  }
}

/** CRM view: transactions per customer exist and counts match seeded data. */
async function runCRMChecks() {
  const customers = await prisma.customer.findMany({
    where: { shareToken: { startsWith: TEST_PREFIX } },
    orderBy: { shareToken: "asc" },
    select: { id: true, shareToken: true },
  });
  if (customers.length === 0) {
    console.log("No test customers for CRM checks.");
    return;
  }

  let totalIncoming = 0;
  let totalOutgoing = 0;
  let customersWithTransactions = 0;
  for (const c of customers) {
    const [incoming, outgoing] = await Promise.all([
      prisma.transaction.count({ where: { customerId: c.id, direction: "INCOMING" } }),
      prisma.transaction.count({ where: { customerId: c.id, direction: "OUTGOING" } }),
    ]);
    totalIncoming += incoming;
    totalOutgoing += outgoing;
    if (incoming > 0 || outgoing > 0) customersWithTransactions++;
  }

  const expectedIncomingPerCustomer = DEPOSITS_PER_CUSTOMER + APPLY_FROM_WALLET_PER_CUSTOMER; // deposits + payment-for-invoice
  const expectedOutgoingPerCustomer = APPLY_FROM_WALLET_PER_CUSTOMER;
  const expectedIncoming = customers.length * expectedIncomingPerCustomer;
  const expectedOutgoing = customers.length * expectedOutgoingPerCustomer;

  const incomingOk = totalIncoming === expectedIncoming;
  const outgoingOk = totalOutgoing === expectedOutgoing;
  const allHaveTx = customersWithTransactions === customers.length;

  console.log(`CRM transactions: ${totalIncoming} INCOMING, ${totalOutgoing} OUTGOING (customers with tx: ${customersWithTransactions}/${customers.length})`);
  if (!incomingOk || !outgoingOk || !allHaveTx) {
    console.log(`  Expected INCOMING ${expectedIncoming} (${expectedIncomingPerCustomer} per customer), OUTGOING ${expectedOutgoing} (${expectedOutgoingPerCustomer} per customer).`);
    if (!incomingOk || !outgoingOk) process.exit(1);
  }
  console.log("  CRM transaction visibility OK.");
}

/**
 * E2E: Customer deposits → CRM creates invoice and applies deposit (deduct from wallet) → portal balance reflects deduction.
 */
async function runE2EFlow(): Promise<boolean> {
  console.log("E2E: Deposit → CRM apply from wallet → portal balance reflects deduction...");

  const shareToken = `${TEST_PREFIX}e2e`;
  const customer = await prisma.customer.upsert({
    where: { shareToken },
    update: {},
    create: {
      name: `${TEST_PREFIX}E2E Customer`,
      email: `${TEST_PREFIX}e2e@test.local`,
      shareToken,
    },
    select: { id: true },
  });

  await prisma.transaction.deleteMany({ where: { customerId: customer.id } });

  const depositAmount = 80_000;
  const applyAmount = 30_000;
  const expectedBalanceAfterApply = depositAmount - applyAmount;

  // 1. Customer makes a deposit (as in portal: POST /api/deposits)
  await prisma.transaction.create({
    data: {
      direction: TransactionDirection.INCOMING,
      type: TransactionType.BANK_TRANSFER,
      amount: depositAmount,
      currency: "JPY",
      date: new Date(),
      description: "Deposit",
      customerId: customer.id,
      depositReceivedAt: new Date(),
    },
  });

  const balanceAfterDeposit = computeWalletBalance(
    await prisma.transaction.findMany({
      where: { customerId: customer.id },
      select: { direction: true, amount: true, currency: true, description: true },
    })
  );
  if (Math.abs(balanceAfterDeposit - depositAmount) > 0.01) {
    console.log(`  E2E FAIL: After deposit, balance should be ¥${depositAmount.toLocaleString()}, got ¥${balanceAfterDeposit.toLocaleString()}`);
    return false;
  }

  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) {
    console.log("  E2E SKIP: No user in DB (need one to create an invoice).");
    return true;
  }

  const invoiceNumber = `WALLET-E2E-${Date.now()}`;
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      customerId: customer.id,
      createdById: user.id,
      status: InvoiceStatus.APPROVED,
      paymentStatus: PaymentStatus.PENDING,
      issueDate: new Date(),
    },
    select: { id: true, invoiceNumber: true },
  });

  // 2. CRM marks payment with "Apply from wallet" (same as PATCH /api/invoices/[id]/payment with applyFromWallet)
  await prisma.$transaction(async (tx) => {
    await tx.transaction.create({
      data: {
        direction: TransactionDirection.OUTGOING,
        type: TransactionType.BANK_TRANSFER,
        amount: applyAmount,
        currency: "JPY",
        date: new Date(),
        description: `Applied from wallet to Invoice ${invoice.invoiceNumber}`,
        customerId: customer.id,
        createdById: user.id,
      },
    });
    await tx.transaction.create({
      data: {
        direction: TransactionDirection.INCOMING,
        type: TransactionType.BANK_TRANSFER,
        amount: applyAmount,
        currency: "JPY",
        date: new Date(),
        description: `Payment for Invoice ${invoice.invoiceNumber}`,
        invoiceId: invoice.id,
        customerId: customer.id,
        createdById: user.id,
      },
    });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: { paymentStatus: PaymentStatus.PARTIALLY_PAID, paidAt: new Date() },
    });
  });

  // 3. Portal balance = deposits minus applied (what customer would see)
  const transactions = await prisma.transaction.findMany({
    where: { customerId: customer.id },
    select: { direction: true, amount: true, currency: true, description: true },
  });
  const balanceAfterApply = computeWalletBalance(transactions);

  if (Math.abs(balanceAfterApply - expectedBalanceAfterApply) > 0.01) {
    console.log(`  E2E FAIL: After apply from wallet, balance should be ¥${expectedBalanceAfterApply.toLocaleString()}, got ¥${balanceAfterApply.toLocaleString()}`);
    return false;
  }

  console.log(`  E2E OK: Deposit ¥${depositAmount.toLocaleString()} → applied ¥${applyAmount.toLocaleString()} to invoice → portal balance ¥${balanceAfterApply.toLocaleString()}`);
  return true;
}

async function cleanTestData() {
  const deleted = await prisma.customer.deleteMany({
    where: { shareToken: { startsWith: TEST_PREFIX } },
  });
  console.log(`Deleted ${deleted.count} test customers (and their transactions via cascade if any).`);
}

async function main() {
  const args = process.argv.slice(2);
  const seed = !args.includes("--only");
  const clean = args.includes("--clean");

  if (clean) {
    await cleanTestData();
    return;
  }

  console.log("Wallet system test\n");

  let expectations: CustomerExpectation[] | undefined;
  if (seed) {
    console.log(`Seeding ${NUM_SCALE_CUSTOMERS} test customers (${DEPOSITS_PER_CUSTOMER} deposits, ${INVOICES_PER_CUSTOMER} invoices, ${APPLY_FROM_WALLET_PER_CUSTOMER} apply-from-wallet per customer)...`);
    expectations = await seedTestData();
    console.log("Seeding done.\n");
  }

  console.log("Running portal balance assertions (deposits only − outflows; invoice payments do not add to balance)...");
  await runAssertions(expectations);

  if (expectations && expectations.length > 0) {
    console.log("\nChecking CRM transaction visibility (Financial Operations)...");
    await runCRMChecks();
  }

  if (seed) {
    console.log("\nE2E: one customer deposit → apply from wallet → portal balance...");
    const e2eOk = await runE2EFlow();
    if (!e2eOk) process.exit(1);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
