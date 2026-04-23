import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-4">
          <Link
            href="/"
            className="font-serif text-xl tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Old Masters Print Shop
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-6 py-12">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
