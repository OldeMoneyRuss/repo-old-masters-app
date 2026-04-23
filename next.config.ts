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

  async headers() {
    return [
      // Immutable cache for hashed CDN image derivatives served through Next
      {
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // API pricing endpoint: short shared cache so CDN can serve it
      {
        source: "/api/pricing",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=300",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
