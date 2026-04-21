import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/artworks", label: "Artworks" },
  { href: "/admin/artists", label: "Artists" },
  { href: "/admin/movements", label: "Movements" },
  { href: "/admin/museums", label: "Museums" },
  { href: "/admin/pricing", label: "Pricing" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/import", label: "Import" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user || (role !== "admin" && role !== "super_admin")) {
    redirect("/login?next=/admin");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-black">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/admin"
            className="font-serif text-lg tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Admin · Old Masters Print Shop
          </Link>
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            {role}
          </span>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-6 py-8">
        <aside className="w-56 shrink-0">
          <nav className="flex flex-col gap-0.5 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded px-3 py-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
