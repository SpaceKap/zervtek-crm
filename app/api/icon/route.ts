import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const companyInfo = await prisma.companyInfo.findFirst({
      select: { logo: true },
    });

    if (!companyInfo?.logo) {
      const defaultSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="%23D4AF37"><rect width="32" height="32" rx="4" fill="%231a1a1a"/><text x="16" y="22" font-family="sans-serif" font-size="18" font-weight="bold" fill="%23D4AF37" text-anchor="middle">Z</text></svg>`;
      return new NextResponse(defaultSvg, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    const logo = companyInfo.logo;

    if (logo.startsWith("data:image")) {
      const match = logo.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const [, format, base64Data] = match;
        const buffer = Buffer.from(base64Data, "base64");
        const contentType = `image/${format}`;
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    if (logo.startsWith("http")) {
      const res = await fetch(logo);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type") || "image/png";
        return new NextResponse(arrayBuffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=86400",
          },
        });
      }
    }

    return new NextResponse(null, { status: 404 });
  } catch (error) {
    console.error("Error serving favicon:", error);
    return new NextResponse(null, { status: 500 });
  }
}
