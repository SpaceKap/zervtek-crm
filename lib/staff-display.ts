/**
 * Display name for "Person in charge" (staff): first name only; Avishka -> Avi; shipping -> Bhanuka.
 */
export function staffDisplayName(name: string | null, email: string): string {
  const emailLower = (email || "").toLowerCase();
  if (emailLower === "shipping@zervtek.com") return "Bhanuka";
  if (!name || !name.trim()) return email?.split("@")[0] || "Staff";
  const first = name.trim().split(/\s+/)[0];
  if (first.toLowerCase() === "avishka") return "Avi";
  if (first.toLowerCase() === "shipping") return "Bhanuka";
  return first;
}
