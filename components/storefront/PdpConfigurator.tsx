"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { publicUrl } from "@/lib/storage";
import { unitPriceCents, type PricingSnapshot } from "@/lib/pricing/calc";
import { Ornament } from "@/components/storefront/Ornament";

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

const READ_MORE_THRESHOLD = 320;

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

function formatPrintSize(s: string): string {
  return s.replace("x", "\u00D7");
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

  const startingFromCents = useMemo(() => {
    const eligibleSizes = eligibility
      .filter((r) => r.eligible)
      .map((r) => r.printSize);
    if (eligibleSizes.length === 0) return null;
    const matte = "archival_matte";
    const prices = eligibleSizes.map((s) =>
      unitPriceCents(pricingSnap, { printSize: s, paperType: matte }),
    );
    return Math.min(...prices);
  }, [eligibility, pricingSnap]);

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
      resetTimerRef.current = setTimeout(() => setAdded(false), 2200);
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
    ? "✓ Added to Cart"
    : adding
      ? "Adding…"
      : canAdd
        ? "Add to Cart"
        : "Select Size & Paper";

  const dominantTint = artwork.dominantColors[0];
  const panelBg = dominantTint
    ? `${dominantTint}30`
    : "var(--parchment-mid)";

  return (
    <article className="mx-auto max-w-[1180px] px-8 pb-20 pt-10">
      <nav className="mb-9 flex flex-wrap items-center gap-1.5 font-sans text-[11px] uppercase tracking-[0.1em] text-ink-light">
        <Link href="/" className="text-ink-light transition-colors hover:text-ink">
          Home
        </Link>
        <span>›</span>
        <Link
          href="/catalog"
          className="text-ink-light transition-colors hover:text-ink"
        >
          Catalogue
        </Link>
        {artwork.movementName && artwork.movementSlug ? (
          <>
            <span>›</span>
            <Link
              href={`/catalog?movement=${artwork.movementSlug}`}
              className="text-ink-light transition-colors hover:text-ink"
            >
              {artwork.movementName}
            </Link>
          </>
        ) : null}
        <span>›</span>
        <span className="text-ink">{artwork.title}</span>
      </nav>

      <div className="grid grid-cols-1 items-start gap-14 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>
          <div
            ref={imageWrapRef}
            className="relative overflow-hidden border border-[color:var(--border-light)] shadow-[0_4px_32px_rgba(40,20,0,0.08)] select-none"
            style={{
              background: panelBg,
              cursor: zooming ? "crosshair" : "zoom-in",
            }}
            onMouseEnter={() => setZooming(true)}
            onMouseLeave={() => setZooming(false)}
            onMouseMove={onMouseMove}
            onTouchStart={() => setZooming(true)}
            onTouchEnd={() => setZooming(false)}
            onTouchMove={onTouchMove}
          >
            {heroUrl ? (
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={heroUrl}
                  alt={artwork.title}
                  fill
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-contain p-4"
                  priority
                />
              </div>
            ) : (
              <div className="flex aspect-[4/5] flex-col items-center justify-center gap-2 font-sans text-[13px] text-ink-light">
                <div className="font-display text-[40px] opacity-30">∅</div>
                <div>artwork image</div>
              </div>
            )}

            {zooming && zoomUrl ? (
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden
                style={{
                  backgroundImage: `url(${zoomUrl})`,
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "220% 220%",
                  backgroundPosition: `${cursor.x * 100}% ${cursor.y * 100}%`,
                }}
              />
            ) : null}
          </div>
          <p className="mt-2 text-center font-sans text-[10px] tracking-[0.08em] text-ink-light">
            Hover to zoom · 240 DPI minimum at all available sizes
          </p>
        </div>

        <div className="flex flex-col gap-7">
          <header>
            <h1 className="mb-2 font-display text-[42px] font-normal leading-[1.08] text-ink">
              {artwork.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              {artwork.artistName ? (
                artwork.artistSlug ? (
                  <Link
                    href={`/catalog?artist=${artwork.artistSlug}`}
                    className="font-display text-xl italic text-lapis hover:underline"
                  >
                    {artwork.artistName}
                  </Link>
                ) : (
                  <span className="font-display text-xl italic text-lapis">
                    {artwork.artistName}
                  </span>
                )
              ) : null}
              {artwork.yearLabel ? (
                <>
                  <span className="text-[color:var(--border)]">·</span>
                  <span className="font-serif text-[17px] text-ink-light">
                    {artwork.yearLabel}
                  </span>
                </>
              ) : null}
            </div>
          </header>

          {(artwork.movementName || artwork.museumName) && (
            <dl className="grid grid-cols-1 gap-x-5 gap-y-3.5 border border-[color:var(--border-light)] bg-cream px-5 py-[18px] sm:grid-cols-2">
              {artwork.movementName ? (
                <div>
                  <dt className="mb-[3px] font-sans text-[10px] uppercase tracking-[0.12em] text-ink-light">
                    Movement
                  </dt>
                  <dd className="font-serif text-base text-ink">
                    {artwork.movementSlug ? (
                      <Link
                        href={`/catalog?movement=${artwork.movementSlug}`}
                        className="text-ink hover:text-venetian"
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
                <div>
                  <dt className="mb-[3px] font-sans text-[10px] uppercase tracking-[0.12em] text-ink-light">
                    Current Location
                  </dt>
                  <dd className="font-serif text-base text-ink">
                    {artwork.museumExternalUrl ? (
                      <a
                        href={artwork.museumExternalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink hover:text-venetian"
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
          )}

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <p className="font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-ink-light">
                Print Size
              </p>
              {selectedSize ? (
                <span className="font-sans text-[11px] text-ink-light">
                  {formatPrintSize(selectedSize)} in
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PRINT_SIZES.map((size) => {
                const row = eligibilityMap.get(size);
                const eligible = !!row?.eligible;
                const active = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={!eligible}
                    onClick={() => eligible && setSelectedSize(size)}
                    aria-pressed={active}
                    className={[
                      "border px-1.5 py-2.5 font-sans text-[11px] tracking-[0.08em] transition-all",
                      active
                        ? "border-ink bg-ink text-cream"
                        : eligible
                          ? "border-[color:var(--border)] bg-cream text-ink hover:border-ink"
                          : "cursor-not-allowed border-[color:var(--border)] bg-cream text-[color:var(--border)] line-through",
                    ].join(" ")}
                    title={
                      !eligible
                        ? "Not available at this size for this artwork"
                        : undefined
                    }
                  >
                    {formatPrintSize(size)}
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <p className="mb-3 font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-ink-light">
              Paper Type
            </p>
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
                      "flex items-center justify-between border px-4 py-[13px] text-left transition-all",
                      active
                        ? "border-ink bg-ink"
                        : "border-[color:var(--border)] bg-cream hover:border-ink",
                    ].join(" ")}
                  >
                    <span className="flex flex-col">
                      <span
                        className={[
                          "mb-0.5 font-sans text-xs font-medium tracking-[0.06em]",
                          active ? "text-cream" : "text-ink",
                        ].join(" ")}
                      >
                        {label.name}
                      </span>
                      <span
                        className={[
                          "font-serif text-[14px]",
                          active ? "text-[#C8B89A]" : "text-ink-light",
                        ].join(" ")}
                      >
                        {label.desc}
                      </span>
                    </span>
                    <span
                      className={[
                        "ml-3 whitespace-nowrap font-sans text-xs tabular-nums",
                        active ? "text-[#C8B89A]" : "text-ink-light",
                      ].join(" ")}
                    >
                      {formatSignedCents(mod)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="border-t border-[color:var(--border-light)] pt-6">
            <div
              className="mb-4 flex items-baseline justify-between"
              aria-live="polite"
            >
              <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink-light">
                {priceCents !== null ? "Your price" : "Starting from"}
              </span>
              <span className="font-display text-[40px] font-normal leading-none tabular-nums text-ink">
                {priceCents !== null
                  ? formatCents(priceCents)
                  : startingFromCents !== null
                    ? formatCents(startingFromCents)
                    : "—"}
              </span>
            </div>
            <button
              type="button"
              onClick={addToCart}
              disabled={!canAdd || added}
              className={[
                "block w-full px-6 py-3.5 font-sans text-xs font-medium uppercase tracking-[0.15em] transition-colors",
                canAdd
                  ? "bg-venetian text-cream hover:bg-venetian-dark"
                  : added
                    ? "bg-ink text-cream"
                    : "cursor-not-allowed bg-[color:var(--border)] text-ink-light",
              ].join(" ")}
            >
              {buttonLabel}
            </button>
            <p className="mt-2.5 text-center font-sans text-[11px] tracking-[0.06em] text-ink-light">
              Production: 3–5 business days · Shipped flat with rigid backing
            </p>
            {errorMsg ? (
              <p
                className="mt-3 text-center font-serif text-sm text-venetian"
                role="alert"
              >
                {errorMsg}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <section className="mt-16 max-w-[720px]">
        <Ornament className="mb-10" />
        <p className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink-light">
          About this work
        </p>
        <h2 className="mb-5 font-display text-[32px] font-normal text-ink">
          {artwork.title}
        </h2>
        {artwork.shortDescription ? (
          <p className="mb-4 font-serif text-[19px] italic leading-[1.65] text-ink-mid">
            {artwork.shortDescription}
          </p>
        ) : null}
        {longDesc ? (
          <>
            <p className="whitespace-pre-line font-serif text-[17px] leading-[1.75] text-ink-mid">
              {displayedDesc}
            </p>
            {needsReadMore ? (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="mt-3 font-sans text-[11px] uppercase tracking-[0.12em] text-lapis underline"
              >
                {expanded ? "Read less" : "Read more"}
              </button>
            ) : null}
          </>
        ) : null}
      </section>

      {relatedByArtist.length > 0 && artwork.artistName ? (
        <section className="mt-16">
          <Ornament className="mb-9" />
          <p className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink-light">
            Same Artist
          </p>
          <h2 className="mb-7 font-display text-[30px] font-normal text-ink">
            More by {artwork.artistName}
          </h2>
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {relatedByArtist.map((r) => (
              <li key={r.slug}>
                <Link href={`/catalog/${r.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden border border-[color:var(--border-light)] bg-[color:var(--parchment-mid)] shadow-[0_2px_8px_rgba(40,20,0,0.06)] transition-all duration-200 group-hover:border-gold group-hover:shadow-[0_8px_32px_rgba(40,20,0,0.14)]">
                    {r.catalogKey ? (
                      <Image
                        src={publicUrl(r.catalogKey)}
                        alt={r.title}
                        fill
                        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
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
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {relatedByMovement.length > 0 && artwork.movementName ? (
        <section className="mt-14">
          <p className="mb-3 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink-light">
            Same Movement
          </p>
          <h2 className="mb-7 font-display text-[30px] font-normal text-ink">
            From the {artwork.movementName}
          </h2>
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {relatedByMovement.map((r) => (
              <li key={r.slug}>
                <Link href={`/catalog/${r.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden border border-[color:var(--border-light)] bg-[color:var(--parchment-mid)] shadow-[0_2px_8px_rgba(40,20,0,0.06)] transition-all duration-200 group-hover:border-gold group-hover:shadow-[0_8px_32px_rgba(40,20,0,0.14)]">
                    {r.catalogKey ? (
                      <Image
                        src={publicUrl(r.catalogKey)}
                        alt={r.title}
                        fill
                        sizes="(min-width: 1024px) 22vw, (min-width: 640px) 33vw, 50vw"
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
        </section>
      ) : null}
    </article>
  );
}

export default PdpConfigurator;
