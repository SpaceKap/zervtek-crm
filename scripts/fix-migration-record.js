/**
 * Remove stale migration record that references a non-existent folder.
 * The DB has 20260205094146_add_document_categories but the repo has 20260205094000_add_document_categories.
 * Run once from repo root: node scripts/fix-migration-record.js
 */
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(rootDir, ".env") });

const dbDir = path.join(rootDir, "packages", "db");
const sqlFile = path.join(rootDir, "scripts", "delete-stale-migration-record.sql");

const result = spawnSync(
  "npx",
  ["prisma", "db", "execute", "--file", sqlFile],
  {
    stdio: "inherit",
    env: process.env,
    cwd: dbDir,
  }
);
process.exit(result.status ?? 1);
