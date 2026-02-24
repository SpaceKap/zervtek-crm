import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
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

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/inquiries/:path*",
    "/kanban/:path*",
    "/leads/:path*",
    "/admin/:path*",
  ],
}
