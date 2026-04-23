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

  const label =
    count && count > 0 ? `Cart (${count})` : "Cart";

  return <Link href="/cart">{label}</Link>;
}
