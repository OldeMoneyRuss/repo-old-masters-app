import Link from "next/link";
import Image from "next/image";
import { asc, desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { artworks, artists, movements, assets } from "@/db/schema";
import { publicUrl } from "@/lib/storage";
import { Ornament } from "@/components/storefront/Ornament";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";

export const revalidate = 60;

type FeaturedArtwork = {
  id: string;
  slug: string;
  title: string;
  artistName: string | null;
  catalogKey: string | null;
};

type ArtistOption = { slug: string; name: string };
type MovementOption = {
  slug: string;
  name: string;
  dateRangeLabel: string | null;
};

async function getFeaturedArtworks(): Promise<FeaturedArtwork[]> {
  try {
    return await db
      .select({
        id: artworks.id,
        slug: artworks.slug,
        title: artworks.title,
        artistName: artists.name,
        catalogKey: assets.key,
      })
      .from(artworks)
      .leftJoin(artists, eq(artists.id, artworks.artistId))
      .leftJoin(
        assets,
        and(eq(assets.artworkId, artworks.id), eq(assets.kind, "catalog")),
      )
      .where(eq(artworks.publishStatus, "published"))
      .orderBy(desc(artworks.sortWeight), desc(artworks.publishedAt))
      .limit(8);
  } catch (err) {
    console.warn("[homepage] Featured artworks query failed:", err);
    return [];
  }
}

async function getBrowseData(): Promise<{
  artistList: ArtistOption[];
  movementList: MovementOption[];
}> {
  try {
    const [artistList, movementList] = await Promise.all([
      db
        .select({ slug: artists.slug, name: artists.name })
        .from(artists)
        .orderBy(asc(artists.name))
        .limit(8),
      db
        .select({
          slug: movements.slug,
          name: movements.name,
          dateRangeLabel: movements.dateRangeLabel,
        })
        .from(movements)
        .orderBy(asc(movements.name))
        .limit(8),
    ]);
    return { artistList, movementList };
  } catch (err) {
    console.warn("[homepage] Browse data query failed:", err);
    return { artistList: [], movementList: [] };
  }
}

const sectionLabel =
  "mb-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink-light";

const browseColHead =
  "mb-4 border-b border-[color:var(--border)] pb-2.5 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-light";

const browseLink =
  "block mb-1.5 font-serif text-base leading-snug text-ink hover:text-venetian transition-colors";

const trustItems = [
  {
    icon: "◈",
    title: "Archival giclée printing",
    body: "Pigment inks rated for 100+ years, printed on museum-grade papers including cotton rag and baryta.",
  },
  {
    icon: "◉",
    title: "Rights-cleared originals",
    body: "Every artwork verified public-domain or rights-cleared before it reaches the shop.",
  },
  {
    icon: "◫",
    title: "Six print sizes",
    body: "8×10 through 30×40 inches. Every artwork fitted to preserve the original aspect ratio.",
  },
  {
    icon: "◎",
    title: "Produced in-house",
    body: "Each print made to order and shipped flat-packed with rigid board backing.",
  },
];

const eras: Array<[string, string]> = [
  ["Medieval", "500–1400"],
  ["Renaissance", "1400–1600"],
  ["Baroque", "1600–1750"],
  ["Romanticism", "1780–1850"],
  ["Realism", "1840–1880"],
];

const subjects = ["Portrait", "Mythology", "Religious", "Architecture", "Landscape", "Interior"];

export default async function HomePage() {
  const [featured, { artistList, movementList }] = await Promise.all([
    getFeaturedArtworks(),
    getBrowseData(),
  ]);

  const heroArt = featured[0] ?? null;
  const featuredGrid = featured.slice(0, 8);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="overflow-hidden border-b border-[color:var(--border)] bg-[linear-gradient(160deg,#F5EAD0_0%,#EDE0BE_100%)]">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center gap-16 px-8 py-20">
          <div className="min-w-[280px] flex-[1_1_380px]">
            <p className={sectionLabel}>Museum-quality giclée prints</p>
            <h1 className="mb-6 font-display text-[clamp(40px,6vw,72px)] font-normal leading-[1.08] tracking-tight text-ink">
              The Old Masters,
              <br />
              <em className="not-italic font-display italic text-venetian">reproduced</em>
              <br />
              with fidelity.
            </h1>
            <p className="mb-9 max-w-[420px] font-serif text-[19px] leading-[1.65] text-ink-mid">
              Public-domain masterpieces — from Botticelli to Vermeer — printed on
              archival papers with museum-grade pigment inks.
            </p>
            <div className="flex flex-wrap gap-3.5">
              <Link
                href="/catalog"
                className="bg-venetian px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-cream transition-colors hover:bg-venetian-dark"
              >
                Browse the Collection
              </Link>
              <Link
                href="/catalog?movement=italian-renaissance"
                className="border border-lapis px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-lapis transition-colors hover:bg-lapis hover:text-cream"
              >
                Italian Renaissance
              </Link>
            </div>
            <p className="mt-8 border-t border-[color:var(--border-light)] pt-4 font-sans text-[11px] tracking-[0.08em] text-ink-light">
              SOURCED FROM: UFFIZI · LOUVRE · RIJKSMUSEUM · PRADO · NATIONAL GALLERY
            </p>
          </div>

          {/* Hero painting — framed */}
          <div className="relative flex flex-[1_1_280px] justify-center">
            <div
              className="relative w-full max-w-[320px] border-[14px] border-[#EDE5CE]"
              style={{
                transform: "rotate(-1.8deg)",
                boxShadow: "6px 6px 0 #C9B07A, 0 24px 64px rgba(40,20,0,0.22)",
              }}
            >
              <div className="relative aspect-[2.85/2] w-full bg-[color:var(--parchment-mid)]">
                {heroArt?.catalogKey ? (
                  <Image
                    src={publicUrl(heroArt.catalogKey)}
                    alt={heroArt.title}
                    fill
                    sizes="(min-width: 768px) 320px, 100vw"
                    className="object-cover object-top"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-sans text-xs text-ink-light">
                    Featured artwork
                  </div>
                )}
              </div>
            </div>
            {heroArt && (
              <div className="absolute -bottom-3 right-5 bg-ink px-3.5 py-1.5 font-sans text-[10px] uppercase tracking-[0.15em] text-parchment">
                {heroArt.title}
                {heroArt.artistName && ` · ${heroArt.artistName}`}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Featured works ──────────────────────────────────── */}
      {featuredGrid.length > 0 && (
        <section className="mx-auto max-w-[1180px] px-8 pb-4 pt-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={sectionLabel}>Curated selection</p>
              <h2 className="font-display text-[36px] font-normal tracking-tight text-ink">
                Featured works
              </h2>
            </div>
            <Link
              href="/catalog"
              className="border-b border-lapis pb-0.5 font-sans text-xs uppercase tracking-[0.12em] text-lapis"
            >
              View all works →
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {featuredGrid.map((art) => (
              <li key={art.id}>
                <Link href={`/catalog/${art.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden border border-[color:var(--border-light)] bg-[color:var(--parchment-mid)] shadow-[0_2px_8px_rgba(40,20,0,0.06)] transition-all duration-200 group-hover:border-gold group-hover:shadow-[0_8px_32px_rgba(40,20,0,0.14)]">
                    {art.catalogKey ? (
                      <Image
                        src={publicUrl(art.catalogKey)}
                        alt={art.title}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-contain p-3 transition-transform duration-[400ms] ease-out group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-sans text-xs text-ink-light">
                        artwork image
                      </div>
                    )}
                  </div>
                  <p className="mt-2.5 font-display text-[17px] font-medium leading-[1.25] text-ink transition-colors group-hover:text-venetian">
                    {art.title}
                  </p>
                  <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-ink-light">
                    {art.artistName ?? "Unknown artist"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <Ornament className="mt-14" />
        </section>
      )}

      {/* ── Browse by Facet ─────────────────────────────────── */}
      <section className="border-y border-[color:var(--border)] bg-[#EDE0BE]">
        <div className="mx-auto max-w-[1180px] px-8 py-16">
          <div className="mb-12 text-center">
            <p className="mb-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-gold">
              Explore the Catalogue
            </p>
            <h2 className="font-display text-[38px] font-normal text-ink">
              Browse the collection
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className={browseColHead}>By Artist</p>
              {artistList.length === 0 ? (
                <p className="font-serif text-sm text-ink-light">Coming soon</p>
              ) : (
                artistList.slice(0, 7).map((a) => (
                  <Link key={a.slug} href={`/catalog?artist=${a.slug}`} className={browseLink}>
                    {a.name}
                  </Link>
                ))
              )}
              {artistList.length > 0 && (
                <Link
                  href="/artists"
                  className="mt-2 block font-sans text-[11px] uppercase tracking-[0.08em] text-gold"
                >
                  All artists →
                </Link>
              )}
            </div>
            <div>
              <p className={browseColHead}>By Movement</p>
              {movementList.length === 0 ? (
                <p className="font-serif text-sm text-ink-light">Coming soon</p>
              ) : (
                movementList.map((m) => (
                  <Link key={m.slug} href={`/catalog?movement=${m.slug}`} className={browseLink}>
                    {m.name}
                    {m.dateRangeLabel && (
                      <span className="text-sm text-ink-light"> ({m.dateRangeLabel})</span>
                    )}
                  </Link>
                ))
              )}
            </div>
            <div>
              <p className={browseColHead}>By Era</p>
              {eras.map(([era, dates]) => (
                <Link key={era} href={`/catalog?q=${era.toLowerCase()}`} className={browseLink}>
                  {era} <span className="text-sm text-ink-light">({dates})</span>
                </Link>
              ))}
            </div>
            <div>
              <p className={browseColHead}>By Subject</p>
              {subjects.map((tag) => (
                <Link
                  key={tag}
                  href={`/catalog?q=${tag.toLowerCase()}`}
                  className={browseLink}
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust signals ───────────────────────────────────── */}
      <section className="mx-auto max-w-[1180px] px-8 py-20">
        <div className="mb-12 text-center">
          <p className={sectionLabel}>Why Old Masters Print Shop</p>
          <h2 className="font-display text-[38px] font-normal text-ink">
            Craftsmanship in every print
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => (
            <li
              key={item.title}
              className="border border-[color:var(--border-light)] bg-cream px-7 py-9 text-center"
            >
              <div className="mb-4 font-display text-[28px] text-gold">{item.icon}</div>
              <h3 className="mb-2.5 font-display text-[21px] font-medium text-ink">
                {item.title}
              </h3>
              <p className="font-serif text-[15px] leading-[1.65] text-ink-mid">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Newsletter ──────────────────────────────────────── */}
      <section className="bg-ink px-8 py-16 text-center">
        <p className="mb-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-gold">
          New Arrivals & Updates
        </p>
        <h2 className="mb-3 font-display text-[36px] font-normal text-parchment">
          Join the collection
        </h2>
        <p className="mx-auto mb-8 max-w-[440px] font-serif text-[17px] text-ink-light">
          New artworks added regularly. Be the first to know.
        </p>
        <NewsletterForm />
      </section>
    </>
  );
}
