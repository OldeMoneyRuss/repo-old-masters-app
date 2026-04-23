import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import {
  CART_COOKIE_NAME,
  findActiveCart,
  getCartWithItems,
  type CartIdentity,
} from "@/lib/cart";

export const dynamic = "force-dynamic";

type ShippingMethod = "standard" | "expedited";

function shippingCentsFor(method: ShippingMethod): number {
  return method === "expedited" ? 2499 : 999;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { shippingMethod?: ShippingMethod; cartId?: string }
    | null;

  if (!body || (body.shippingMethod !== "standard" && body.shippingMethod !== "expedited")) {
    return NextResponse.json(
      { error: "shippingMethod must be 'standard' or 'expedited'" },
      { status: 400 },
    );
  }
  const shippingMethod = body.shippingMethod;

  const session = await auth();
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CART_COOKIE_NAME)?.value ?? null;

  const identity: CartIdentity | null = session?.user?.id
    ? { kind: "user", userId: session.user.id }
    : cookieToken
      ? { kind: "guest", token: cookieToken }
      : null;

  if (!identity) {
    return NextResponse.json({ error: "No active cart" }, { status: 400 });
  }

  const active = await findActiveCart(identity);
  if (!active) {
    return NextResponse.json({ error: "No active cart" }, { status: 400 });
  }

  const cart = await getCartWithItems(active.id);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const subtotalCents = cart.subtotalCents;
  const shippingCents = shippingCentsFor(shippingMethod);
  const totalCents = subtotalCents + shippingCents;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const intent = await stripe.paymentIntents.create(
    {
      amount: totalCents,
      currency: "usd",
      metadata: {
        cartId: cart.id,
        shippingMethod,
        shippingCents: String(shippingCents),
        subtotalCents: String(subtotalCents),
      },
    },
    // Idempotency scoped to cart+method so retrying the same selection returns the same intent.
    { idempotencyKey: `cart-${cart.id}-${shippingMethod}` },
  );

  return NextResponse.json({
    clientSecret: intent.client_secret,
    intentId: intent.id,
    subtotalCents,
    shippingCents,
    totalCents,
  });
}
