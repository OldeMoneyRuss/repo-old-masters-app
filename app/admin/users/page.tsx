import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { PageHeader, Table } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const ROLE_BADGE: Record<string, string> = {
  customer: "bg-zinc-100 text-zinc-600",
  admin: "bg-blue-100 text-blue-800",
  super_admin: "bg-purple-100 text-purple-800",
};

export default async function AdminUsersPage() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(200);

  return (
    <div>
      <PageHeader title="Users" subtitle={`${rows.length} accounts`} />

      <Table
        head={
          <tr>
            <th className="px-4 py-2">Email</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Role</th>
            <th className="px-4 py-2">Joined</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2"></th>
          </tr>
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
              No users yet.
            </td>
          </tr>
        ) : (
          rows.map((u) => (
            <tr key={u.id}>
              <td className="px-4 py-2 text-sm">{u.email}</td>
              <td className="px-4 py-2 text-sm text-zinc-600">{u.name ?? "—"}</td>
              <td className="px-4 py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${ROLE_BADGE[u.role] ?? ""}`}
                >
                  {u.role.replace(/_/g, " ")}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-zinc-500">
                {new Date(u.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-2 text-xs">
                {u.disabledAt ? (
                  <span className="text-red-600">Disabled</span>
                ) : (
                  <span className="text-emerald-700">Active</span>
                )}
              </td>
              <td className="px-4 py-2 text-right">
                <Link
                  href={`/admin/users/${u.id}`}
                  className="text-xs text-zinc-500 underline hover:text-zinc-900"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  );
}
