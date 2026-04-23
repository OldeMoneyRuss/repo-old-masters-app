/**
 * Server-side GA4 Measurement Protocol helper.
 * Used for server-confirmed events (e.g. purchase on webhook) where client
 * gtag.js may not have fired.
 */
export async function sendMpEvent(
  eventName: string,
  params: Record<string, unknown>,
  options: { clientId?: string; sessionId?: string } = {},
): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return;

  const body = {
    client_id: options.clientId ?? "server",
    ...(options.sessionId ? { session_id: options.sessionId } : {}),
    events: [{ name: eventName, params }],
  };

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
  } catch {
    // Non-fatal: analytics must not break order flow
  }
}

export async function sendPurchaseEvent(params: {
  transactionId: string;
  valueCents: number;
  items: Array<{ itemId: string; itemName: string; price: number; quantity: number }>;
  clientId?: string;
}): Promise<void> {
  await sendMpEvent(
    "purchase",
    {
      transaction_id: params.transactionId,
      currency: "USD",
      value: params.valueCents / 100,
      items: params.items.map((i) => ({
        item_id: i.itemId,
        item_name: i.itemName,
        price: i.price,
        quantity: i.quantity,
      })),
    },
    { clientId: params.clientId },
  );
}
