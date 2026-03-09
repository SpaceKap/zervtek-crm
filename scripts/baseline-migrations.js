/**
 * One-time: Mark existing migrations as already applied (baseline).
 * Use when the DB already has the schema (e.g. from db push) but no _prisma_migrations history.
 * Run from repo root. After this, run: npm run db:migrate
 *
 * Migrations that are marked as applied (everything except the latest deposit one):
 */
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(rootDir, ".env") });

const dbDir = path.join(rootDir, "packages", "db");

const toResolve = [
  "20260130134512_increase_margin_roi_precision",
  "20260130140000_change_shared_invoice_type_to_string",
  "add_payment_deadline",
  "20260205093352_add_vendor_categories",
  "20260205094000_add_document_categories",
  "20260218000000_add_referral_inquiry_source",
  "20260218120000_inquiry_indexes_stats",
  "20260220000000_add_customer_password_hash",
  "20260220100000_add_customer_email_verification",
];

console.log("Marking", toResolve.length, "migrations as applied (baseline)...\n");

for (const name of toResolve) {
  const result = spawnSync("npx", ["prisma", "migrate", "resolve", "--applied", name], {
    stdio: "inherit",
    env: process.env,
    cwd: dbDir,
  });
  if (result.status !== 0) {
    console.error("\nFailed at migration:", name);
    process.exit(1);
  }
}

console.log("\nBaseline done. Run: npm run db:migrate");
process.exit(0);
