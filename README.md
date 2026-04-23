# Old Masters Print Shop

E-commerce art reproduction website. Monolithic Next.js App Router application
deployed on Vercel, backed by managed PostgreSQL via Drizzle ORM.

See the product requirements (PRD) and technical design spec (TDS) in the Notion
workspace for the canonical source of truth.

## Stack

- **Framework** — Next.js 16 (App Router) + TypeScript
- **Styling** — Tailwind CSS v4
- **ORM** — Drizzle ORM + drizzle-kit (PostgreSQL)
- **Auth** — NextAuth.js v5 (Auth.js) with Credentials + Argon2id hashing
- **Payments** — Stripe (Payment Element + Stripe Tax)
- **Email** — Resend + React Email
- **Images** — Sharp for derivative generation, node-vibrant for palette
- **Storage** — S3-compatible object storage (Cloudflare R2 recommended)
- **Hosting** — Vercel

## Getting started

```bash
# Node version
nvm use   # reads .nvmrc (Node 20)

# Install deps
npm install

# Copy env template and fill in local values
cp .env.example .env.local

# Generate + run the Drizzle migration against your dev DB
npm run db:generate
npm run db:migrate
npm run db:seed   # seeds the pricing_config singleton

# Run dev server
npm run dev
```

Visit http://localhost:3000. Admin console lives at http://localhost:3000/admin
(requires a user with `role = 'admin'` — see `scripts/seed-admin.ts`).

## Scripts

| Script              | Description                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start the Next.js dev server                       |
| `npm run build`     | Production build                                   |
| `npm run start`     | Run the production build                           |
| `npm run lint`      | ESLint (Next.js core-web-vitals + TS)              |
| `npm run typecheck` | `tsc --noEmit`                                     |
| `npm run db:generate` | Generate Drizzle migration SQL from schema       |
| `npm run db:migrate`  | Apply migrations to the DB in `DATABASE_URL`     |
| `npm run db:studio`   | Open drizzle-kit studio                          |
| `npm run db:seed`     | Seed `pricing_config` singleton row              |

## Environment variables

See [`.env.example`](.env.example). Required variables are documented in
[`docs/infrastructure.md`](docs/infrastructure.md) (alongside provisioning
instructions for Postgres, object storage, and Vercel). Secrets live in Vercel
Environment Variables, never in source.

## Project structure (TDS §2.3)

```
app/
├── layout.tsx                Root layout (html/body, fonts, metadata)
├── globals.css               Tailwind entry
├── (public)/                 Public storefront (catalog, PDP, cart, about)
│   ├── layout.tsx            Header + footer shell
│   ├── page.tsx              Home
│   ├── catalog/              Browse grid + filters (OMP-13)
│   ├── artworks/[slug]/      Product detail pages
│   ├── artists/[slug]/       Artist landing pages
│   ├── movements/[slug]/     Movement landing pages
│   └── cart/                 Cart page
├── (auth)/                   Unauthenticated flows
│   ├── login/
│   ├── register/
│   ├── verify/               Email verification
│   └── forgot-password/
├── (account)/                Customer account (auth required)
│   └── account/
│       ├── orders/
│       ├── addresses/
│       └── profile/
├── admin/                    Admin CMS (admin/super_admin role required)
│   ├── artworks/
│   ├── artists/
│   ├── movements/
│   ├── museums/
│   ├── pricing/
│   ├── orders/
│   └── import/
└── api/                      Route handlers (server only)
    ├── auth/                 NextAuth.js routes
    ├── admin/                Admin mutation endpoints
    ├── cache/                ISR revalidation + pricing cache bust
    └── catalog/              Catalog search / filter API (optional)

components/
├── ui/                       Primitive components (button, input, etc.)
├── admin/                    Admin-only shared components
└── storefront/               Public-facing shared components

lib/
├── auth/                     NextAuth v5 config, actions, verification
├── db/                       Drizzle client + query helpers
├── storage/                  S3-compatible object storage client
├── images/                   Sharp pipeline, DPI eligibility, color extract
├── pricing/                  Pricing formula + in-memory cache
├── email/                    Resend client + transactional templates
└── cms/                      CSV import + publish gating + revalidation

db/
├── schema/                   Drizzle table definitions (per-domain files)
└── migrations/               drizzle-kit generated SQL

emails/                       React Email templates
scripts/                      One-off utilities (seed-admin, import, etc.)
public/                       Static assets
```

Route groups `(public)`, `(auth)`, and `(account)` are wrapping folders — they
do not appear in the URL. `admin/` is a regular segment so every URL under it
is gated by `app/admin/layout.tsx`'s session/role check.

Auth is enforced in three layers:

1. **`middleware.ts`** — matches `/account/*` and `/admin/*` and redirects
   unauthenticated visitors to `/login` (edge-fast, runs before rendering).
2. **`app/(account)/layout.tsx`** and **`app/admin/layout.tsx`** — re-check the
   session server-side and verify role for admin routes. Never rely solely on
   middleware.
3. **API route handlers** — every mutation under `api/admin/*` calls
   `requireAdmin()` from `lib/auth`.

## CI

GitHub Actions runs lint, typecheck, and build on every PR and push to `main`.
See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
