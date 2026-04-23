import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { movements, artworks, assets, artists } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [movement] = await db
    .select()
    .from(movements)
    .where(eq(movements.slug, slug))
    .limit(1);

  if (!movement) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const movementArtworks = await db
    .select({
      id: artworks.id,
      slug: artworks.slug,
      title: artworks.title,
      yearLabel: artworks.yearLabel,
      orientation: artworks.orientation,
      artistName: artists.name,
      artistSlug: artists.slug,
      thumbKey: assets.key,
      thumbWidth: assets.widthPx,
      thumbHeight: assets.heightPx,
    })
    .from(artworks)
    .leftJoin(artists, eq(artists.id, artworks.artistId))
    .leftJoin(
      assets,
      and(eq(assets.artworkId, artworks.id), eq(assets.kind, "catalog")),
    )
    .where(
      and(
        eq(artworks.movementId, movement.id),
        eq(artworks.publishStatus, "published"),
      ),
    )
    .orderBy(asc(artworks.title));

  return NextResponse.json({ movement, artworks: movementArtworks });
}
