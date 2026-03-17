import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { compressImageForStockListing } from "@/lib/compress-image"

export async function POST(request: NextRequest) {
  try {
    // Read JWT from request cookies explicitly (reliable for multipart/form-data)
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })
    if (!token?.id) {
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

    const timestamp = Date.now()
    const randomStr = Math.random().toString(36).substring(2, 15)
    let buffer: Uint8Array = Buffer.from(await file.arrayBuffer())
    let extension = file.name.split(".").pop() || "bin"

    if (context === "stock-listing" && file.type.startsWith("image/")) {
      const compressed = await compressImageForStockListing(Buffer.from(buffer), file.type)
      buffer = compressed.buffer
      extension = compressed.extension
    }

    const filename = `${timestamp}-${randomStr}.${extension}`
    const filepath = join(uploadsDir, filename)
    await writeFile(filepath, buffer)

    const fileUrl = `/uploads/${filename}`
    const response = {
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
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
