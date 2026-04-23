"use client";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function gtag(...args: unknown[]) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag(...args);
}

export function trackViewItem(params: {
  itemId: string;
  itemName: string;
  itemCategory?: string;
  price: number;
}) {
  gtag("event", "view_item", {
    currency: "USD",
    value: params.price,
    items: [
      {
        item_id: params.itemId,
        item_name: params.itemName,
        item_category: params.itemCategory,
        price: params.price,
      },
    ],
  });
}

export function trackAddToCart(params: {
  itemId: string;
  itemName: string;
  printSize: string;
  paperType: string;
  price: number;
  quantity: number;
}) {
  gtag("event", "add_to_cart", {
    currency: "USD",
    value: params.price * params.quantity,
    items: [
      {
        item_id: params.itemId,
        item_name: params.itemName,
        item_variant: `${params.printSize} / ${params.paperType}`,
        price: params.price,
        quantity: params.quantity,
      },
    ],
  });
}

export function trackRemoveFromCart(params: {
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
}) {
  gtag("event", "remove_from_cart", {
    currency: "USD",
    value: params.price * params.quantity,
    items: [
      {
        item_id: params.itemId,
        item_name: params.itemName,
        price: params.price,
        quantity: params.quantity,
      },
    ],
  });
}

export function trackBeginCheckout(params: {
  valueCents: number;
  itemCount: number;
}) {
  gtag("event", "begin_checkout", {
    currency: "USD",
    value: params.valueCents / 100,
    num_items: params.itemCount,
  });
}

export function trackPurchase(params: {
  transactionId: string;
  valueCents: number;
  items: Array<{ itemId: string; itemName: string; price: number; quantity: number }>;
}) {
  gtag("event", "purchase", {
    transaction_id: params.transactionId,
    currency: "USD",
    value: params.valueCents / 100,
    items: params.items.map((i) => ({
      item_id: i.itemId,
      item_name: i.itemName,
      price: i.price,
      quantity: i.quantity,
    })),
  });
}

export function trackSearch(searchTerm: string) {
  gtag("event", "search", { search_term: searchTerm });
}
