/**
 * Load .env from repo root and run prisma db push in the db package.
 * This ensures DATABASE_URL is available when the db workspace runs prisma.
 */
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(rootDir, ".env") });

const result = spawnSync(
  "npx",
  ["prisma", "db", "push"],
  {
    stdio: "inherit",
    env: process.env,
    cwd: path.join(rootDir, "packages", "db"),
  }
);
process.exit(result.status ?? 1);
