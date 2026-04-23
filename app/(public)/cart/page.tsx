"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CartItem = {
  id: string;
  artworkId: string;
  artworkSlug: string;
  artworkTitle: string;
  artistName: string | null;
  thumbKey: string | null;
  printSize: string;
  paperType: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
};

type Cart = {
  id: string | null;
  itemCount: number;
  subtotalCents: number;
  items: CartItem[];
};

const PAPER_LABELS: Record<string, string> = {
  archival_matte: "Premium Matte",
  lustre: "Lustre",
  fine_art_cotton: "Cotton Rag",
};

function formatPrintSize(s: string): string {
  return s.replace("x", "\u00D7");
}

function formatPaper(p: string): string {
  return PAPER_LABELS[p] ?? p;
}

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function thumbSrc(key: string | null): string | null {
  if (!key) return null;
  const base = process.env.NEXT_PUBLIC_CDN_BASE_URL?.replace(/\/$/, "");
  if (base) return `${base}/${key}`;
  return `/${key}`;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cart", { credentials: "same-origin" });
        if (!res.ok) throw new Error("Failed to load cart");
        const data = (await res.json()) as Cart;
        if (!cancelled) setCart(data);
      } catch {
        if (!cancelled) setError("Unable to load your cart. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateQty = async (itemId: string, nextQty: number) => {
    if (nextQty < 1 || nextQty > 10) return;
    setPendingId(itemId);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ quantity: nextQty }),
      });
      if (!res.ok) throw new Error("update failed");
      const data = (await res.json()) as Cart;
      setCart(data);
    } catch {
      setError("Could not update item. Please try again.");
    } finally {
      setPendingId(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setPendingId(itemId);
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("delete failed");
      const data = (await res.json()) as Cart;
      setCart(data);
    } catch {
      setError("Could not remove item. Please try again.");
    } finally {
      setPendingId(null);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto max-w-[1080px] px-8 py-12">
        <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-ink-light">
          Loading…
        </p>
      </section>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  if (isEmpty) {
    return (
      <section className="mx-auto max-w-[700px] px-8 py-20 text-center">
        <div className="mb-4 font-display text-[56px] text-[color:var(--border-light)]">
          ∅
        </div>
        <h1 className="mb-3 font-display text-[36px] text-ink">Your cart is empty</h1>
        <p className="mb-8 font-serif text-lg text-ink-light">
          Browse the collection and add a print to begin.
        </p>
        <Link
          href="/catalog"
          className="inline-block bg-venetian px-8 py-3.5 font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-cream transition-colors hover:bg-venetian-dark"
        >
          Browse the Collection
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1080px] px-8 pb-20 pt-12">
      <p className="mb-2.5 font-sans text-[11px] font-medium uppercase tracking-[0.2em] text-ink-light">
        Your Selection
      </p>
      <h1 className="mb-10 font-display text-[48px] font-normal text-ink">Cart</h1>

      {error && (
        <p className="mb-6 border border-venetian bg-cream px-4 py-3 font-serif text-sm text-venetian">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <ul className="flex flex-col gap-4">
          {cart!.items.map((item) => {
            const busy = pendingId === item.id;
            const src = thumbSrc(item.thumbKey);
            return (
              <li
                key={item.id}
                className="flex gap-5 border border-[color:var(--border-light)] bg-cream p-5"
              >
                <Link
                  href={`/catalog/${item.artworkSlug}`}
                  className="flex h-[100px] w-20 shrink-0 items-center justify-center overflow-hidden bg-[color:var(--parchment-mid)]"
                >
                  {src ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={src}
                      alt={item.artworkTitle}
                      className="h-full w-full object-contain p-1"
                    />
                  ) : null}
                </Link>
                <div className="flex flex-1 flex-col">
                  <Link
                    href={`/catalog/${item.artworkSlug}`}
                    className="mb-1 font-display text-[20px] leading-[1.2] text-ink hover:text-venetian"
                  >
                    {item.artworkTitle}
                  </Link>
                  {item.artistName && (
                    <p className="mb-2 font-sans text-[11px] uppercase tracking-[0.08em] text-ink-light">
                      {item.artistName}
                    </p>
                  )}
                  <p className="font-serif text-[15px] text-ink-mid">
                    {formatPrintSize(item.printSize)} · {formatPaper(item.paperType)}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center border border-[color:var(--border)]">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        disabled={busy || item.quantity <= 1}
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                        className="flex h-8 w-8 items-center justify-center text-lg text-ink-mid disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="min-w-7 text-center font-sans text-[13px] text-ink">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={busy || item.quantity >= 10}
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="flex h-8 w-8 items-center justify-center text-lg text-ink-mid disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => removeItem(item.id)}
                      className="font-sans text-[11px] uppercase tracking-[0.08em] text-ink-light underline disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-2xl text-ink tabular-nums">
                    {formatUsd(item.lineTotalCents)}
                  </p>
                  {item.quantity > 1 && (
                    <p className="font-sans text-[11px] text-ink-light">
                      {formatUsd(item.unitPriceCents)} each
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="sticky top-20 border border-[color:var(--border-light)] bg-cream p-7">
          <h2 className="mb-5 font-display text-[24px] text-ink">Order Summary</h2>
          <dl className="mb-5 flex flex-col gap-2.5">
            <div className="flex justify-between">
              <dt className="font-serif text-base text-ink-mid">Subtotal</dt>
              <dd className="font-display text-xl text-ink tabular-nums">
                {formatUsd(cart!.subtotalCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-serif text-[15px] text-ink-light">Shipping</dt>
              <dd className="font-serif text-[15px] text-ink-light">
                Calculated at checkout
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-serif text-[15px] text-ink-light">Tax</dt>
              <dd className="font-serif text-[15px] text-ink-light">
                Calculated at checkout
              </dd>
            </div>
            <div className="flex justify-between border-t border-[color:var(--border-light)] pt-3">
              <dt className="font-sans text-xs uppercase tracking-[0.1em] text-ink">
                Estimated Total
              </dt>
              <dd className="font-display text-[26px] text-ink tabular-nums">
                {formatUsd(cart!.subtotalCents)}
              </dd>
            </div>
          </dl>
          <Link
            href="/checkout"
            className="block w-full bg-venetian px-6 py-3.5 text-center font-sans text-[13px] font-medium uppercase tracking-[0.1em] text-cream transition-colors hover:bg-venetian-dark"
          >
            Proceed to Checkout
          </Link>
          <Link
            href="/catalog"
            className="mt-3 block text-center font-sans text-[11px] uppercase tracking-[0.1em] text-ink-light hover:text-ink"
          >
            ← Continue browsing
          </Link>
          <p className="mt-4 text-center font-serif text-sm leading-relaxed text-ink-light">
            Production 3–5 business days. Shipped flat with rigid board backing.
          </p>
        </aside>
      </div>
    </section>
  );
}
