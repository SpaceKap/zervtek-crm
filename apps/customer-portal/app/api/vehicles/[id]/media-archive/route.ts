import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import archiver from "archiver";
import { readFile, access } from "fs/promises";
import { join } from "path";

const MAIN_APP_URL =
  process.env.NEXT_PUBLIC_MAIN_APP_URL ||
  process.env.MAIN_APP_URL ||
  "http://localhost:3000";

/** Directory containing uploads (e.g. main app's public folder, or public/uploads). File URLs are like /uploads/xyz so we need base = public. */
const UPLOADS_BASE_DIR =
  process.env.MAIN_APP_UPLOADS_PATH ||
  join(process.cwd(), "..", "..", "public");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const customerId = session?.user?.id;
  if (!customerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: vehicleId } = await params;

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      id: vehicleId,
      OR: [
        { customerId },
        { customerLinks: { some: { customerId } } },
      ],
    },
    select: { id: true },
  });

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const documents = await prisma.vehicleDocument.findMany({
    where: {
      vehicleId,
      category: "PHOTOS",
      visibleToCustomer: true,
    },
    select: { id: true, name: true, fileUrl: true },
    orderBy: { createdAt: "asc" },
  });

  if (documents.length === 0) {
    return NextResponse.json(
      { error: "No photos or videos to download" },
      { status: 404 }
    );
  }

  const archive = archiver("zip", { zlib: { level: 9 } });
  const stream = new ReadableStream({
    start(controller) {
      archive.on("data", (chunk) => controller.enqueue(chunk));
      archive.on("end", () => controller.close());
      archive.on("error", (err) => controller.error(err));
    },
  });

  const response = new NextResponse(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="vehicle-${vehicleId}-media.zip"`,
    },
  });

  (async () => {
    try {
      for (const doc of documents) {
        let buf: Buffer | null = null;
        const relativePath = !doc.fileUrl.startsWith("http") && doc.fileUrl.startsWith("/")
          ? doc.fileUrl.slice(1)
          : null;

        // 1) Try reading from local uploads dir (monorepo or MAIN_APP_UPLOADS_PATH)
        if (relativePath && !relativePath.includes("..")) {
          const localPath = join(UPLOADS_BASE_DIR, relativePath);
          try {
            await access(localPath);
            buf = await readFile(localPath);
          } catch {
            // file not found or not readable, fall back to fetch
          }
        }

        // 2) Fallback: fetch from main app
        if (!buf) {
          const url = doc.fileUrl.startsWith("http")
            ? doc.fileUrl
            : `${MAIN_APP_URL.replace(/\/$/, "")}${doc.fileUrl.startsWith("/") ? "" : "/"}${doc.fileUrl}`;
          try {
            const res = await fetch(url);
            if (res.ok && res.body) {
              buf = await ResolveToBuffer(res.body);
            } else {
              console.warn("Media archive: skip (not ok)", url, res.status);
            }
          } catch (e) {
            console.warn("Media archive: skip (fetch failed)", doc.name, url, e);
          }
        }

        if (buf) {
          const safeName = doc.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          archive.append(buf, { name: safeName });
        }
      }
      archive.finalize();
    } catch (e) {
      console.error("Media archive error:", e);
      archive.abort();
    }
  })();

  return response;
}

async function ResolveToBuffer(body: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks);
}
