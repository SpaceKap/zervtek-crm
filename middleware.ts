import { withAuth } from "next-auth/middleware"
import { NextRequest, NextResponse } from "next/server"
import { stockListingsCorsHeaders } from "@/lib/cors-stock-listings"

const authMiddleware = withAuth(
  function middleware() {
    return NextResponse.next()
  },
  {
    pages: { signIn: "/login" },
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export default function middleware(req: NextRequest) {
  // CORS for stock-listings API so www.zervtek.com can call crm.zervtek.com
  if (req.nextUrl.pathname.startsWith("/api/stock-listings")) {
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: stockListingsCorsHeaders(req),
      })
    }
    const res = NextResponse.next()
    Object.entries(stockListingsCorsHeaders(req)).forEach(([k, v]) => {
      res.headers.set(k, v)
    })
    return res
  }
  return authMiddleware(req)
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/api/stock-listings",
    "/api/stock-listings/:path*",
    "/inquiries/:path*",
    "/kanban/:path*",
    "/leads/:path*",
    "/admin/:path*",
  ],
}
