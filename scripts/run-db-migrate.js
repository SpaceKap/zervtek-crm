/**
 * Load .env from repo root and run prisma migrate dev in the db package.
 * This ensures DATABASE_URL is available when running migrations locally.
 */
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = path.resolve(__dirname, "..");
require("dotenv").config({ path: path.join(rootDir, ".env") });

const result = spawnSync(
  "npx",
  ["prisma", "migrate", "deploy"],
  {
    stdio: "inherit",
    env: process.env,
    cwd: path.join(rootDir, "packages", "db"),
  }
);
process.exit(result.status ?? 1);
