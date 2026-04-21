export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Manage artworks, artists, pricing, and orders from here.
      </p>
    </div>
  );
}
