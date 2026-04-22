"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { publicUrl } from "@/lib/storage";
import { unitPriceCents, type PricingSnapshot } from "@/lib/pricing";

type RelatedCard = {
  slug: string;
  title: string;
  catalogKey: string | null;
  artistName: string | null;
};

type Props = {
  artwork: {
    id: string;
    title: string;
    artistName: string | null;
    artistSlug: string | null;
    movementName: string | null;
    movementSlug: string | null;
    museumName: string | null;
    museumCity: string | null;
    museumExternalUrl: string | null;
    yearLabel: string | null;
    shortDescription: string | null;
    longDescription: string | null;
    pdpKey: string | null;
    zoomKey: string | null;
    dominantColors: string[];
  };
  eligibility: Array<{
    printSize: string;
    eligible: boolean;
    borderTreatment: string;
  }>;
  pricingSnap: PricingSnapshot;
  relatedByArtist: RelatedCard[];
  relatedByMovement: RelatedCard[];
};

const PRINT_SIZES = [
  "8x10",
  "11x14",
  "16x20",
  "18x24",
  "24x36",
  "30x40",
] as const;

const PAPER_TYPES = ["archival_matte", "lustre", "fine_art_cotton"] as const;

const PAPER_LABELS: Record<string, { name: string; desc: string }> = {
  archival_matte: { name: "Premium Matte", desc: "Deep blacks, no glare" },
  lustre: { name: "Lustre", desc: "Slight sheen, vibrant colors" },
  fine_art_cotton: { name: "Cotton Rag", desc: "Textured museum finish" },
};

const READ_MORE_THRESHOLD = 300;

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatSignedCents(cents: number): string {
  if (cents === 0) return "included";
  const sign = cents > 0 ? "+" : "−";
  return `${sign}${formatCents(Math.abs(cents))}`;
}

export function PdpConfigurator({
  artwork,
  eligibility,
  pricingSnap,
  relatedByArtist,
  relatedByMovement,
}: Props) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [zooming, setZooming] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number }>({
    x: 0.5,
    y: 0.5,
  });
  const imageWrapRef = useRef<HTMLDivElement | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const eligibilityMap = useMemo(() => {
    const m = new Map<string, { eligible: boolean; borderTreatment: string }>();
    for (const row of eligibility) {
      m.set(row.printSize, {
        eligible: row.eligible,
        borderTreatment: row.borderTreatment,
      });
    }
    return m;
  }, [eligibility]);

  const priceCents =
    selectedSize && selectedPaper
      ? unitPriceCents(pricingSnap, {
          printSize: selectedSize,
          paperType: selectedPaper,
        })
      : null;

  const canAdd = Boolean(selectedSize && selectedPaper) && !adding;

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  async function addToCart() {
    if (!selectedSize || !selectedPaper) return;
    setAdding(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/cart/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artworkId: artwork.id,
          printSize: selectedSize,
          paperType: selectedPaper,
        }),
      });
      if (!res.ok) {
        setErrorMsg("Could not add to cart. Please try again.");
        return;
      }
      setAdded(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setAdded(false), 2000);
    } catch {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = imageWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setCursor({
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    });
  }

  function onTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    const el = imageWrapRef.current;
    if (!el || e.touches.length === 0) return;
    const t = e.touches[0];
    const rect = el.getBoundingClientRect();
    const x = (t.clientX - rect.left) / rect.width;
    const y = (t.clientY - rect.top) / rect.height;
    setCursor({
      x: Math.max(0, Math.min(1, x)),
      y: Math.max(0, Math.min(1, y)),
    });
  }

  const heroKey = artwork.pdpKey;
  const zoomKey = artwork.zoomKey ?? artwork.pdpKey;
  const heroUrl = heroKey ? publicUrl(heroKey) : null;
  const zoomUrl = zoomKey ? publicUrl(zoomKey) : null;

  const longDesc = artwork.longDescription ?? "";
  const needsReadMore = longDesc.length > READ_MORE_THRESHOLD;
  const displayedDesc =
    needsReadMore && !expanded
      ? `${longDesc.slice(0, READ_MORE_THRESHOLD).trimEnd()}…`
      : longDesc;

  const buttonLabel = added
    ? "Added to cart ✓"
    : adding
      ? "Adding…"
      : "Add to Cart";

  const backgroundTint = artwork.dominantColors[0] ?? undefined;

  return (
    <article className="mx-auto max-w-6xl px-6 py-10">
      <nav className="mb-6 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/catalog" className="hover:underline">
          Catalog
        </Link>
        {artwork.artistSlug && artwork.artistName ? (
          <>
            <span className="mx-2">/</span>
            <Link
              href={`/catalog?artist=${artwork.artistSlug}`}
              className="hover:underline"
            >
              {artwork.artistName}
            </Link>
          </>
        ) : null}
        <span className="mx-2">/</span>
        <span className="text-zinc-700 dark:text-zinc-300">{artwork.title}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="relative">
          <div
            ref={imageWrapRef}
            className="relative aspect-[4/5] w-full overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900"
            style={
              backgroundTint ? { backgroundColor: backgroundTint } : undefined
            }
            onMouseEnter={() => setZooming(true)}
            onMouseLeave={() => setZooming(false)}
            onMouseMove={onMouseMove}
            onTouchStart={() => setZooming(true)}
            onTouchEnd={() => setZooming(false)}
            onTouchMove={onTouchMove}
          >
            {heroUrl ? (
              <Image
                src={heroUrl}
                alt={artwork.title}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-contain"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                No image available
              </div>
            )}

            {zooming && zoomUrl ? (
              <div
                className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
                aria-hidden
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${zoomUrl})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "200% 200%",
                    backgroundPosition: `${cursor.x * 100}% ${cursor.y * 100}%`,
                  }}
                />
              </div>
            ) : null}

            {zooming && zoomUrl ? (
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden md:hidden"
                aria-hidden
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `url(${zoomUrl})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: "200% 200%",
                    backgroundPosition: `${cursor.x * 100}% ${cursor.y * 100}%`,
                  }}
                />
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Hover to zoom on desktop · pinch or tap and drag on mobile
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h1 className="font-serif text-4xl tracking-tight text-zinc-900 dark:text-zinc-50">
              {artwork.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
              {artwork.artistName ? (
                artwork.artistSlug ? (
                  <Link
                    href={`/catalog?artist=${artwork.artistSlug}`}
                    className="hover:underline"
                  >
                    {artwork.artistName}
                  </Link>
                ) : (
                  <span>{artwork.artistName}</span>
                )
              ) : null}
              {artwork.yearLabel ? (
                <span className="text-zinc-400">·</span>
              ) : null}
              {artwork.yearLabel ? <span>{artwork.yearLabel}</span> : null}
            </div>
          </header>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            {artwork.movementName ? (
              <div className="col-span-1">
                <dt className="text-xs uppercase tracking-wide text-zinc-500">
                  Movement
                </dt>
                <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                  {artwork.movementSlug ? (
                    <Link
                      href={`/catalog?movement=${artwork.movementSlug}`}
                      className="hover:underline"
                    >
                      {artwork.movementName}
                    </Link>
                  ) : (
                    artwork.movementName
                  )}
                </dd>
              </div>
            ) : null}
            {artwork.museumName ? (
              <div className="col-span-1">
                <dt className="text-xs uppercase tracking-wide text-zinc-500">
                  Current location
                </dt>
                <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
                  {artwork.museumExternalUrl ? (
                    <a
                      href={artwork.museumExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {artwork.museumName}
                      {artwork.museumCity ? `, ${artwork.museumCity}` : ""}
                    </a>
                  ) : (
                    <>
                      {artwork.museumName}
                      {artwork.museumCity ? `, ${artwork.museumCity}` : ""}
                    </>
                  )}
                </dd>
              </div>
            ) : null}
          </dl>

          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                Size
              </h2>
              {selectedSize ? (
                <span className="text-xs text-zinc-500">
                  {selectedSize} in
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRINT_SIZES.map((size) => {
                const row = eligibilityMap.get(size);
                const disabled = !row?.eligible;
                const active = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelectedSize(size)}
                    aria-pressed={active}
                    className={[
                      "rounded-full border px-4 py-2 text-sm font-medium transition",
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200",
                      disabled
                        ? "cursor-not-allowed opacity-40 line-through hover:border-zinc-300 dark:hover:border-zinc-700"
                        : "",
                    ].join(" ")}
                    title={
                      disabled
                        ? "Not available at this size for this artwork"
                        : undefined
                    }
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
              Paper
            </h2>
            <div className="flex flex-col gap-2">
              {PAPER_TYPES.map((paper) => {
                const label = PAPER_LABELS[paper];
                const mod = pricingSnap.paperModifiers[paper] ?? 0;
                const active = selectedPaper === paper;
                return (
                  <button
                    key={paper}
                    type="button"
                    onClick={() => setSelectedPaper(paper)}
                    aria-pressed={active}
                    className={[
                      "flex items-center justify-between rounded-lg border px-4 py-3 text-left transition",
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                        : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200",
                    ].join(" ")}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{label.name}</span>
                      <span
                        className={[
                          "text-xs",
                          active
                            ? "text-zinc-200 dark:text-zinc-700"
                            : "text-zinc-500",
                        ].join(" ")}
                      >
                        {label.desc}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums">
                      {formatSignedCents(mod)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
            aria-live="polite"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                Price
              </span>
              <span className="font-serif text-3xl tabular-nums text-zinc-900 dark:text-zinc-50">
                {priceCents !== null ? formatCents(priceCents) : "—"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Estimated production: 3–5 business days
            </p>
          </section>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={addToCart}
              disabled={!canAdd}
              className={[
                "rounded-full px-6 py-3 text-sm font-medium transition",
                canAdd
                  ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                  : "cursor-not-allowed bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
              ].join(" ")}
            >
              {buttonLabel}
            </button>
            {!selectedSize || !selectedPaper ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Select size and paper to continue
              </p>
            ) : null}
            {errorMsg ? (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {errorMsg}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <section className="mt-12 max-w-3xl">
        <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
          About this work
        </h2>
        {artwork.shortDescription ? (
          <p className="mt-3 text-base text-zinc-700 dark:text-zinc-300">
            {artwork.shortDescription}
          </p>
        ) : null}
        {longDesc ? (
          <div className="mt-4 text-base leading-relaxed text-zinc-700 dark:text-zinc-300">
            <p className="whitespace-pre-line">{displayedDesc}</p>
            {needsReadMore ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 text-sm font-medium text-zinc-900 underline dark:text-zinc-50"
              >
                {expanded ? "Read less" : "Read more"}
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {relatedByArtist.length > 0 && artwork.artistName ? (
        <section className="mt-12">
          <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
            More by {artwork.artistName}
          </h2>
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {relatedByArtist.map((r) => (
              <li
                key={r.slug}
                className="w-48 shrink-0 snap-start md:w-56"
              >
                <Link href={`/catalog/${r.slug}`} className="group flex flex-col gap-2">
                  <div className="relative aspect-[3/4] overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                    {r.catalogKey ? (
                      <Image
                        src={publicUrl(r.catalogKey)}
                        alt={r.title}
                        fill
                        sizes="(min-width: 768px) 224px, 192px"
                        className="object-contain transition duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="font-serif text-sm leading-snug text-zinc-900 group-hover:underline dark:text-zinc-50">
                    {r.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {relatedByMovement.length > 0 && artwork.movementName ? (
        <section className="mt-12">
          <h2 className="font-serif text-2xl tracking-tight text-zinc-900 dark:text-zinc-50">
            From the {artwork.movementName} Period
          </h2>
          <ul className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {relatedByMovement.map((r) => (
              <li
                key={r.slug}
                className="w-48 shrink-0 snap-start md:w-56"
              >
                <Link href={`/catalog/${r.slug}`} className="group flex flex-col gap-2">
                  <div className="relative aspect-[3/4] overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                    {r.catalogKey ? (
                      <Image
                        src={publicUrl(r.catalogKey)}
                        alt={r.title}
                        fill
                        sizes="(min-width: 768px) 224px, 192px"
                        className="object-contain transition duration-200 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                        No image
                      </div>
                    )}
                  </div>
                  <p className="font-serif text-sm leading-snug text-zinc-900 group-hover:underline dark:text-zinc-50">
                    {r.title}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {r.artistName ?? "Unknown artist"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

export default PdpConfigurator;
