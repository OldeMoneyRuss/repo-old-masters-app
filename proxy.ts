export const runtime = "nodejs";

import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

function buildCsp(nonce: string): string {
  const cdnHost = process.env.NEXT_PUBLIC_CDN_BASE_URL
    ? (() => {
        try {
          return new URL(process.env.NEXT_PUBLIC_CDN_BASE_URL).hostname;
        } catch {
          return null;
        }
      })()
    : null;
  const cdnSrc = cdnHost ? `https://${cdnHost}` : "";

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://www.googletagmanager.com`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${cdnSrc} https://www.googletagmanager.com`.trimEnd(),
    `font-src 'self'`,
    `connect-src 'self' https://api.stripe.com https://www.google-analytics.com https://analytics.google.com`,
    `frame-src https://js.stripe.com https://hooks.stripe.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join("; ");
}

export default async function proxy(req: NextRequest) {
  const nonce = crypto.randomBytes(16).toString("base64");
  const res = ((await auth(req as Parameters<typeof auth>[0])) ??
    NextResponse.next()) as NextResponse;

  res.headers.set("Content-Security-Policy", buildCsp(nonce));
  res.headers.set("X-Nonce", nonce);
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload",
  );

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
