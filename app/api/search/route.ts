import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { artworks, artists, movements, assets } from "@/db/schema";

export const dynamic = "force-dynamic";

const MAX_RESULTS = 30;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) {
    return NextResponse.json({ results: [], query: "" });
  }

  const limit = Math.min(
    MAX_RESULTS,
    Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 20)),
  );

  const term = `%${q}%`;

  const start = Date.now();
  const rows = await db
    .select({
      id: artworks.id,
      slug: artworks.slug,
      title: artworks.title,
      yearLabel: artworks.yearLabel,
      orientation: artworks.orientation,
      artistName: artists.name,
      artistSlug: artists.slug,
      movementName: movements.name,
      thumbKey: assets.key,
      thumbWidth: assets.widthPx,
      thumbHeight: assets.heightPx,
      rank: sql<number>`
        case
          when lower(${artworks.title}) = lower(${q}) then 3
          when lower(${artworks.title}) like lower(${term}) then 2
          else 1
        end
      `,
    })
    .from(artworks)
    .leftJoin(artists, eq(artists.id, artworks.artistId))
    .leftJoin(movements, eq(movements.id, artworks.movementId))
    .leftJoin(
      assets,
      and(eq(assets.artworkId, artworks.id), eq(assets.kind, "thumb")),
    )
    .where(
      and(
        eq(artworks.publishStatus, "published"),
        or(
          ilike(artworks.title, term),
          ilike(artworks.shortDescription, term),
          ilike(artworks.searchVector, term),
          ilike(artists.name, term),
          ilike(movements.name, term),
        )!,
      ),
    )
    .orderBy(sql`rank desc`, artworks.title)
    .limit(limit);

  const elapsed = Date.now() - start;

  return NextResponse.json({
    results: rows,
    query: q,
    count: rows.length,
    elapsedMs: elapsed,
  });
}
