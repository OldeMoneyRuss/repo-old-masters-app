import type { NextAuthConfig } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: "customer" | "admin" | "super_admin";
    emailVerified?: Date | null;
  }
  interface Session {
    user: {
      id: string;
      role: "customer" | "admin" | "super_admin";
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }
}

/**
 * Edge-safe base config. No providers that require Node-only deps
 * (argon2, pg, etc.). The middleware imports this directly; the full
 * config in lib/auth/index.ts extends it by adding the Credentials
 * provider.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: {
    signIn: "/login",
    error: "/login",
    verifyRequest: "/verify",
  },
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "customer";
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role =
          (token.role as "customer" | "admin" | "super_admin") ?? "customer";
      }
      return session;
    },
    authorized({ request, auth: session }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/admin")) {
        const role = session?.user?.role;
        return role === "admin" || role === "super_admin";
      }
      if (pathname.startsWith("/account")) {
        return !!session?.user;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
