# Old Masters Print Shop

E-commerce art reproduction website. Monolithic Next.js App Router application
deployed on Vercel, backed by managed PostgreSQL via Drizzle ORM.

See the product requirements (PRD) and technical design spec (TDS) in the Notion
workspace for the canonical source of truth.

## Stack

- **Framework** — Next.js (App Router) + TypeScript
- **Styling** — Tailwind CSS v4
- **ORM** — Drizzle ORM + drizzle-kit (PostgreSQL)
- **Auth** — NextAuth.js v5 (Auth.js)
- **Payments** — Stripe (Payment Element + Stripe Tax)
- **Email** — Resend + React Email
- **Images** — Sharp for derivative generation
- **Hosting** — Vercel

## Getting started

```bash
# Node version
nvm use   # reads .nvmrc (Node 20)

# Install deps
npm install

# Copy env template and fill in local values
cp .env.example .env.local

# Run dev server
npm run dev
```

Visit http://localhost:3000.

## Scripts

| Script             | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the Next.js dev server         |
| `npm run build`    | Production build                     |
| `npm run start`    | Run the production build             |
| `npm run lint`     | ESLint (Next.js core-web-vitals + TS)|
| `npm run typecheck`| `tsc --noEmit`                       |

## Environment variables

See [`.env.example`](.env.example). Required variables are documented in TDS §11.2.
Secrets live in Vercel Environment Variables, never committed to source.

## Project structure

Per TDS §2.3:

```
app/            Next.js App Router routes, layouts, route handlers
components/     Shared React components
lib/            Server utilities (db, stripe, resend, auth)
db/             Drizzle schema + migrations
emails/         React Email templates
scripts/        One-off utility scripts (seed, import)
public/         Static assets
```

## CI

GitHub Actions runs lint, typecheck, and build on every PR and push to `main`.
See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
