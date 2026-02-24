import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

type CustomerRow = {
  id: string;
  name: string;
  email: string | null;
  passwordHash: string | null;
  emailVerifiedAt: Date | null;
};

const THIRTY_DAYS = 30 * 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        // Use raw SQL so we never depend on Prisma client schema (emailVerifiedAt, etc.)
        const rows = await prisma.$queryRawUnsafe<CustomerRow[]>(
          `SELECT id, name, email, "passwordHash", "emailVerifiedAt"
           FROM inquiry_pooler."Customer"
           WHERE LOWER(TRIM(email)) = $1
           LIMIT 1`,
          email
        ).catch((err) => {
          console.error("[portal auth] DB query failed:", err);
          return [];
        });
        const customer = rows[0];
        if (!customer) return null;
        if (!customer.passwordHash) return null;
        const ok = await compare(credentials.password, customer.passwordHash);
        if (!ok) return null;
        if (!customer.emailVerifiedAt) return null;
        return {
          id: customer.id,
          email: customer.email ?? undefined,
          name: customer.name,
        };
      },
    }),
  ],
  jwt: { maxAge: THIRTY_DAYS },
  session: {
    strategy: "jwt",
    maxAge: THIRTY_DAYS,
    updateAge: 7 * 24 * 60 * 60, // refresh session every 7 days (was 24h; less frequent = fewer unexpected logouts)
  },
  cookies: {
    sessionToken: {
      name: process.env.NEXTAUTH_URL?.startsWith("https://")
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: THIRTY_DAYS,
        secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      },
    },
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
