import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { artists, artworks, assets, movements } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [artist] = await db
    .select()
    .from(artists)
    .where(eq(artists.slug, slug))
    .limit(1);

  if (!artist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const artistArtworks = await db
    .select({
      id: artworks.id,
      slug: artworks.slug,
      title: artworks.title,
      yearLabel: artworks.yearLabel,
      orientation: artworks.orientation,
      movementName: movements.name,
      movementSlug: movements.slug,
      thumbKey: assets.key,
      thumbWidth: assets.widthPx,
      thumbHeight: assets.heightPx,
    })
    .from(artworks)
    .leftJoin(movements, eq(movements.id, artworks.movementId))
    .leftJoin(
      assets,
      and(eq(assets.artworkId, artworks.id), eq(assets.kind, "catalog")),
    )
    .where(
      and(
        eq(artworks.artistId, artist.id),
        eq(artworks.publishStatus, "published"),
      ),
    )
    .orderBy(asc(artworks.title));

  return NextResponse.json({ artist, artworks: artistArtworks });
}
