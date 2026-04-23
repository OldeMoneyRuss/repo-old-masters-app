import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  return (
    <div>
      <h1 className="font-serif text-2xl text-zinc-900 dark:text-zinc-50">
        Profile
      </h1>
      <dl className="mt-6 grid grid-cols-[140px_1fr] gap-3 text-sm">
        <dt className="text-zinc-500">Name</dt>
        <dd>{session?.user?.name ?? "—"}</dd>
        <dt className="text-zinc-500">Email</dt>
        <dd>{session?.user?.email}</dd>
        <dt className="text-zinc-500">Role</dt>
        <dd>{session?.user?.role ?? "customer"}</dd>
      </dl>
    </div>
  );
}
