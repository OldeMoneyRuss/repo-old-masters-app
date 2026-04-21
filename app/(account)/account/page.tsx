import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountOverviewPage() {
  const session = await auth();
  return (
    <div>
      <h1 className="font-serif text-2xl text-zinc-900 dark:text-zinc-50">
        Hello, {session?.user?.name ?? session?.user?.email}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Welcome back. View your orders, update your addresses, or manage your
        profile from the navigation on the left.
      </p>
    </div>
  );
}
