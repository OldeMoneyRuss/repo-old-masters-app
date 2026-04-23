import type { NextConfig } from "next";

function cdnHostname(): string | null {
  const base = process.env.CDN_BASE_URL;
  if (!base) return null;
  try {
    return new URL(base).hostname;
  } catch {
    return null;
  }
}

const host = cdnHostname();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: host
      ? [
          { protocol: "https", hostname: host, pathname: "/**" },
          { protocol: "http", hostname: "localhost", pathname: "/**" },
        ]
      : [{ protocol: "http", hostname: "localhost", pathname: "/**" }],
  },
};

export default nextConfig;
