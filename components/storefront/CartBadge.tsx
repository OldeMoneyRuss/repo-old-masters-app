"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CartResponse = {
  id: string | null;
  itemCount: number;
};

export function CartBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cart", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CartResponse | null) => {
        if (!cancelled && data) setCount(data.itemCount ?? 0);
      })
      .catch(() => {
        if (!cancelled) setCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasItems = count != null && count > 0;
  const label = hasItems ? `Cart (${count})` : "Cart";

  return (
    <Link
      href="/cart"
      className={
        hasItems
          ? "font-sans text-[13px] font-medium tracking-[0.08em] text-venetian transition-colors hover:text-venetian-dark"
          : "font-sans text-[13px] tracking-[0.08em] text-ink-mid transition-colors hover:text-venetian"
      }
    >
      {label}
    </Link>
  );
}
