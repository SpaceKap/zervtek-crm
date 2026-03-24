import { InquirySource } from "@prisma/client";

export type PipelineSortMode = "newest" | "oldest" | "name_az" | "name_za";
export type PipelineGroupMode = "none" | "source" | "assignee";

const SORT_SET = new Set<PipelineSortMode>([
  "newest",
  "oldest",
  "name_az",
  "name_za",
]);
const GROUP_SET = new Set<PipelineGroupMode>(["none", "source", "assignee"]);
const SOURCE_SET = new Set<string>(Object.values(InquirySource));

export function parsePipelineSort(value: string | null): PipelineSortMode {
  if (value && SORT_SET.has(value as PipelineSortMode)) {
    return value as PipelineSortMode;
  }
  return "newest";
}

export function parsePipelineGroup(value: string | null): PipelineGroupMode {
  if (value && GROUP_SET.has(value as PipelineGroupMode)) {
    return value as PipelineGroupMode;
  }
  return "none";
}

export function parsePipelineSourcesFilter(
  value: string | null,
): Set<InquirySource> | null {
  if (value == null || value.trim() === "") return null;
  const parts = value.split(",").map((s) => s.trim());
  const out = new Set<InquirySource>();
  for (const p of parts) {
    if (SOURCE_SET.has(p)) out.add(p as InquirySource);
  }
  return out.size > 0 ? out : null;
}

export const ALL_INQUIRY_SOURCES_SORTED = [...Object.values(InquirySource)].sort(
  (a, b) => String(a).localeCompare(String(b)),
);

export type PipelineViewPrefs = {
  sortMode: PipelineSortMode;
  groupMode: PipelineGroupMode;
  hideEmpty: boolean;
  /** null = all sources */
  sourcesAllowlist: Set<InquirySource> | null;
};

export function prefsFromSearchParams(sp: URLSearchParams): PipelineViewPrefs {
  return {
    sortMode: parsePipelineSort(sp.get("kbs")),
    groupMode: parsePipelineGroup(sp.get("kbg")),
    hideEmpty: sp.get("kbh") === "1",
    sourcesAllowlist: parsePipelineSourcesFilter(sp.get("kbf")),
  };
}

export function serializePipelineViewPrefs(p: PipelineViewPrefs): string {
  const kbf =
    p.sourcesAllowlist == null
      ? "*"
      : [...p.sourcesAllowlist]
          .sort((a, b) => String(a).localeCompare(String(b)))
          .join(",");
  return `${p.sortMode}|${p.groupMode}|${p.hideEmpty ? "1" : ""}|${kbf}`;
}

export function applyPipelineViewPrefsToParams(
  params: URLSearchParams,
  p: PipelineViewPrefs,
): void {
  if (p.sortMode === "newest") params.delete("kbs");
  else params.set("kbs", p.sortMode);
  if (p.groupMode === "none") params.delete("kbg");
  else params.set("kbg", p.groupMode);
  if (!p.hideEmpty) params.delete("kbh");
  else params.set("kbh", "1");
  if (p.sourcesAllowlist == null) params.delete("kbf");
  else
    params.set(
      "kbf",
      [...p.sourcesAllowlist]
        .sort((a, b) => String(a).localeCompare(String(b)))
        .join(","),
    );
}

function inquiryCreatedMs(inquiry: { createdAt: Date | string }): number {
  const d = inquiry.createdAt;
  return new Date(d as string).getTime();
}

function inquiryDisplayName(inquiry: {
  customerName: string | null;
  email: string | null;
}): string {
  return (inquiry.customerName || inquiry.email || "").trim();
}

export function sortPipelineInquiries<T extends { createdAt: Date | string; customerName: string | null; email: string | null }>(
  list: T[],
  mode: PipelineSortMode,
): T[] {
  const copy = [...list];
  switch (mode) {
    case "oldest":
      return copy.sort(
        (a, b) => inquiryCreatedMs(a) - inquiryCreatedMs(b),
      );
    case "name_az":
      return copy.sort((a, b) =>
        inquiryDisplayName(a).localeCompare(inquiryDisplayName(b), undefined, {
          sensitivity: "base",
        }),
      );
    case "name_za":
      return copy.sort((a, b) =>
        inquiryDisplayName(b).localeCompare(inquiryDisplayName(a), undefined, {
          sensitivity: "base",
        }),
      );
    case "newest":
    default:
      return copy.sort(
        (a, b) => inquiryCreatedMs(b) - inquiryCreatedMs(a),
      );
  }
}

function formatSourceLabel(source: InquirySource): string {
  return source
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function groupInquiriesBySource<T extends { source: InquirySource }>(
  inquiries: T[],
): { label: string; inquiries: T[] }[] {
  const map = new Map<InquirySource, T[]>();
  for (const inq of inquiries) {
    const arr = map.get(inq.source);
    if (arr) arr.push(inq);
    else map.set(inq.source, [inq]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
    .map(([source, list]) => ({
      label: formatSourceLabel(source),
      inquiries: list,
    }));
}

export function groupInquiriesByAssignee<
  T extends {
    assignedToId: string | null;
    assignedTo?: { name: string | null; email: string } | null;
  },
>(inquiries: T[]): { label: string; inquiries: T[] }[] {
  const map = new Map<string, { label: string; inquiries: T[] }>();
  for (const inq of inquiries) {
    const key = inq.assignedToId ?? "__unassigned";
    const label =
      inq.assignedTo?.name?.trim() ||
      inq.assignedTo?.email ||
      (key === "__unassigned" ? "Unassigned" : "Unknown");
    const existing = map.get(key);
    if (existing) {
      existing.inquiries.push(inq);
    } else {
      map.set(key, { label, inquiries: [inq] });
    }
  }
  const entries = Array.from(map.values());
  entries.sort((a, b) => {
    if (a.label === "Unassigned") return 1;
    if (b.label === "Unassigned") return -1;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
  return entries.map(({ label, inquiries: list }) => ({
    label,
    inquiries: list,
  }));
}

export function buildInquirySections<
  T extends {
    source: InquirySource;
    assignedToId: string | null;
    assignedTo?: { name: string | null; email: string } | null;
    createdAt: Date | string;
    customerName: string | null;
    email: string | null;
  },
>(
  inquiries: T[],
  sortMode: PipelineSortMode,
  groupMode: PipelineGroupMode,
): { label: string; inquiries: T[] }[] {
  const sorted = sortPipelineInquiries(inquiries, sortMode);
  if (groupMode === "source") {
    return groupInquiriesBySource(sorted).filter((s) => s.inquiries.length > 0);
  }
  if (groupMode === "assignee") {
    return groupInquiriesByAssignee(sorted).filter((s) => s.inquiries.length > 0);
  }
  return [{ label: "", inquiries: sorted }];
}
