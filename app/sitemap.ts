import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { artworks } from "@/db/schema";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://oldmastersprint.shop";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/catalog`, changeFrequency: "daily", priority: 0.9 },
  ];

  let artworkRoutes: MetadataRoute.Sitemap = [];
  try {
    const rows = await db
      .select({ slug: artworks.slug, updatedAt: artworks.updatedAt })
      .from(artworks)
      .where(eq(artworks.publishStatus, "published"));

    artworkRoutes = rows.map((r) => ({
      url: `${siteUrl}/catalog/${r.slug}`,
      lastModified: r.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable at build time — skip dynamic routes
  }

  return [...staticRoutes, ...artworkRoutes];
}
