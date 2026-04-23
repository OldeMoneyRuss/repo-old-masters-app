import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  artworks,
  artists,
  movements,
  museums,
  assets,
  artworkSizeEligibility,
} from "@/db/schema";
import { publicUrl } from "@/lib/storage";
import { getPricing } from "@/lib/pricing";
import { PdpConfigurator } from "@/components/storefront/PdpConfigurator";

export const revalidate = 300;

type Params = { slug: string };

async function loadArtwork(slug: string) {
  const [row] = await db
    .select({
      id: artworks.id,
      slug: artworks.slug,
      title: artworks.title,
      yearLabel: artworks.yearLabel,
      shortDescription: artworks.shortDescription,
      longDescription: artworks.longDescription,
      publishStatus: artworks.publishStatus,
      seoTitle: artworks.seoTitle,
      seoDescription: artworks.seoDescription,
      canonicalUrl: artworks.canonicalUrl,
      artistId: artworks.artistId,
      movementId: artworks.movementId,
      artistName: artists.name,
      artistSlug: artists.slug,
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
    .where(eq(artworks.slug, slug))
    .limit(1);
  return row ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artwork = await loadArtwork(slug);
  if (!artwork || artwork.publishStatus !== "published") {
    return { title: "Artwork not found" };
  }

  const [pdpAsset] = await db
    .select({ key: assets.key })
    .from(assets)
    .where(
      and(eq(assets.artworkId, artwork.id), eq(assets.kind, "pdp")),
    )
    .limit(1);

  const title =
    artwork.seoTitle ??
    `${artwork.title}${artwork.artistName ? ` — ${artwork.artistName}` : ""} | Old Masters Print Shop`;
  const description =
    artwork.seoDescription ??
    artwork.shortDescription ??
    `Museum-quality giclée print of ${artwork.title}.`;

  const pdpUrl = pdpAsset?.key ? publicUrl(pdpAsset.key) : undefined;

  return {
    title,
    description,
    alternates: artwork.canonicalUrl ? { canonical: artwork.canonicalUrl } : undefined,
    openGraph: {
      title,
      description,
      type: "article",
      images: pdpUrl ? [{ url: pdpUrl, alt: artwork.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: pdpUrl ? [pdpUrl] : undefined,
    },
  };
}

export default async function ArtworkDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const artwork = await loadArtwork(slug);

  if (!artwork || artwork.publishStatus !== "published") {
    notFound();
  }

  const [assetRows, eligibilityRows, pricingSnap] = await Promise.all([
    db
      .select({
        kind: assets.kind,
        key: assets.key,
        widthPx: assets.widthPx,
        heightPx: assets.heightPx,
        dominantColors: assets.dominantColors,
      })
      .from(assets)
      .where(
        and(
          eq(assets.artworkId, artwork.id),
          inArray(assets.kind, ["pdp", "zoom", "catalog"] as const),
        ),
      ),
    db
      .select({
        printSize: artworkSizeEligibility.printSize,
        eligible: artworkSizeEligibility.eligible,
        borderTreatment: artworkSizeEligibility.borderTreatment,
      })
      .from(artworkSizeEligibility)
      .where(eq(artworkSizeEligibility.artworkId, artwork.id)),
    getPricing(),
  ]);

  const pdpAsset = assetRows.find((a) => a.kind === "pdp") ?? null;
  const zoomAsset = assetRows.find((a) => a.kind === "zoom") ?? null;
  const catalogAsset = assetRows.find((a) => a.kind === "catalog") ?? null;
  const primaryAsset = pdpAsset ?? catalogAsset;

  const dominantColors = primaryAsset?.dominantColors ?? [];

  const [relatedByArtistRows, relatedByMovementRows] = await Promise.all([
    artwork.artistId
      ? db
          .select({
            slug: artworks.slug,
            title: artworks.title,
            catalogKey: assets.key,
            artistName: artists.name,
          })
          .from(artworks)
          .leftJoin(artists, eq(artists.id, artworks.artistId))
          .leftJoin(
            assets,
            and(eq(assets.artworkId, artworks.id), eq(assets.kind, "catalog")),
          )
          .where(
            and(
              eq(artworks.artistId, artwork.artistId),
              eq(artworks.publishStatus, "published"),
              ne(artworks.id, artwork.id),
            ),
          )
          .orderBy(desc(artworks.sortWeight), asc(artworks.title))
          .limit(6)
      : Promise.resolve([] as Array<{
          slug: string;
          title: string;
          catalogKey: string | null;
          artistName: string | null;
        }>),
    artwork.movementId
      ? db
          .select({
            slug: artworks.slug,
            title: artworks.title,
            catalogKey: assets.key,
            artistName: artists.name,
          })
          .from(artworks)
          .leftJoin(artists, eq(artists.id, artworks.artistId))
          .leftJoin(
            assets,
            and(eq(assets.artworkId, artworks.id), eq(assets.kind, "catalog")),
          )
          .where(
            and(
              eq(artworks.movementId, artwork.movementId),
              eq(artworks.publishStatus, "published"),
              ne(artworks.id, artwork.id),
            ),
          )
          .orderBy(desc(artworks.sortWeight), asc(artworks.title))
          .limit(6)
      : Promise.resolve([] as Array<{
          slug: string;
          title: string;
          catalogKey: string | null;
          artistName: string | null;
        }>),
  ]);

  return (
    <PdpConfigurator
      artwork={{
        id: artwork.id,
        title: artwork.title,
        artistName: artwork.artistName,
        artistSlug: artwork.artistSlug,
        movementName: artwork.movementName,
        movementSlug: artwork.movementSlug,
        museumName: artwork.museumName,
        museumCity: artwork.museumCity,
        museumExternalUrl: artwork.museumExternalUrl,
        yearLabel: artwork.yearLabel,
        shortDescription: artwork.shortDescription,
        longDescription: artwork.longDescription,
        pdpKey: pdpAsset?.key ?? null,
        zoomKey: zoomAsset?.key ?? null,
        dominantColors,
      }}
      eligibility={eligibilityRows.map((e) => ({
        printSize: e.printSize,
        eligible: e.eligible,
        borderTreatment: e.borderTreatment,
      }))}
      pricingSnap={pricingSnap}
      relatedByArtist={relatedByArtistRows}
      relatedByMovement={relatedByMovementRows}
    />
  );
}
