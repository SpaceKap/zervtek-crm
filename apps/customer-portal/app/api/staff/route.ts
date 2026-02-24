import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** First-name display for person in charge: first name only; Avishka -> Avi; shipping -> Bhanuka */
function staffDisplayName(name: string | null, email: string): string {
  const emailLower = (email || "").toLowerCase();
  if (emailLower === "shipping@zervtek.com") return "Bhanuka";
  if (!name || !name.trim()) return email.split("@")[0] || "Staff";
  const first = name.trim().split(/\s+/)[0];
  if (first.toLowerCase() === "avishka") return "Avi";
  if (first.toLowerCase() === "shipping") return "Bhanuka";
  return first;
}

/**
 * GET /api/staff - List staff for "Person in charge" dropdown (register form).
 * Returns id and displayName (first name only; Avishka -> Avi).
 * No auth required so the public register page can load the list.
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    const staff = users.map((u) => ({
      id: u.id,
      displayName: staffDisplayName(u.name, u.email),
    }));
    return NextResponse.json(staff);
  } catch (e) {
    console.error("Staff API error:", e);
    return NextResponse.json(
      { error: "Failed to load staff" },
      { status: 500 }
    );
  }
}
