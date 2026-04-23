import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { PageHeader, Banner } from "@/components/admin/ui";
import { UserRoleForm } from "./UserRoleForm";
import { PasswordResetButton } from "./PasswordResetButton";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await auth();
  const actorRole = session?.user?.role;

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) notFound();

  const isSuperAdmin = actorRole === "super_admin";

  return (
    <div className="space-y-8">
      <PageHeader
        title={user.name ?? user.email}
        subtitle={user.email}
      />

      {sp.error ? <Banner kind="error">{decodeURIComponent(sp.error)}</Banner> : null}
      {sp.success ? <Banner kind="success">{decodeURIComponent(sp.success)}</Banner> : null}

      {/* Account info */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Account
        </h2>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">ID</dt>
            <dd className="mt-1 font-mono text-xs text-zinc-700 dark:text-zinc-300">{user.id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Email</dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-200">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Name</dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-200">{user.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Joined</dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
              {new Date(user.createdAt).toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Status</dt>
            <dd className="mt-1">
              {user.disabledAt ? (
                <span className="text-red-600">
                  Disabled {new Date(user.disabledAt).toLocaleDateString()}
                </span>
              ) : (
                <span className="text-emerald-700">Active</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">Email verified</dt>
            <dd className="mt-1 text-zinc-800 dark:text-zinc-200">
              {user.emailVerifiedAt
                ? new Date(user.emailVerifiedAt).toLocaleDateString()
                : "Not verified"}
            </dd>
          </div>
        </dl>
      </section>

      {/* Role assignment — super_admin only */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Role
        </h2>
        {isSuperAdmin ? (
          <UserRoleForm userId={user.id} currentRole={user.role} />
        ) : (
          <div>
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {user.role.replace(/_/g, " ")}
            </span>
            <p className="mt-2 text-xs text-zinc-500">
              Role assignment requires super_admin privileges.
            </p>
          </div>
        )}
      </section>

      {/* Password reset */}
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Password reset
        </h2>
        <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
          Send a password reset email to this user.
        </p>
        <PasswordResetButton userId={user.id} />
      </section>
    </div>
  );
}
