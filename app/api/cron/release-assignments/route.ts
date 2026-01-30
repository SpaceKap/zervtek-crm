import { NextRequest, NextResponse } from "next/server"
import { releaseExpiredAssignments } from "@/lib/assignment"

// This endpoint can be called by a cron job (e.g., Vercel Cron, or external cron service)
// For security, you should add authentication/authorization here
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    // const authHeader = request.headers.get("authorization")
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }

    const result = await releaseExpiredAssignments()

    return NextResponse.json({
      success: true,
      released: result.released,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error releasing expired assignments:", error)
    return NextResponse.json(
      { error: "Failed to release expired assignments" },
      { status: 500 }
    )
  }
}
