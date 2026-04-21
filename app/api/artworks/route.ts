import { NextRequest, NextResponse } from "next/server";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { artworks, artists, movements, assets } from "@/db/schema";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
type SortKey = "featured" | "newest" | "title" | "artist";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const limit = Math.min(48, Math.max(1, Number(sp.get("limit") ?? PAGE_SIZE)));
  const sortKey = (sp.get("sort") ?? "featured") as SortKey;
  const artistSlug = sp.get("artist") ?? undefined;
  const movementSlug = sp.get("movement") ?? undefined;
  const orientation = sp.get("orientation") ?? undefined;

  const filters: SQL[] = [eq(artworks.publishStatus, "published")];
  if (q) {
    filters.push(
      or(
        ilike(artworks.title, `%${q}%`),
        ilike(artworks.shortDescription, `%${q}%`),
        ilike(artists.name, `%${q}%`),
      )!,
    );
  }
  if (artistSlug) filters.push(eq(artists.slug, artistSlug));
  if (movementSlug) filters.push(eq(movements.slug, movementSlug));
  if (orientation)
    filters.push(
      eq(
        artworks.orientation,
        orientation as "portrait" | "landscape" | "square",
      ),
    );

  const where = and(...filters);

  const orderBy =
    sortKey === "newest"
      ? [desc(artworks.publishedAt)]
      : sortKey === "title"
        ? [asc(artworks.title)]
        : sortKey === "artist"
          ? [asc(artists.name), asc(artworks.title)]
          : [desc(artworks.sortWeight), desc(artworks.publishedAt)];

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: artworks.id,
        slug: artworks.slug,
        title: artworks.title,
        orientation: artworks.orientation,
        yearLabel: artworks.yearLabel,
        shortDescription: artworks.shortDescription,
        artistName: artists.name,
        artistSlug: artists.slug,
        movementName: movements.name,
        movementSlug: movements.slug,
        thumbKey: assets.key,
        thumbWidth: assets.widthPx,
        thumbHeight: assets.heightPx,
      })
      .from(artworks)
      .leftJoin(artists, eq(artists.id, artworks.artistId))
      .leftJoin(movements, eq(movements.id, artworks.movementId))
      .leftJoin(
        assets,
        and(eq(assets.artworkId, artworks.id), eq(assets.kind, "catalog")),
      )
      .where(where)
      .orderBy(...orderBy)
      .limit(limit + 1)
      .offset((page - 1) * limit),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(artworks)
      .leftJoin(artists, eq(artists.id, artworks.artistId))
      .leftJoin(movements, eq(movements.id, artworks.movementId))
      .where(where),
  ]);

  const hasNextPage = rows.length > limit;
  const pageRows = rows.slice(0, limit);

  return NextResponse.json({
    artworks: pageRows,
    total,
    page,
    pageSize: limit,
    hasNextPage,
  });
}
