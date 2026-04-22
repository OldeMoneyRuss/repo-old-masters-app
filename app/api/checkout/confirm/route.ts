import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import {
  orders,
  orderItems,
  carts,
  cartItems,
  addresses,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  CART_COOKIE_NAME,
  findActiveCart,
  getCartWithItems,
  type CartIdentity,
} from "@/lib/cart";
import { sendOrderConfirmationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type ShippingMethod = "standard" | "expedited";

type ShippingAddressInput = {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone?: string;
};

type ConfirmBody = {
  paymentIntentId: string;
  email: string;
  shippingAddress: ShippingAddressInput;
  shippingMethod: ShippingMethod;
  saveAddress?: boolean;
};

function generateOrderNumber(): string {
  return `OMP-${Date.now().toString(36).toUpperCase()}`;
}

function shippingCentsFor(method: ShippingMethod): number {
  return method === "expedited" ? 2499 : 999;
}

function isValidBody(b: unknown): b is ConfirmBody {
  if (!b || typeof b !== "object") return false;
  const x = b as Record<string, unknown>;
  if (typeof x.paymentIntentId !== "string" || !x.paymentIntentId) return false;
  if (typeof x.email !== "string" || !x.email.includes("@")) return false;
  if (x.shippingMethod !== "standard" && x.shippingMethod !== "expedited") return false;
  const a = x.shippingAddress as Record<string, unknown> | null | undefined;
  if (!a || typeof a !== "object") return false;
  for (const k of ["fullName", "line1", "city", "region", "postalCode", "country"] as const) {
    if (typeof a[k] !== "string" || !a[k]) return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  const raw = (await req.json().catch(() => null)) as unknown;
  if (!isValidBody(raw)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const body = raw;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const intent = await stripe.paymentIntents.retrieve(body.paymentIntentId);
  if (intent.status !== "succeeded" && intent.status !== "processing") {
    return NextResponse.json(
      { error: `Payment not completed (status: ${intent.status})` },
      { status: 400 },
    );
  }

  // Idempotency: if /webhooks/stripe or a prior /confirm already wrote the order, return it.
  const [existing] = await db
    .select({ id: orders.id, orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.stripePaymentIntentId, body.paymentIntentId))
    .limit(1);
  if (existing) {
    return NextResponse.json({ orderNumber: existing.orderNumber });
  }

  const session = await auth();
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CART_COOKIE_NAME)?.value ?? null;

  const identity: CartIdentity | null = session?.user?.id
    ? { kind: "user", userId: session.user.id }
    : cookieToken
      ? { kind: "guest", token: cookieToken }
      : null;

  // Prefer cart referenced by the PaymentIntent metadata, falling back to session cart.
  const metaCartId =
    typeof intent.metadata?.cartId === "string" ? intent.metadata.cartId : null;

  let cartId: string | null = metaCartId;
  if (!cartId) {
    if (!identity) {
      return NextResponse.json({ error: "No active cart" }, { status: 400 });
    }
    const active = await findActiveCart(identity);
    if (!active) {
      return NextResponse.json({ error: "No active cart" }, { status: 400 });
    }
    cartId = active.id;
  }

  const cart = await getCartWithItems(cartId);
  if (cart.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const subtotalCents = parseInt(
    intent.metadata?.subtotalCents ?? String(cart.subtotalCents),
    10,
  );
  const shippingCents = parseInt(
    intent.metadata?.shippingCents ?? String(shippingCentsFor(body.shippingMethod)),
    10,
  );
  const totalCents = intent.amount;
  // Stripe Tax adds on top of the PI `amount` we submitted; the delta is tax.
  const taxCents = Math.max(0, totalCents - subtotalCents - shippingCents);

  const orderNumber = generateOrderNumber();
  const userId = session?.user?.id ?? null;

  const result = await db.transaction(async (tx) => {
    let shippingAddressId: string | null = null;
    if (userId && body.saveAddress) {
      const [addr] = await tx
        .insert(addresses)
        .values({
          userId,
          fullName: body.shippingAddress.fullName,
          line1: body.shippingAddress.line1,
          line2: body.shippingAddress.line2 ?? null,
          city: body.shippingAddress.city,
          region: body.shippingAddress.region,
          postalCode: body.shippingAddress.postalCode,
          country: body.shippingAddress.country,
          phone: body.shippingAddress.phone ?? null,
        })
        .returning({ id: addresses.id });
      shippingAddressId = addr.id;
    }

    const [order] = await tx
      .insert(orders)
      .values({
        orderNumber,
        userId,
        email: body.email,
        status: intent.status === "succeeded" ? "paid" : "pending_payment",
        subtotalCents,
        shippingCents,
        taxCents,
        totalCents,
        shippingAddressId,
        stripePaymentIntentId: body.paymentIntentId,
        placedAt: new Date(),
      })
      .returning({ id: orders.id, orderNumber: orders.orderNumber });

    await tx.insert(orderItems).values(
      cart.items.map((item) => ({
        orderId: order.id,
        artworkId: item.artworkId,
        artworkTitle: item.artworkTitle,
        artistName: item.artistName,
        printSize: item.printSize as "8x10" | "11x14" | "16x20" | "18x24" | "24x36" | "30x40",
        paperType: item.paperType as "archival_matte" | "lustre" | "fine_art_cotton",
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      })),
    );

    await tx
      .update(carts)
      .set({ status: "converted", updatedAt: new Date() })
      .where(eq(carts.id, cart.id));

    await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));

    return { orderNumber: order.orderNumber, items: cart.items };
  });

  // Fire-and-forget; failing to email shouldn't fail the order.
  sendOrderConfirmationEmail(body.email, {
    orderNumber: result.orderNumber,
    customerName: body.shippingAddress.fullName,
    items: result.items.map((i) => ({
      title: i.artworkTitle,
      artistName: i.artistName,
      printSize: i.printSize,
      paperType: i.paperType,
      quantity: i.quantity,
      unitPriceCents: i.unitPriceCents,
    })),
    subtotalCents,
    shippingCents,
    taxCents,
    totalCents,
    shippingAddress: {
      fullName: body.shippingAddress.fullName,
      line1: body.shippingAddress.line1,
      line2: body.shippingAddress.line2 ?? null,
      city: body.shippingAddress.city,
      region: body.shippingAddress.region,
      postalCode: body.shippingAddress.postalCode,
      country: body.shippingAddress.country,
    },
    orderUrl: new URL(
      `/checkout/confirmation/${result.orderNumber}`,
      process.env.NEXTAUTH_URL ?? "http://localhost:3000",
    ).toString(),
  }).catch((err) => console.error("[checkout/confirm] email failed", err));

  return NextResponse.json({ orderNumber: result.orderNumber });
}
