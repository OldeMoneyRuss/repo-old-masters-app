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
  // fall back: assume key is already a relative path from the public bucket
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
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-serif text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">
          Cart
        </h1>
        <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {[0, 1, 2].map((k) => (
              <div
                key={k}
                className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="h-[60px] w-[60px] animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-900" />
        </div>
      </section>
    );
  }

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-serif text-3xl tracking-tight text-zinc-900 dark:text-zinc-50">
        Cart
      </h1>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {isEmpty ? (
        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-zinc-600 dark:text-zinc-400">
            Your cart is empty.{" "}
            <Link
              href="/catalog"
              className="text-zinc-900 underline underline-offset-4 hover:no-underline dark:text-zinc-100"
            >
              Browse the catalog &rarr;
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
          <ul className="space-y-4">
            {cart!.items.map((item) => {
              const busy = pendingId === item.id;
              const src = thumbSrc(item.thumbKey);
              return (
                <li
                  key={item.id}
                  className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
                    {src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={src}
                        alt={item.artworkTitle}
                        width={60}
                        height={60}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Link
                      href={`/catalog/${item.artworkSlug}`}
                      className="font-serif text-base text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {item.artworkTitle}
                    </Link>
                    {item.artistName && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {item.artistName}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      {formatPrintSize(item.printSize)} &middot;{" "}
                      {formatPaper(item.paperType)}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-800">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={busy || item.quantity <= 1}
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-l-full text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          &minus;
                        </button>
                        <span className="min-w-8 px-2 text-center text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={busy || item.quantity >= 10}
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-r-full text-zinc-700 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-900"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label={`Remove ${item.artworkTitle}`}
                        disabled={busy}
                        onClick={() => removeItem(item.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                  <div className="text-right text-sm tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatUsd(item.lineTotalCents)}
                  </div>
                </li>
              );
            })}
          </ul>

          <aside className="h-fit rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="font-serif text-lg text-zinc-900 dark:text-zinc-50">
              Order Summary
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-zinc-700 dark:text-zinc-300">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">
                  {formatUsd(cart!.subtotalCents)}
                </dd>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-500">
                <dt>Shipping</dt>
                <dd>Calculated at checkout</dd>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-500">
                <dt>Tax</dt>
                <dd>Calculated at checkout</dd>
              </div>
              <div className="mt-3 flex justify-between border-t border-zinc-200 pt-3 text-base font-medium text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {formatUsd(cart!.subtotalCents)}
                </dd>
              </div>
            </dl>
            <Link
              href="/checkout"
              aria-disabled={isEmpty}
              className={`mt-6 flex w-full items-center justify-center rounded-full px-6 py-3 text-sm font-medium transition ${
                isEmpty
                  ? "pointer-events-none bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500"
                  : "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white"
              }`}
            >
              Proceed to Checkout
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
