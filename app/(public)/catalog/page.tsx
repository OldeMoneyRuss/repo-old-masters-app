import Link from "next/link";
import Image from "next/image";
import { and, asc, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { artworks, artists, movements, assets } from "@/db/schema";
import { publicUrl } from "@/lib/storage";
import { Ornament } from "@/components/storefront/Ornament";

export const dynamic = "force-dynamic";

type SortKey = "featured" | "newest" | "title" | "artist";

const PAGE_SIZE = 24;

const fieldLabel =
  "mb-1.5 font-sans text-[10px] uppercase tracking-[0.15em] text-ink-light";

const inputClass =
  "w-full border border-[color:var(--border)] bg-cream px-3.5 py-2.5 font-serif text-base text-ink outline-none focus:border-lapis";

const selectClass = `${inputClass} cursor-pointer appearance-none`;

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

  const activeFilters: Array<{ label: string; clearHref: string }> = [];
  if (sp.artist) {
    const a = artistOptions.find((o) => o.slug === sp.artist);
    activeFilters.push({
      label: a?.name ?? sp.artist,
      clearHref: `/catalog${mkQs({ artist: undefined })}`,
    });
  }
  if (sp.movement) {
    const m = movementOptions.find((o) => o.slug === sp.movement);
    activeFilters.push({
      label: m?.name ?? sp.movement,
      clearHref: `/catalog${mkQs({ movement: undefined })}`,
    });
  }
  if (sp.orientation) {
    activeFilters.push({
      label: sp.orientation,
      clearHref: `/catalog${mkQs({ orientation: undefined })}`,
    });
  }
  if (q) {
    activeFilters.push({
      label: `“${q}”`,
      clearHref: `/catalog${mkQs({ q: undefined })}`,
    });
  }

  return (
    <section className="mx-auto max-w-[1180px] px-8 py-12">
      <header className="mb-9">
        <p className="mb-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink-light">
          The Collection
        </p>
        <h1 className="font-display text-[48px] font-normal tracking-tight text-ink">
          Catalogue
        </h1>
        <p className="mt-1 font-serif text-base text-ink-light">
          {totalCount} {totalCount === 1 ? "artwork" : "artworks"}
          {activeFilters.length > 0 ? " matching current filters" : " in the collection"}
        </p>
      </header>

      <form
        method="get"
        className="mb-7 flex flex-wrap items-end gap-3 border border-[color:var(--border)] bg-cream px-6 py-5"
      >
        <div className="min-w-0 flex-[1_1_220px]">
          <p className={fieldLabel}>Search</p>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Title, artist, movement…"
            className={inputClass}
          />
        </div>
        <div className="min-w-0 flex-[1_1_160px]">
          <p className={fieldLabel}>Artist</p>
          <select name="artist" defaultValue={sp.artist ?? ""} className={selectClass}>
            <option value="">All artists</option>
            {artistOptions.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-[1_1_160px]">
          <p className={fieldLabel}>Movement</p>
          <select name="movement" defaultValue={sp.movement ?? ""} className={selectClass}>
            <option value="">All movements</option>
            {movementOptions.map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-[1_1_130px]">
          <p className={fieldLabel}>Format</p>
          <select
            name="orientation"
            defaultValue={sp.orientation ?? ""}
            className={selectClass}
          >
            <option value="">Any</option>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
            <option value="square">Square</option>
          </select>
        </div>
        <div className="min-w-0 flex-[1_1_130px]">
          <p className={fieldLabel}>Sort</p>
          <select name="sort" defaultValue={sortKey} className={selectClass}>
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="title">Title A–Z</option>
            <option value="artist">Artist A–Z</option>
          </select>
        </div>
        <div className="flex w-full gap-2">
          <button
            type="submit"
            className="bg-ink px-6 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.1em] text-cream transition-colors hover:bg-venetian"
          >
            Apply
          </button>
          <Link
            href="/catalog"
            className="border border-[color:var(--border)] px-6 py-2.5 font-sans text-xs font-medium uppercase tracking-[0.1em] text-ink-mid transition-colors hover:border-ink"
          >
            Reset
          </Link>
        </div>
      </form>

      {activeFilters.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {activeFilters.map((f) => (
            <Link
              key={f.label}
              href={f.clearHref}
              className="flex items-center gap-1.5 border border-lapis px-3 py-1.5 font-sans text-[11px] tracking-[0.08em] text-lapis"
            >
              {f.label} <span className="text-sm leading-none">×</span>
            </Link>
          ))}
          <Link
            href="/catalog"
            className="border border-[color:var(--border)] px-3 py-1.5 font-sans text-[11px] tracking-[0.08em] text-ink-light"
          >
            Clear all
          </Link>
        </div>
      )}

      {pageRows.length === 0 ? (
        <div className="px-8 py-20 text-center">
          <p className="font-display text-[28px] text-ink-light">
            No artworks match these filters.
          </p>
          <Link
            href="/catalog"
            className="mt-5 inline-block font-sans text-xs uppercase tracking-[0.08em] text-lapis underline"
          >
            Clear all filters
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-7 sm:grid-cols-3 lg:grid-cols-5">
          {pageRows.map((r) => (
            <li key={r.id}>
              <Link href={`/catalog/${r.slug}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden border border-[color:var(--border-light)] bg-[color:var(--parchment-mid)] shadow-[0_2px_8px_rgba(40,20,0,0.06)] transition-all duration-200 group-hover:border-gold group-hover:shadow-[0_8px_32px_rgba(40,20,0,0.14)]">
                  {r.catalogKey ? (
                    <Image
                      src={publicUrl(r.catalogKey)}
                      alt={r.title}
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                      className="object-contain p-3 transition-transform duration-[400ms] ease-out group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center font-sans text-xs text-ink-light">
                      artwork image
                    </div>
                  )}
                </div>
                <p className="mt-2.5 font-display text-[17px] font-medium leading-[1.25] text-ink transition-colors group-hover:text-venetian">
                  {r.title}
                </p>
                <p className="font-sans text-[11px] uppercase tracking-[0.1em] text-ink-light">
                  {r.artistName ?? "Unknown artist"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <nav className="mt-12 flex items-center justify-between font-sans text-xs uppercase tracking-[0.08em]">
        {page > 1 ? (
          <Link href={`/catalog${mkQs({ page: String(page - 1) })}`} className="text-lapis">
            ← Previous
          </Link>
        ) : (
          <span className="text-ink-light/60">← Previous</span>
        )}
        <span className="text-ink-light">Page {page}</span>
        {hasNextPage ? (
          <Link href={`/catalog${mkQs({ page: String(page + 1) })}`} className="text-lapis">
            Next →
          </Link>
        ) : (
          <span className="text-ink-light/60">Next →</span>
        )}
      </nav>

      <Ornament className="mt-16" />
    </section>
  );
}
