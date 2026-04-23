import Link from "next/link";
import Image from "next/image";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { artworks, artists, movements, assets } from "@/db/schema";
import { publicUrl } from "@/lib/storage";

export const dynamic = "force-dynamic";

type SortKey = "featured" | "newest" | "title" | "artist";

const PAGE_SIZE = 24;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    artist?: string;
    movement?: string;
    orientation?: "portrait" | "landscape" | "square";
    sort?: SortKey;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? 1));
  const sortKey: SortKey = (sp.sort as SortKey) ?? "featured";

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
  if (sp.artist) filters.push(eq(artists.slug, sp.artist));
  if (sp.movement) filters.push(eq(movements.slug, sp.movement));
  if (sp.orientation) filters.push(eq(artworks.orientation, sp.orientation));

  const where = and(...filters);

  const orderBy =
    sortKey === "newest"
      ? [desc(artworks.publishedAt)]
      : sortKey === "title"
        ? [asc(artworks.title)]
        : sortKey === "artist"
          ? [asc(artists.name), asc(artworks.title)]
          : [desc(artworks.sortWeight), desc(artworks.publishedAt)];

  const rows = await db
    .select({
      id: artworks.id,
      slug: artworks.slug,
      title: artworks.title,
      orientation: artworks.orientation,
      artistName: artists.name,
      movementName: movements.name,
      catalogKey: assets.key,
      catalogWidth: assets.widthPx,
      catalogHeight: assets.heightPx,
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
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);

  const hasNextPage = rows.length > PAGE_SIZE;
  const pageRows = rows.slice(0, PAGE_SIZE);

  const [{ count: totalCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(artworks)
    .leftJoin(artists, eq(artists.id, artworks.artistId))
    .leftJoin(movements, eq(movements.id, artworks.movementId))
    .where(where);

  const [artistOptions, movementOptions] = await Promise.all([
    db
      .select({ slug: artists.slug, name: artists.name })
      .from(artists)
      .orderBy(asc(artists.name)),
    db
      .select({ slug: movements.slug, name: movements.name })
      .from(movements)
      .orderBy(asc(movements.name)),
  ]);

  const mkQs = (overrides: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    const cur: Record<string, string | undefined> = {
      q: q || undefined,
      artist: sp.artist,
      movement: sp.movement,
      orientation: sp.orientation,
      sort: sortKey === "featured" ? undefined : sortKey,
      page: page === 1 ? undefined : String(page),
      ...overrides,
    };
    for (const [k, v] of Object.entries(cur)) if (v) usp.set(k, v);
    const s = usp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8 flex flex-col gap-1">
        <h1 className="font-serif text-4xl tracking-tight text-zinc-900 dark:text-zinc-50">
          Catalog
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {totalCount} {totalCount === 1 ? "artwork" : "artworks"}
        </p>
      </header>

      <form
        method="get"
        className="mb-8 grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-5 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search title, description, artist"
          className="md:col-span-2 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <select
          name="artist"
          defaultValue={sp.artist ?? ""}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All artists</option>
          {artistOptions.map((a) => (
            <option key={a.slug} value={a.slug}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          name="movement"
          defaultValue={sp.movement ?? ""}
          className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">All movements</option>
          {movementOptions.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            name="orientation"
            defaultValue={sp.orientation ?? ""}
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Any shape</option>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
            <option value="square">Square</option>
          </select>
          <select
            name="sort"
            defaultValue={sortKey}
            className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="title">Title A–Z</option>
            <option value="artist">Artist A–Z</option>
          </select>
        </div>
        <div className="md:col-span-5 flex gap-3">
          <button
            type="submit"
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
          >
            Apply
          </button>
          <Link
            href="/catalog"
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium dark:border-zinc-700"
          >
            Reset
          </Link>
        </div>
      </form>

      {pageRows.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No artworks match these filters.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {pageRows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/catalog/${r.slug}`}
                className="group flex flex-col gap-2"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                  {r.catalogKey ? (
                    <Image
                      src={publicUrl(r.catalogKey)}
                      alt={r.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                      className="object-contain transition duration-200 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                      No image
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-serif text-base leading-snug text-zinc-900 group-hover:underline dark:text-zinc-50">
                    {r.title}
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {r.artistName ?? "Unknown artist"}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <nav className="mt-10 flex items-center justify-between text-sm">
        {page > 1 ? (
          <Link href={`/catalog${mkQs({ page: String(page - 1) })}`} className="underline">
            ← Previous
          </Link>
        ) : (
          <span className="text-zinc-400">← Previous</span>
        )}
        <span className="text-zinc-500">Page {page}</span>
        {hasNextPage ? (
          <Link href={`/catalog${mkQs({ page: String(page + 1) })}`} className="underline">
            Next →
          </Link>
        ) : (
          <span className="text-zinc-400">Next →</span>
        )}
      </nav>
    </section>
  );
}
