/**
 * Integration tests for the Stripe webhook handler.
 * DB and external services are mocked; Stripe signature is computed with the
 * real stripe.webhooks.generateTestHeaderString helper so the actual
 * signature-verification code path exercises.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import Stripe from "stripe";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockTransaction = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    transaction: mockTransaction,
    select: mockSelect,
    update: mockUpdate,
  },
}));

const mockGetCartWithItems = vi.fn();
vi.mock("@/lib/cart", () => ({ getCartWithItems: mockGetCartWithItems }));
vi.mock("@/lib/email", () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/analytics/ga-server", () => ({
  sendPurchaseEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("drizzle-orm", () => ({ eq: (_: unknown, v: unknown) => v }));
vi.mock("@/db/schema", () => ({
  orders: { stripePaymentIntentId: "stripePaymentIntentId", id: "id" },
  orderItems: {},
  carts: {},
  cartItems: {},
}));

// ── Constants ─────────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = "whsec_test_secret_for_integration_tests";
process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

const stripe = new Stripe("sk_test_placeholder");

// ── Helpers ───────────────────────────────────────────────────────────────────

function signedRequest(payload: object): NextRequest {
  const body = JSON.stringify(payload);
  const sig = stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret: WEBHOOK_SECRET,
  });
  return new NextRequest("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": sig },
    body,
  });
}

function stubDbForInsert(returning: object[]) {
  const txInsert = vi.fn().mockReturnValue({
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(returning),
  });
  const txUpdate = vi.fn().mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
  });
  const txDelete = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

  mockTransaction.mockImplementation(
    (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
      fn({ insert: txInsert, update: txUpdate, delete: txDelete }),
  );
}

function stubDbForRefund() {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{
          id: "order-1",
          orderNumber: "WH-REF",
          email: "buyer@example.com",
        }]),
      }),
    }),
  });
  mockUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
  });
}

const CART_ITEM = {
  artworkId: "art-1",
  artworkTitle: "The Birth of Venus",
  artistName: "Botticelli",
  printSize: "16x20",
  paperType: "archival_matte",
  quantity: 1,
  unitPriceCents: 7500,
  lineTotalCents: 7500,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/stripe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects request with no stripe-signature header", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("No signature");
  });

  it("rejects request with invalid signature", async () => {
    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const req = new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "v1=bad,t=0" },
      body: JSON.stringify({ type: "test" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Invalid signature");
  });

  it("payment_intent.succeeded — happy path creates order", async () => {
    mockGetCartWithItems.mockResolvedValue({ id: "cart-1", items: [CART_ITEM] });
    stubDbForInsert([{ id: "order-1", orderNumber: "WH-ABC" }]);

    const payload = {
      id: "evt_1", type: "payment_intent.succeeded",
      data: { object: {
        id: "pi_1", object: "payment_intent", amount: 8499,
        receipt_email: "buyer@example.com",
        metadata: { cartId: "cart-1", subtotalCents: "7500", shippingCents: "999" },
        last_payment_error: null,
      }},
    };

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(signedRequest(payload));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
    expect(mockTransaction).toHaveBeenCalledOnce();
  });

  it("payment_intent.succeeded — idempotent on re-delivery (no duplicate order)", async () => {
    mockGetCartWithItems.mockResolvedValue({ id: "cart-1", items: [CART_ITEM] });
    stubDbForInsert([]); // onConflictDoNothing returned nothing → already exists

    const payload = {
      id: "evt_2", type: "payment_intent.succeeded",
      data: { object: {
        id: "pi_dup", object: "payment_intent", amount: 8499,
        receipt_email: "buyer@example.com",
        metadata: { cartId: "cart-1", subtotalCents: "7500", shippingCents: "999" },
        last_payment_error: null,
      }},
    };

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(signedRequest(payload));
    expect(res.status).toBe(200);
  });

  it("payment_intent.payment_failed — returns 200 (logged, not fatal)", async () => {
    const payload = {
      id: "evt_3", type: "payment_intent.payment_failed",
      data: { object: {
        id: "pi_fail", object: "payment_intent", amount: 5999,
        last_payment_error: { message: "Card declined." },
      }},
    };

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(signedRequest(payload));
    expect(res.status).toBe(200);
    expect((await res.json()).received).toBe(true);
  });

  it("charge.refunded — updates order to refunded status", async () => {
    stubDbForRefund();

    const payload = {
      id: "evt_4", type: "charge.refunded",
      data: { object: {
        id: "ch_1", object: "charge",
        payment_intent: "pi_refund_1",
        amount_refunded: 8499,
      }},
    };

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const res = await POST(signedRequest(payload));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
