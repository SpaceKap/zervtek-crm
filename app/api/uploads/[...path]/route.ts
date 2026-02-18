import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the filename from the path array
    const filename = params.path.join("/")
    
    // Security: Prevent directory traversal
    if (filename.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    // The filename is already clean (no "uploads/" prefix since rewrite handles it)
    const cleanFilename = filename

    // Construct file path - handle both development and production (standalone) modes
    // In standalone mode, files might be in different locations
    const possiblePaths = [
      join(process.cwd(), "public", "uploads", cleanFilename), // Standard location
      join(process.cwd(), "uploads", cleanFilename), // Standalone without public
      join(process.cwd(), "..", "public", "uploads", cleanFilename), // Relative to app
    ]
    
    let filepath: string | null = null
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        filepath = path
        break
      }
    }

    // Check if file exists
    if (!filepath) {
      console.error(`File not found: ${cleanFilename}. Tried paths:`, possiblePaths)
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Read file
    const fileBuffer = await readFile(filepath)

    // Determine content type based on file extension
    const extension = cleanFilename.split(".").pop()?.toLowerCase() || ""
    const contentTypeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    const contentType = contentTypeMap[extension] || "application/octet-stream"

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${cleanFilename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error) {
    console.error("Error serving file:", error)
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    )
  }
}
