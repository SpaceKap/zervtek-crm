import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "./prisma"
import { UserRole } from "@prisma/client"

export const authOptions: NextAuthOptions = {
    // No adapter needed for JWT sessions
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (!user.email) return false

            try {
                // Check if user exists in database - only allow existing users
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email },
                })

                if (!dbUser) {
                    // User doesn't exist in database - deny access
                    console.log(`Access denied: User ${user.email} not found in database`)
                    return false
                }

                // User exists - update their info and allow access
                await prisma.user.update({
                    where: { email: user.email },
                    data: {
                        name: user.name,
                        image: user.image,
                    },
                })
                return true
            } catch (error) {
                console.error("Error in signIn callback:", error)
                return false
            }
        },
        async jwt({ token, user, account }) {
            if (user && user.email) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: user.email },
                        select: { id: true, email: true, name: true, role: true },
                    })

                    if (dbUser) {
                        token.id = dbUser.id
                        token.email = dbUser.email
                        token.name = dbUser.name
                        token.role = dbUser.role
                    }
                } catch (error) {
                    console.error("Error fetching user in jwt callback:", error)
                }
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string
                session.user.role = token.role as UserRole
            }
            return session
        },
        async redirect({ url, baseUrl }) {
            // Redirect to dashboard after sign in
            if (url === baseUrl || url === `${baseUrl}/`) {
                return `${baseUrl}/dashboard`
            }
            // Allow relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`
            // Allow callback URLs on the same origin
            if (new URL(url).origin === baseUrl) return url
            return baseUrl
        },
    },
    pages: {
        signIn: "/login",
    },
    debug: process.env.NODE_ENV === "development",
}