import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, addresses } from "@/db/schema";
import { PageHeader, Banner } from "@/components/admin/ui";
import { OrderStatusForm } from "./OrderStatusForm";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<string, string> = {
  pending_payment: "bg-zinc-100 text-zinc-600",
  paid: "bg-blue-100 text-blue-800",
  in_production: "bg-amber-100 text-amber-800",
  quality_check: "bg-purple-100 text-purple-800",
  shipped: "bg-sky-100 text-sky-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-zinc-200 text-zinc-700",
};

// Allowed next steps in the admin pipeline
const NEXT_STATUS: Record<string, string | null> = {
  paid: "in_production",
  in_production: "quality_check",
  quality_check: "shipped",
  shipped: "delivered",
  delivered: null,
  cancelled: null,
  refunded: null,
  pending_payment: null,
};

export default async function AdminOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) notFound();

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, id));

  let shippingAddress = null;
  if (order.shippingAddressId) {
    const [addr] = await db
      .select()
      .from(addresses)
      .where(eq(addresses.id, order.shippingAddressId))
      .limit(1);
    shippingAddress = addr ?? null;
  }

  const nextStatus = NEXT_STATUS[order.status] ?? null;
  const canCancel = order.status === "paid";

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`Placed ${order.placedAt ? new Date(order.placedAt).toLocaleString() : "—"}`}
      />

      {sp.error ? <Banner kind="error">{decodeURIComponent(sp.error)}</Banner> : null}
      {sp.success ? <Banner kind="success">{decodeURIComponent(sp.success)}</Banner> : null}

      {/* Status + actions */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Status
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[order.status] ?? ""}`}
          >
            {order.status.replace(/_/g, " ")}
          </span>
        </div>

        <OrderStatusForm
          orderId={order.id}
          currentStatus={order.status}
          nextStatus={nextStatus}
          trackingNumber={order.trackingNumber ?? ""}
          trackingCarrier={order.trackingCarrier ?? ""}
          canCancel={canCancel}
        />
      </section>

      {/* Order summary */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Customer
        </h2>
        <p className="text-sm text-zinc-800 dark:text-zinc-200">
          {order.email}
        </p>
        {shippingAddress && (
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            <p>{shippingAddress.fullName}</p>
            <p>{shippingAddress.line1}</p>
            {shippingAddress.line2 ? <p>{shippingAddress.line2}</p> : null}
            <p>
              {shippingAddress.city}
              {shippingAddress.region ? `, ${shippingAddress.region}` : ""}{" "}
              {shippingAddress.postalCode}
            </p>
            <p>{shippingAddress.country}</p>
          </div>
        )}
      </section>

      {/* Line items */}
      <section className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Items
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
            <tr>
              <th className="px-6 py-3 text-left">Artwork</th>
              <th className="px-4 py-3 text-left">Size</th>
              <th className="px-4 py-3 text-left">Paper</th>
              <th className="px-4 py-3 text-left">Qty</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Ticket</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-3">
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {item.artworkTitle}
                  </p>
                  {item.artistName ? (
                    <p className="text-xs text-zinc-500">{item.artistName}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {item.printSize}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {item.paperType.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                  {item.quantity}
                </td>
                <td className="px-4 py-3 text-right">
                  ${(item.lineTotalCents / 100).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/api/admin/orders/${order.id}/ticket?item=${item.id}`}
                    className="text-xs text-zinc-500 underline hover:text-zinc-900"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 dark:border-zinc-800">
            <tr>
              <td colSpan={4} className="px-6 py-3 text-right text-xs text-zinc-500">
                Subtotal
              </td>
              <td className="px-4 py-3 text-right text-sm">
                ${(order.subtotalCents / 100).toFixed(2)}
              </td>
              <td />
            </tr>
            {order.shippingCents > 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-1 text-right text-xs text-zinc-500">
                  Shipping
                </td>
                <td className="px-4 py-1 text-right text-sm">
                  ${(order.shippingCents / 100).toFixed(2)}
                </td>
                <td />
              </tr>
            )}
            {order.taxCents > 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-1 text-right text-xs text-zinc-500">
                  Tax
                </td>
                <td className="px-4 py-1 text-right text-sm">
                  ${(order.taxCents / 100).toFixed(2)}
                </td>
                <td />
              </tr>
            )}
            <tr className="font-semibold">
              <td colSpan={4} className="px-6 py-3 text-right text-xs uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                Total
              </td>
              <td className="px-4 py-3 text-right">
                ${(order.totalCents / 100).toFixed(2)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Tracking */}
      {order.trackingNumber && (
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Tracking
          </h2>
          <p className="text-xs text-zinc-500">{order.trackingCarrier}</p>
          <p className="font-mono text-lg font-semibold">{order.trackingNumber}</p>
        </section>
      )}
    </div>
  );
}
