import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/db/schema";
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

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?next=/account/orders");
  const userId = session.user.id;

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      totalCents: orders.totalCents,
      placedAt: orders.placedAt,
      createdAt: orders.createdAt,
      itemCount: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`.as(
        "item_count",
      ),
    })
    .from(orders)
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.userId, userId))
    .groupBy(orders.id)
    .orderBy(desc(orders.createdAt));

  return (
    <div>
      <h1 className="font-serif text-2xl text-zinc-900 dark:text-zinc-50">
        Orders
      </h1>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          You haven&apos;t placed any orders yet.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {rows.map((row) => {
            const status = row.status as OrderStatus;
            const dateValue = row.placedAt ?? row.createdAt;
            const count = Number(row.itemCount) || 0;
            return (
              <li
                key={row.id}
                className="flex flex-col gap-3 rounded border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-zinc-900 dark:text-zinc-50">
                      {row.orderNumber}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}
                    >
                      {STATUS_LABELS[status]}
                    </span>
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {formatDate(dateValue)} · {count}{" "}
                    {count === 1 ? "item" : "items"}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                    {formatCents(row.totalCents)}
                  </span>
                  <Link
                    href={`/account/orders/${row.orderNumber}`}
                    className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm dark:border-zinc-700"
                  >
                    View order
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
