import Link from "next/link";
import { desc, eq, type SQL, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import {
  PageHeader,
  Table,
  Select,
  SecondaryButton,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "New (paid)" },
  { value: "in_production", label: "In production" },
  { value: "quality_check", label: "Quality check" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

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

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const statusFilter = sp.status ?? "all";

  const filters: SQL[] = [];
  if (statusFilter !== "all") {
    filters.push(eq(orders.status, statusFilter as typeof orders.status._.data));
  }
  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      email: orders.email,
      status: orders.status,
      totalCents: orders.totalCents,
      placedAt: orders.placedAt,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${rows.length} shown`} />

      <form className="mb-6 flex items-end gap-3" method="get">
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-500">
            Status
          </label>
          <Select name="status" defaultValue={statusFilter}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <SecondaryButton type="submit">Filter</SecondaryButton>
      </form>

      <Table
        head={
          <tr>
            <th className="px-4 py-2">Order #</th>
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Total</th>
            <th className="px-4 py-2">Placed</th>
            <th className="px-4 py-2"></th>
          </tr>
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
              No orders match.
            </td>
          </tr>
        ) : (
          rows.map((o) => (
            <tr key={o.id}>
              <td className="px-4 py-2 font-mono text-sm">
                <Link href={`/admin/orders/${o.id}`} className="underline">
                  {o.orderNumber}
                </Link>
              </td>
              <td className="px-4 py-2 text-sm text-zinc-700">{o.email}</td>
              <td className="px-4 py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${STATUS_BADGE[o.status] ?? "bg-zinc-100 text-zinc-600"}`}
                >
                  {o.status.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-2 text-sm">
                ${(o.totalCents / 100).toFixed(2)}
              </td>
              <td className="px-4 py-2 text-xs text-zinc-500">
                {o.placedAt
                  ? new Date(o.placedAt).toLocaleDateString()
                  : new Date(o.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-2 text-right">
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="text-xs text-zinc-500 underline hover:text-zinc-900"
                >
                  View
                </Link>
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  );
}
