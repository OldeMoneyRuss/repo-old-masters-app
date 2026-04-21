import Link from "next/link";
import Image from "next/image";
import { asc, desc, eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { artworks, artists, movements, assets } from "@/db/schema";
import { publicUrl } from "@/lib/storage";

export const revalidate = 60;

async function getFeaturedArtworks() {
  return db
    .select({
      id: artworks.id,
      slug: artworks.slug,
      title: artworks.title,
      artistName: artists.name,
      catalogKey: assets.key,
      catalogWidth: assets.widthPx,
      catalogHeight: assets.heightPx,
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
}

async function getBrowseData() {
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
}

export default async function HomePage() {
  const [featured, { artistList, movementList }] = await Promise.all([
    getFeaturedArtworks(),
    getBrowseData(),
  ]);

  const heroArtwork = featured[0] ?? null;

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-10 px-6 py-20 md:flex-row md:py-28 lg:py-36">
          <div className="flex-1 text-center md:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">
              Museum-quality giclée prints
            </p>
            <h1 className="mt-5 font-serif text-4xl leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              The Old Masters,<br />
              reproduced with<br />
              uncompromising fidelity.
            </h1>
            <p className="mt-6 max-w-prose text-lg text-zinc-400">
              Public-domain and rights-cleared masterpieces, printed on archival
              papers with museum-grade pigment inks. Shipped worldwide.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4 md:justify-start">
              <Link
                href="/catalog"
                className="rounded-full bg-amber-500 px-8 py-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400"
              >
                Browse the Collection
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-zinc-700 px-8 py-3.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
              >
                About the Shop
              </Link>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative w-full max-w-sm flex-shrink-0 md:max-w-xs lg:max-w-sm">
            <div className="aspect-[3/4] overflow-hidden rounded-lg shadow-2xl">
              {heroArtwork?.catalogKey ? (
                <Image
                  src={publicUrl(heroArtwork.catalogKey)}
                  alt={heroArtwork.title}
                  fill
                  sizes="(min-width: 768px) 320px, 100vw"
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-zinc-800 text-zinc-500 text-sm">
                  Featured artwork
                </div>
              )}
            </div>
            {heroArtwork && (
              <p className="mt-3 text-center text-xs text-zinc-500">
                {heroArtwork.title}
                {heroArtwork.artistName && ` — ${heroArtwork.artistName}`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Featured artworks ────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="font-serif text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">
              Featured works
            </h2>
            <Link
              href="/catalog"
              className="text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
            >
              View all →
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((art) => (
              <li key={art.id}>
                <Link href={`/catalog/${art.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                    {art.catalogKey ? (
                      <Image
                        src={publicUrl(art.catalogKey)}
                        alt={art.title}
                        fill
                        sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                        className="object-contain transition duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="mt-2 font-serif text-sm leading-snug text-zinc-900 group-hover:underline dark:text-zinc-50">
                    {art.title}
                  </p>
                  <p className="text-xs text-zinc-500">{art.artistName ?? "Unknown artist"}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Browse by facet ──────────────────────────────────────── */}
      <section className="border-y border-zinc-200 bg-zinc-50 py-16 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-10 font-serif text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">
            Browse the collection
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* By Artist */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                By Artist
              </h3>
              <ul className="space-y-1.5">
                {artistList.map((a) => (
                  <li key={a.slug}>
                    <Link
                      href={`/catalog?artist=${a.slug}`}
                      className="text-sm text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-white"
                    >
                      {a.name}
                    </Link>
                  </li>
                ))}
                {artistList.length === 0 && (
                  <li className="text-sm text-zinc-400">Coming soon</li>
                )}
              </ul>
              {artistList.length > 0 && (
                <Link
                  href="/artists"
                  className="mt-3 block text-xs text-amber-600 hover:underline dark:text-amber-400"
                >
                  All artists →
                </Link>
              )}
            </div>

            {/* By Movement */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                By Movement
              </h3>
              <ul className="space-y-1.5">
                {movementList.map((m) => (
                  <li key={m.slug}>
                    <Link
                      href={`/catalog?movement=${m.slug}`}
                      className="text-sm text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-white"
                    >
                      {m.name}
                      {m.dateRangeLabel && (
                        <span className="ml-1 text-zinc-400">
                          ({m.dateRangeLabel})
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
                {movementList.length === 0 && (
                  <li className="text-sm text-zinc-400">Coming soon</li>
                )}
              </ul>
              {movementList.length > 0 && (
                <Link
                  href="/movements"
                  className="mt-3 block text-xs text-amber-600 hover:underline dark:text-amber-400"
                >
                  All movements →
                </Link>
              )}
            </div>

            {/* By Era */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                By Era
              </h3>
              <ul className="space-y-1.5">
                {[
                  { label: "Medieval (500–1400)", q: "medieval" },
                  { label: "Renaissance (1400–1600)", q: "renaissance" },
                  { label: "Baroque (1600–1750)", q: "baroque" },
                  { label: "Romanticism (1800–1850)", q: "romanticism" },
                  { label: "Impressionism (1860–1900)", q: "impressionism" },
                ].map((era) => (
                  <li key={era.q}>
                    <Link
                      href={`/catalog?q=${era.q}`}
                      className="text-sm text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-white"
                    >
                      {era.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* By Orientation */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                By Format
              </h3>
              <ul className="space-y-1.5">
                {[
                  { label: "Portrait", value: "portrait" },
                  { label: "Landscape", value: "landscape" },
                  { label: "Square", value: "square" },
                ].map((o) => (
                  <li key={o.value}>
                    <Link
                      href={`/catalog?orientation=${o.value}`}
                      className="text-sm text-zinc-700 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-white"
                    >
                      {o.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Print Sizes
                </h3>
                <ul className="space-y-1.5">
                  {["8×10", "11×14", "16×20", "18×24", "24×36", "30×40"].map(
                    (s) => (
                      <li
                        key={s}
                        className="text-sm text-zinc-700 dark:text-zinc-300"
                      >
                        {s}&Prime;
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust signals ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="sr-only">Why Old Masters Print Shop</h2>
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: "🖨",
              title: "Archival giclée printing",
              body: "Pigment inks rated for 100+ years on museum-grade papers including cotton rag and baryta.",
            },
            {
              icon: "✅",
              title: "Rights-cleared originals",
              body: "Every artwork verified public-domain or rights-cleared before it reaches the shop.",
            },
            {
              icon: "📐",
              title: "Six print sizes",
              body: "8×10 through 30×40 inches. Every artwork fitted to preserve the original aspect ratio.",
            },
            {
              icon: "🚚",
              title: "Worldwide shipping",
              body: "Flat-packed with rigid backing. Standard and expedited options at checkout.",
            },
          ].map((item) => (
            <li
              key={item.title}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800"
            >
              <span className="text-3xl" role="img" aria-hidden>
                {item.icon}
              </span>
              <h3 className="font-serif text-lg text-zinc-900 dark:text-zinc-50">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
