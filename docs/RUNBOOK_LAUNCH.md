# Pre-Launch Purchase Test Runbook (OMP-45)

Execute this runbook against the Vercel **preview** deployment in Stripe **test mode** before promoting to production.

---

## Prerequisites

| Item | Where to find it |
|------|-----------------|
| Preview URL | Vercel dashboard → Deployments → latest preview |
| Stripe test dashboard | https://dashboard.stripe.com/test/payments |
| Resend test dashboard | https://resend.com/emails |
| Admin credentials | Use the seeded admin account (`npm run db:seed-admin`) |

---

## Step 1 — Browse to a product

1. Open the preview URL in an incognito window.
2. Navigate **Home → Catalog**.
3. Click any artwork card to open the PDP.
4. Confirm:
   - [ ] Artwork title, artist name, and image load correctly.
   - [ ] Size and paper-type selectors render; price updates when changed.
   - [ ] JSON-LD `<script type="application/ld+json">` present in page source (⌘U → search "Product").

---

## Step 2 — Add to cart and proceed to checkout

1. Select a print size (e.g. 16×20) and paper type (e.g. Archival Matte).
2. Click **Add to Cart**.
3. Confirm:
   - [ ] Cart count increments in the header.
   - [ ] Cart drawer / cart page shows the correct item, size, paper, and line total.
4. Click **Proceed to Checkout**.

---

## Step 3 — Guest checkout with Stripe test card

Fill in the checkout form:

| Field | Value |
|-------|-------|
| Email | `buyer@example.com` |
| Card number | `4242 4242 4242 4242` |
| Expiry | Any future date (e.g. `12/30`) |
| CVC | `123` |
| ZIP | `10001` |

Click **Pay**.

Expected: redirect to `/checkout/confirmation/WH-XXXXXXXX`.

Confirm:
- [ ] Confirmation page shows order number (`WH-`).
- [ ] Order total matches what was shown in cart.
- [ ] "Thank you" / confirmation copy is visible.

---

## Step 4 — Verify backend state

### 4a. Stripe dashboard
1. Open [Stripe test payments](https://dashboard.stripe.com/test/payments).
2. Find the Payment Intent just created — status should be **Succeeded**.
3. Expand **Metadata** — confirm `cartId` is present.

### 4b. Stripe webhook event
1. In Stripe dashboard → **Developers → Webhooks → [your endpoint]**.
2. Confirm a `payment_intent.succeeded` event was delivered with status **200**.

Expected log line in Vercel runtime logs:
```
[webhook] order created WH-XXXXXXXX for buyer@example.com
```

### 4c. Resend dashboard
1. Open [Resend emails](https://resend.com/emails).
2. Confirm an order confirmation email was delivered to `buyer@example.com`.
3. Open the email — check order number, item list, and totals.

---

## Step 5 — Admin order management

1. Log in at `{preview-url}/admin`.
2. Navigate to **Orders**.
3. Confirm:
   - [ ] The new order appears with status `paid`.
   - [ ] Clicking the order shows item detail, customer email, and totals.
4. Advance the order: **paid → in_production → quality_check → shipped**.
5. Confirm each transition succeeds and the status badge updates.

---

## Step 6 — SEO and security spot-checks

```bash
# CSP, HSTS, X-Frame-Options headers present
curl -sI {preview-url}/ | grep -E 'content-security-policy|strict-transport|x-frame'

# Robots.txt disallows admin
curl -s {preview-url}/robots.txt

# Sitemap contains the artwork slug you viewed
curl -s {preview-url}/sitemap.xml | grep {slug}
```

---

## Step 7 — GA4 DebugView (optional)

1. Install [Google Analytics Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger) extension.
2. Open GA4 → **Configure → DebugView**.
3. Repeat the purchase flow.
4. Confirm events appear: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.

---

## Pass criteria

All checkboxes above are checked and:
- [ ] No JS errors in browser console.
- [ ] No 5xx responses in Vercel runtime logs.
- [ ] Stripe webhook status 200.
- [ ] Confirmation email received.
- [ ] Order visible and advanceable in admin.

Once all criteria are met, merge the PR to `main` and promote to production.

---

## Real-card production validation

Real-card charging in production is **not** covered by this runbook. After deploying to production, validate with a live card (and refund immediately) to confirm Stripe live keys are wired correctly. This step is performed by the project owner (Russ).
