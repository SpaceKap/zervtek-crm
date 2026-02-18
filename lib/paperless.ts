/**
 * Paperless-ngx API client.
 * Uses PAPERLESS_INTERNAL_URL for server-to-server API calls.
 * Uses PAPERLESS_PUBLIC_URL for user-facing document links.
 */

const PAPERLESS_INTERNAL_URL = process.env.PAPERLESS_INTERNAL_URL?.replace(/\/$/, "")
const PAPERLESS_PUBLIC_URL = process.env.PAPERLESS_PUBLIC_URL?.replace(/\/$/, "")
const PAPERLESS_TOKEN = process.env.PAPERLESS_TOKEN

export function isPaperlessConfigured(): boolean {
  return !!(PAPERLESS_INTERNAL_URL && PAPERLESS_TOKEN)
}

function getAuthHeaders(): HeadersInit {
  return {
    Authorization: `Token ${PAPERLESS_TOKEN}`,
    Accept: "application/json; version=6",
  }
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${PAPERLESS_INTERNAL_URL}${path}`, {
    headers: getAuthHeaders(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Paperless API error ${res.status}: ${text}`)
  }
  return res.json()
}

async function apiPost<T>(path: string, body: Record<string, unknown> | FormData): Promise<T> {
  const isForm = body instanceof FormData
  const res = await fetch(`${PAPERLESS_INTERNAL_URL}${path}`, {
    method: "POST",
    headers: isForm ? getAuthHeaders() : { ...getAuthHeaders(), "Content-Type": "application/json" },
    body: isForm ? body : JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Paperless API error ${res.status}: ${text}`)
  }
  return res.json()
}

interface StoragePath {
  id: number
  name?: string
  path?: string
}

const EXPENSES_PATH_TEMPLATE = "expenses/{{ created_year }}-{{ created_month }}"
let cachedExpensesStoragePathId: number | null = null

/**
 * Get or create the expenses storage path (template: expenses/YYYY-MM).
 * Cached in memory after first creation.
 */
export async function getOrCreateExpensesStoragePath(): Promise<number> {
  if (cachedExpensesStoragePathId != null) return cachedExpensesStoragePathId
  const existing = await apiGet<{ results: StoragePath[] }>("/api/storage_paths/")
  const match = existing.results?.find((s) => s.path === EXPENSES_PATH_TEMPLATE)
  if (match) {
    cachedExpensesStoragePathId = match.id
    return match.id
  }
  const created = await apiPost<StoragePath>("/api/storage_paths/", {
    name: "CRM Expenses",
    path: EXPENSES_PATH_TEMPLATE,
  })
  cachedExpensesStoragePathId = created.id
  return created.id
}

/**
 * Get or create vehicle storage path: vehicles/{vehicleId}-{VIN}.
 * Caches in DB via VehiclePaperlessPath.
 */
export async function getOrCreateVehicleStoragePath(
  vehicleId: string,
  vin: string
): Promise<number> {
  const { prisma } = await import("./prisma")
  const cached = await prisma.vehiclePaperlessPath.findUnique({
    where: { vehicleId },
  })
  if (cached) return cached.storagePathId

  const pathValue = `vehicles/${vehicleId}-${vin}`
  const existing = await apiGet<{ results: StoragePath[] }>("/api/storage_paths/")
  const match = existing.results?.find((s) => s.path === pathValue)
  let storagePathId: number
  if (match) {
    storagePathId = match.id
  } else {
    const created = await apiPost<StoragePath>("/api/storage_paths/", {
      name: `Vehicle ${vin}`,
      path: pathValue,
    })
    storagePathId = created.id
  }
  await prisma.vehiclePaperlessPath.upsert({
    where: { vehicleId },
    create: { vehicleId, storagePathId },
    update: { storagePathId },
  })
  return storagePathId
}

export interface PostDocumentOptions {
  title?: string
  storagePathId?: number
  created?: Date | string
  tags?: string[]
}

const POLL_INTERVAL_MS = 2000
const POLL_MAX_ATTEMPTS = 20

/**
 * Post document to Paperless and wait for consumption.
 * Returns document ID on success.
 */
export async function postDocument(
  fileBuffer: Buffer,
  filename: string,
  options: PostDocumentOptions = {}
): Promise<number> {
  const form = new FormData()
  // Convert Buffer to Uint8Array for Blob compatibility
  form.append("document", new Blob([new Uint8Array(fileBuffer)]), filename)
  if (options.title) form.append("title", options.title)
  if (options.storagePathId != null) form.append("storage_path", String(options.storagePathId))
  if (options.created) {
    const d = typeof options.created === "string" ? new Date(options.created) : options.created
    form.append("created", d.toISOString())
  }
  if (options.tags?.length) {
    options.tags.forEach((t) => form.append("tags", t))
  }

  const res = await fetch(`${PAPERLESS_INTERNAL_URL}/api/documents/post_document/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Paperless post_document error ${res.status}: ${text}`)
  }
  const taskIdRaw = await res.text()
  const taskId = taskIdRaw.replace(/^"|"$/g, "").trim()
  if (!taskId) throw new Error("Paperless did not return task UUID")

  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    let taskData: unknown
    try {
      taskData = await apiGet(`/api/tasks/?task_id=${taskId}`)
    } catch {
      continue
    }
    const results = Array.isArray(taskData) ? taskData : [taskData]
    const t = results.find((r: { task_id?: string }) => r.task_id === taskId) ?? results[0] as { status?: string; result?: string }
    if (!t) continue
    if (t.status === "SUCCESS" && t.result) {
      const docId = parseInt(String(t.result), 10)
      if (!isNaN(docId)) return docId
    }
    if (t.status === "FAILURE") {
      throw new Error(`Paperless consumption failed: ${t.result ?? "unknown"}`)
    }
  }
  throw new Error("Paperless consumption timed out")
}

/**
 * Get user-facing URL for a document.
 * Uses PAPERLESS_PUBLIC_URL so links work from browser.
 */
export function getDocumentUrl(documentId: number): string {
  if (!PAPERLESS_PUBLIC_URL) {
    return `${PAPERLESS_INTERNAL_URL ?? ""}/documents/${documentId}/`
  }
  return `${PAPERLESS_PUBLIC_URL}/documents/${documentId}/`
}
