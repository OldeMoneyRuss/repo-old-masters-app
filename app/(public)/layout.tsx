import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-black/80">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-serif text-xl tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            Old Masters Print Shop
          </Link>
          <ul className="flex items-center gap-6 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <Link href="/catalog">Catalog</Link>
            </li>
            <li>
              <Link href="/artists">Artists</Link>
            </li>
            <li>
              <Link href="/movements">Movements</Link>
            </li>
            <li>
              <Link href="/cart">Cart</Link>
            </li>
            <li>
              <Link href="/account">Account</Link>
            </li>
          </ul>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-zinc-200 bg-white py-12 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-black dark:text-zinc-400">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Shop
              </p>
              <ul className="space-y-2">
                <li><Link href="/catalog" className="hover:text-zinc-900 dark:hover:text-white">Catalog</Link></li>
                <li><Link href="/artists" className="hover:text-zinc-900 dark:hover:text-white">Artists</Link></li>
                <li><Link href="/movements" className="hover:text-zinc-900 dark:hover:text-white">Movements</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Help
              </p>
              <ul className="space-y-2">
                <li><Link href="/faq" className="hover:text-zinc-900 dark:hover:text-white">FAQ</Link></li>
                <li><Link href="/shipping" className="hover:text-zinc-900 dark:hover:text-white">Shipping &amp; Returns</Link></li>
                <li><Link href="/contact" className="hover:text-zinc-900 dark:hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Company
              </p>
              <ul className="space-y-2">
                <li><Link href="/about" className="hover:text-zinc-900 dark:hover:text-white">About</Link></li>
                <li><Link href="/terms" className="hover:text-zinc-900 dark:hover:text-white">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-white">Privacy</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Follow
              </p>
              <ul className="space-y-2">
                <li>
                  <a href="https://instagram.com/oldmastersprint" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-white">
                    Instagram
                  </a>
                </li>
                <li>
                  <a href="https://pinterest.com/oldmastersprint" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-white">
                    Pinterest
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <p>&copy; {new Date().getFullYear()} Old Masters Print Shop. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
