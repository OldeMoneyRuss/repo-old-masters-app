import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, addresses } from "@/db/schema";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

type OrderStatus =
  | "pending_payment"
  | "paid"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

type PaperType = "archival_matte" | "lustre" | "fine_art_cotton";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  in_production: "In production",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const STATUS_CLASSES: Record<OrderStatus, string> = {
  pending_payment:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  in_production: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  shipped: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  delivered:
    "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  refunded:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
};

const PAPER_LABELS: Record<PaperType, string> = {
  archival_matte: "Premium Matte",
  lustre: "Lustre",
  fine_art_cotton: "Cotton Rag",
};

function formatCents(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?next=/account/orders/${orderNumber}`);
  }
  const userId = session.user.id;

  const [order] = await db
    .select()
    .from(orders)
    .where(
      and(eq(orders.orderNumber, orderNumber), eq(orders.userId, userId)),
    )
    .limit(1);

  if (!order) notFound();

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  const shippingAddress = order.shippingAddressId
    ? (
        await db
          .select()
          .from(addresses)
          .where(eq(addresses.id, order.shippingAddressId))
          .limit(1)
      )[0]
    : null;

  const status = order.status as OrderStatus;
  const placed = order.placedAt ?? order.createdAt;

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link
          href="/account/orders"
          className="text-sm text-zinc-600 hover:underline dark:text-zinc-400"
        >
          ← All orders
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-zinc-900 dark:text-zinc-50">
            Order{" "}
            <span className="font-mono text-xl">{order.orderNumber}</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Placed {formatDate(placed)}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
        >
          {STATUS_LABELS[status]}
        </span>
      </div>

      {order.shippedAt ? (
        <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-zinc-700 dark:text-zinc-300">
            Shipped on {formatDate(order.shippedAt)}
            {order.deliveredAt
              ? `. Delivered ${formatDate(order.deliveredAt)}.`
              : "."}
          </p>
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="font-serif text-lg text-zinc-900 dark:text-zinc-50">
          Items
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {items.map((item) => {
            const paper = PAPER_LABELS[item.paperType as PaperType];
            return (
              <li
                key={item.id}
                className="flex items-start gap-4 rounded border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="h-20 w-20 shrink-0 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="flex-1">
                  <div className="font-serif text-base text-zinc-900 dark:text-zinc-50">
                    {item.artworkTitle}
                  </div>
                  {item.artistName ? (
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {item.artistName}
                    </div>
                  ) : null}
                  <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {item.printSize} · {paper} · Qty {item.quantity}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {formatCents(item.lineTotalCents)}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-500">
                    {formatCents(item.unitPriceCents)} each
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-serif text-lg text-zinc-900 dark:text-zinc-50">
            Shipping address
          </h2>
          {shippingAddress ? (
            <address className="mt-3 not-italic text-sm text-zinc-700 dark:text-zinc-300">
              <div>{shippingAddress.fullName}</div>
              <div>{shippingAddress.line1}</div>
              {shippingAddress.line2 ? <div>{shippingAddress.line2}</div> : null}
              <div>
                {shippingAddress.city}
                {shippingAddress.region ? `, ${shippingAddress.region}` : ""}{" "}
                {shippingAddress.postalCode}
              </div>
              <div>{shippingAddress.country}</div>
              {shippingAddress.phone ? (
                <div className="mt-1 text-zinc-600 dark:text-zinc-400">
                  {shippingAddress.phone}
                </div>
              ) : null}
            </address>
          ) : (
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              No shipping address on file.
            </p>
          )}
        </div>

        <div>
          <h2 className="font-serif text-lg text-zinc-900 dark:text-zinc-50">
            Summary
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Subtotal</dt>
              <dd className="text-zinc-900 dark:text-zinc-50">
                {formatCents(order.subtotalCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Shipping</dt>
              <dd className="text-zinc-900 dark:text-zinc-50">
                {formatCents(order.shippingCents)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-600 dark:text-zinc-400">Tax</dt>
              <dd className="text-zinc-900 dark:text-zinc-50">
                {formatCents(order.taxCents)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800">
              <dt className="font-medium text-zinc-900 dark:text-zinc-50">
                Total
              </dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-50">
                {formatCents(order.totalCents)}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}
