import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";

export const dynamic = "force-dynamic";

const PAPER_LABELS: Record<string, string> = {
  archival_matte: "Premium Matte",
  lustre: "Lustre",
  fine_art_cotton: "Cotton Rag",
};

function fmt(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order confirmed — #${orderNumber}` };
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);

  if (!order) notFound();

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="mt-6 font-serif text-3xl text-zinc-900 dark:text-zinc-50">
          Order confirmed!
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Order #{order.orderNumber}
        </p>
      </div>

      <div className="mt-10 overflow-hidden rounded border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Item</th>
              <th className="px-4 py-3 font-medium">Spec</th>
              <th className="px-4 py-3 font-medium">Qty</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-4">
                  <div className="font-medium text-zinc-900 dark:text-zinc-50">
                    {item.artworkTitle}
                  </div>
                  {item.artistName && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-500">
                      {item.artistName}
                    </div>
                  )}
                </td>
                <td className="px-4 py-4 text-zinc-700 dark:text-zinc-300">
                  {item.printSize} ·{" "}
                  {PAPER_LABELS[item.paperType] ?? item.paperType}
                </td>
                <td className="px-4 py-4 text-zinc-700 dark:text-zinc-300">
                  {item.quantity}
                </td>
                <td className="px-4 py-4 text-right text-zinc-900 dark:text-zinc-50">
                  {fmt(item.lineTotalCents)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">
                Subtotal
              </td>
              <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-50">
                {fmt(order.subtotalCents)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">
                Shipping
              </td>
              <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-50">
                {fmt(order.shippingCents)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-zinc-600 dark:text-zinc-400">
                Tax
              </td>
              <td className="px-4 py-2 text-right text-zinc-900 dark:text-zinc-50">
                {fmt(order.taxCents)}
              </td>
            </tr>
            <tr>
              <td
                colSpan={3}
                className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-50"
              >
                Total
              </td>
              <td className="px-4 py-3 text-right font-medium text-zinc-900 dark:text-zinc-50">
                {fmt(order.totalCents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-8 space-y-2 rounded border border-zinc-200 bg-white p-5 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-zinc-700 dark:text-zinc-300">
          Your prints will be ready in 3–5 business days, then shipped to the
          address provided.
        </p>
        <p className="text-zinc-600 dark:text-zinc-400">
          A confirmation email has been sent to {order.email}.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href={`/account/orders/${order.orderNumber}`}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          View order status
        </Link>
        <Link
          href="/catalog"
          className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
        >
          Continue shopping
        </Link>
      </div>
    </section>
  );
}
