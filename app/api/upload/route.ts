import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import {
  isPaperlessConfigured,
  postDocument,
  getDocumentUrl,
  getOrCreateVehicleStoragePath,
  getOrCreateExpensesStoragePath,
} from "@/lib/paperless"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const context = (formData.get("context") as string) || ""
    const vehicleId = (formData.get("vehicleId") as string) || ""
    let vin = (formData.get("vin") as string) || ""
    const folder = (formData.get("folder") as string) || ""
    const expenseDate = (formData.get("expenseDate") as string) || ""
    const title = (formData.get("title") as string) || file.name

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads")
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split(".").pop()
    const filename = `${timestamp}-${randomStr}.${extension}`
    const filepath = join(uploadsDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/${filename}`
    const response: Record<string, unknown> = {
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    }

    if (isPaperlessConfigured()) {
      try {
        const isVehicleFolder =
          folder === "vehicle" ||
          (folder !== "expense" && (context === "vehicle" || vehicleId))

        let storagePathId: number | undefined
        let created: Date | string | undefined

        if (isVehicleFolder && vehicleId) {
          if (!vin) {
            const vehicle = await prisma.vehicle.findUnique({
              where: { id: vehicleId },
              select: { vin: true },
            })
            vin = vehicle?.vin ?? ""
          }
          storagePathId = await getOrCreateVehicleStoragePath(vehicleId, vin)
        } else {
          storagePathId = await getOrCreateExpensesStoragePath()
          created = expenseDate ? new Date(expenseDate) : new Date()
        }

        const docId = await postDocument(buffer, file.name, {
          title: title || file.name,
          storagePathId,
          created,
        })
        response.paperlessDocumentId = String(docId)
        response.paperlessUrl = getDocumentUrl(docId)
      } catch (err) {
        console.warn("Paperless sync failed (upload succeeded):", err instanceof Error ? err.message : err)
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
