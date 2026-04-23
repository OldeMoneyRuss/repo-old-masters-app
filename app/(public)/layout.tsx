import Link from "next/link";
import { CartBadge } from "@/components/storefront/CartBadge";
import { Ornament } from "@/components/storefront/Ornament";

const navLinkClass =
  "font-sans text-[13px] tracking-[0.08em] text-ink-mid transition-colors hover:text-ink";

const footerColHead =
  "mb-3.5 font-sans text-[10px] font-medium uppercase tracking-[0.2em] text-ink-light";

const footerLink =
  "block mb-2 font-serif text-[15px] leading-snug text-ink-mid hover:text-ink transition-colors";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[color:var(--border)] bg-white/95 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-8">
          <Link href="/" className="leading-tight">
            <div className="font-display text-[20px] font-medium tracking-tight text-ink">
              Old Masters
            </div>
            <div className="font-sans text-[9px] font-medium uppercase tracking-[0.25em] text-ink-light">
              Print Shop
            </div>
          </Link>
          <ul className="flex items-center gap-8">
            <li>
              <Link href="/catalog" className={navLinkClass}>
                Catalog
              </Link>
            </li>
            <li>
              <Link href="/artists" className={navLinkClass}>
                Artists
              </Link>
            </li>
            <li>
              <Link href="/movements" className={navLinkClass}>
                Movements
              </Link>
            </li>
            <li className="h-4 w-px bg-[color:var(--border)]" aria-hidden />
            <li>
              <CartBadge />
            </li>
            <li>
              <Link href="/account" className={navLinkClass}>
                Account
              </Link>
            </li>
          </ul>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="mt-20 border-t border-[color:var(--border)] bg-parchment-mid">
        <div className="mx-auto max-w-[1180px] px-8 pb-10 pt-14">
          <div className="mb-12 grid grid-cols-2 gap-10 sm:grid-cols-4">
            <div>
              <div className="font-display text-[22px] text-ink">Old Masters</div>
              <div className="mb-3.5 font-sans text-[9px] font-medium uppercase tracking-[0.2em] text-ink-light">
                Print Shop
              </div>
              <p className="font-serif text-sm leading-relaxed text-ink-light">
                Museum-quality giclée reproductions of the Old Masters, on archival papers.
              </p>
            </div>
            <div>
              <p className={footerColHead}>Shop</p>
              <Link href="/catalog" className={footerLink}>Catalog</Link>
              <Link href="/artists" className={footerLink}>Artists</Link>
              <Link href="/movements" className={footerLink}>Movements</Link>
            </div>
            <div>
              <p className={footerColHead}>Help</p>
              <Link href="/faq" className={footerLink}>FAQ</Link>
              <Link href="/shipping" className={footerLink}>Shipping &amp; Returns</Link>
              <Link href="/contact" className={footerLink}>Contact</Link>
            </div>
            <div>
              <p className={footerColHead}>Company</p>
              <Link href="/about" className={footerLink}>About</Link>
              <Link href="/terms" className={footerLink}>Terms</Link>
              <Link href="/privacy" className={footerLink}>Privacy</Link>
            </div>
          </div>
          <Ornament className="mb-7" />
          <p className="text-center font-sans text-xs tracking-wide text-ink-light">
            © {new Date().getFullYear()} Old Masters Print Shop. All reproductions public-domain or rights-cleared.
          </p>
        </div>
      </footer>
    </>
  );
}
