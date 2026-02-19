/**
 * Generate a sample PDF invoice to a file (no server or login required).
 * Use to verify PDF layout and logo rendering.
 *
 * Run: npm run sample-invoice-pdf
 *    or: npx tsx scripts/generate-sample-invoice-pdf.ts
 * Output: sample-invoice-YYYY-MM-DD_HHMMSS.pdf in project root (or pass path as first arg, e.g. ./my.pdf)
 *
 * With real company info + logo from DB (requires DATABASE_URL):
 *   npx tsx scripts/generate-sample-invoice-pdf.ts --db
 */

import { renderToBuffer } from "@react-pdf/renderer";
import * as fs from "fs";
import * as path from "path";
import { CustomerInvoicePDF } from "../lib/pdf/customer-invoice";

// Logo: prefer newest light-mode asset, then fallbacks
const LOGO_PRIORITY = [
  "light-mode1-38252b16-87fe-4ce4-8d0c-7f15c5efb974.png",
  "light-mode1-fb4cd436-0491-43a6-937c-92e679359805.png",
  "zervtek_logo-e771c3df-efd2-456c-afd8-f97bea55ed9f.png",
];
const DEFAULT_LOGO_PATH = (() => {
  const tryFile = (name: string) => {
    const fromScript = path.join(__dirname, "assets", name);
    const fromCwd = path.join(process.cwd(), "scripts", "assets", name);
    if (fs.existsSync(fromScript)) return fromScript;
    if (fs.existsSync(fromCwd)) return fromCwd;
    return null;
  };
  for (const name of LOGO_PRIORITY) {
    const p = tryFile(name);
    if (p) return p;
  }
  return path.join(process.cwd(), "scripts", "assets", LOGO_PRIORITY[0]);
})();

function buildSampleCompanyInfo(useRealFromDb: boolean): any {
  const address = {
    street: "2 Chome-465-14 Kemigawacho",
    city: "Chiba",
    state: "Hanamigawa Ward",
    zip: "262-0023",
    country: "Japan",
  };

  let logo: Buffer | string | null = null;
  let logoFormat: "png" | "jpg" | undefined;

  if (!useRealFromDb && fs.existsSync(DEFAULT_LOGO_PATH)) {
    logo = fs.readFileSync(DEFAULT_LOGO_PATH);
    logoFormat = "png";
  }

  const bankDetails1 = {
    name: "Sumitomo Mitsui Banking Corporation (三井住友銀行)",
    accountName: "ZERVTEK CO., LTD",
    accountNo: "1234567",
    swiftCode: "SMBCJPJT",
    branchName: "Chiba Branch",
    bankAddress: "1-2-3 Example, Chiba, Japan",
  };

  return {
    name: "ZERVTEK CO., LTD",
    address,
    phone: "+81-43-216-3442",
    email: "info@zervtek.com",
    logo,
    logoFormat,
    bankDetails1,
  };
}

function buildSampleInvoice() {
  const now = new Date();
  const due = new Date(now);
  due.setDate(due.getDate() + 30);

  return {
    id: "sample-invoice-id",
    invoiceNumber: "INV-SAMPLE-001",
    issueDate: now,
    dueDate: due,
    createdAt: now,
    taxEnabled: true,
    taxRate: 10,
    customer: {
      name: "Sample Customer",
      email: "customer@example.com",
      phone: "+1-555-0100",
      billingAddress: {
        street: "123 Billing St",
        city: "Tokyo",
        state: "",
        zip: "100-0001",
        country: "Japan",
      },
      shippingAddress: {
        street: "456 Ship Ave",
        city: "Tokyo",
        state: "",
        zip: "100-0002",
        country: "Japan",
      },
    },
    vehicle: null,
    charges: [
      {
        id: "c1",
        description: "2022 TOYOTA COROLLA FIELDER - NKE165-7261670",
        amount: 1013000,
        chargeType: { name: "Vehicle" },
      },
      {
        id: "c2",
        description: "Export Fees",
        amount: 160000,
        chargeType: { name: "Export Fees" },
      },
      {
        id: "c3",
        description: "Discount",
        amount: 20000,
        chargeType: { name: "Discount" },
      },
      {
        id: "c4",
        description: "Deposit",
        amount: 100000,
        chargeType: { name: "Deposit" },
      },
    ],
  };
}

async function main() {
  const args = process.argv.slice(2);
  const useDb = args.includes("--db");
  const outArg = args.find((a) => !a.startsWith("--"));
  const defaultName =
    "sample-invoice-" + new Date().toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "") + ".pdf";
  const outputPath = outArg
    ? path.resolve(outArg)
    : path.resolve(process.cwd(), defaultName);

  let companyInfo = buildSampleCompanyInfo(useDb);

  if (useDb) {
    try {
      const { prisma } = await import("../lib/prisma");
      const row = await prisma.companyInfo.findFirst();
      if (row) {
        companyInfo = {
          name: row.name,
          address: (row.address as any) || companyInfo.address,
          phone: row.phone ?? companyInfo.phone,
          email: row.email ?? companyInfo.email,
          bankDetails1: row.bankDetails1,
        };
        if (row.logo) {
          const logoStr = row.logo;
          if (logoStr.startsWith("data:")) {
            const match = logoStr.match(/^data:image\/(\w+);base64,(.+)$/);
            if (match) {
              const ext = match[1].toLowerCase();
              companyInfo.logo = Buffer.from(match[2], "base64");
              companyInfo.logoFormat = ext === "jpeg" || ext === "jpg" ? "jpg" : "png";
            }
          } else if (!logoStr.startsWith("http")) {
            companyInfo.logo = Buffer.from(logoStr, "base64");
            companyInfo.logoFormat = "png";
          } else {
            companyInfo.logo = logoStr;
          }
        }
      }
      await prisma.$disconnect();
    } catch (e) {
      console.warn("Could not load company from DB, using sample:", (e as Error).message);
    }
  }

  const invoice = buildSampleInvoice();
  const doc = CustomerInvoicePDF({ invoice, companyInfo });
  const buffer = await renderToBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log("Written:", outputPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
