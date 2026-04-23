import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  artworks,
  artists,
  movements,
  museums,
  assets,
  artworkSizeEligibility,
} from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const [row] = await db
    .select({
      id: artworks.id,
      slug: artworks.slug,
      title: artworks.title,
      yearLabel: artworks.yearLabel,
      shortDescription: artworks.shortDescription,
      longDescription: artworks.longDescription,
      provenanceNote: artworks.provenanceNote,
      subjectTags: artworks.subjectTags,
      orientation: artworks.orientation,
      publishedAt: artworks.publishedAt,
      canonicalUrl: artworks.canonicalUrl,
      seoTitle: artworks.seoTitle,
      seoDescription: artworks.seoDescription,
      artistId: artworks.artistId,
      artistName: artists.name,
      artistSlug: artists.slug,
      artistBio: artists.bio,
      movementName: movements.name,
      movementSlug: movements.slug,
      museumName: museums.name,
      museumCity: museums.city,
      museumExternalUrl: museums.externalUrl,
    })
    .from(artworks)
    .leftJoin(artists, eq(artists.id, artworks.artistId))
    .leftJoin(movements, eq(movements.id, artworks.movementId))
    .leftJoin(museums, eq(museums.id, artworks.museumId))
    .where(
      and(eq(artworks.slug, slug), eq(artworks.publishStatus, "published")),
    )
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [artworkAssets, eligibility] = await Promise.all([
    db
      .select({
        kind: assets.kind,
        key: assets.key,
        widthPx: assets.widthPx,
        heightPx: assets.heightPx,
        dominantColors: assets.dominantColors,
      })
      .from(assets)
      .where(eq(assets.artworkId, row.id)),
    db
      .select({
        printSize: artworkSizeEligibility.printSize,
        dpi: artworkSizeEligibility.dpi,
        eligible: artworkSizeEligibility.eligible,
        borderTreatment: artworkSizeEligibility.borderTreatment,
      })
      .from(artworkSizeEligibility)
      .where(eq(artworkSizeEligibility.artworkId, row.id)),
  ]);

  return NextResponse.json({ ...row, assets: artworkAssets, eligibility });
}
