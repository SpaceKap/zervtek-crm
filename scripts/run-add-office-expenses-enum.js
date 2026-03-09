/**
 * Run the OFFICE_EXPENSES enum SQL using the app's DATABASE_URL from .env.
 * Usage: node scripts/run-add-office-expenses-enum.js
 * (Run from project root. Works with Supabase locally or Postgres on VPS.)
 */
const path = require("path");
const { execSync } = require("child_process");

// Load .env from project root so DATABASE_URL is set for Prisma
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL not set. Ensure .env exists and contains DATABASE_URL.");
  process.exit(1);
}

const schemaPath = path.join(__dirname, "..", "packages", "db", "prisma", "schema.prisma");
const sqlPath = path.join(__dirname, "add-office-expenses-enum.sql");

execSync(
  `npx prisma db execute --schema="${schemaPath}" --file "${sqlPath}"`,
  { stdio: "inherit", env: process.env }
);
