import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, orderItems, carts, cartItems } from "@/db/schema";
import { getCartWithItems } from "@/lib/cart";
import { sendCancellationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type PrintSize = "8x10" | "11x14" | "16x20" | "18x24" | "24x36" | "30x40";
type PaperType = "archival_matte" | "lustre" | "fine_art_cotton";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("[webhook] Invalid signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const intent = event.data.object as Stripe.PaymentIntent;

      const cartId = intent.metadata?.cartId;
      if (!cartId) {
        console.error(
          `[webhook] payment_intent.succeeded ${intent.id} missing cartId metadata`,
        );
        break;
      }

      const cart = await getCartWithItems(cartId);
      if (!cart || cart.items.length === 0) break;

      const subtotalCents = parseInt(
        intent.metadata?.subtotalCents ?? "0",
        10,
      );
      const shippingCents = parseInt(
        intent.metadata?.shippingCents ?? "999",
        10,
      );
      const taxCents = Math.max(
        0,
        intent.amount - subtotalCents - shippingCents,
      );

      await db.transaction(async (tx) => {
        const orderNumber = `WH-${Date.now().toString(36).toUpperCase()}`;

        const inserted = await tx
          .insert(orders)
          .values({
            orderNumber,
            email:
              intent.receipt_email ??
              intent.metadata?.email ??
              "unknown",
            status: "paid",
            subtotalCents,
            shippingCents,
            taxCents,
            totalCents: intent.amount,
            stripePaymentIntentId: intent.id,
            placedAt: new Date(),
          })
          .onConflictDoNothing({
            target: orders.stripePaymentIntentId,
          })
          .returning({
            id: orders.id,
            orderNumber: orders.orderNumber,
          });

        // Another writer (e.g. /checkout/confirm) already created this order.
        if (inserted.length === 0) return;
        const order = inserted[0];

        await tx.insert(orderItems).values(
          cart.items.map((item) => ({
            orderId: order.id,
            artworkId: item.artworkId,
            artworkTitle: item.artworkTitle,
            artistName: item.artistName,
            printSize: item.printSize as PrintSize,
            paperType: item.paperType as PaperType,
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            lineTotalCents: item.lineTotalCents,
          })),
        );

        await tx
          .update(carts)
          .set({ status: "converted", updatedAt: new Date() })
          .where(eq(carts.id, cartId));
        await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));
      });
      break;
    }

    case "payment_intent.payment_failed": {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.error(
        `[webhook] Payment failed for PI ${intent.id}:`,
        intent.last_payment_error?.message,
      );
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const piId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : (charge.payment_intent as Stripe.PaymentIntent)?.id;
      if (!piId) break;

      const [order] = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          email: orders.email,
        })
        .from(orders)
        .where(eq(orders.stripePaymentIntentId, piId))
        .limit(1);
      if (!order) break;

      await db
        .update(orders)
        .set({ status: "refunded", updatedAt: new Date() })
        .where(eq(orders.id, order.id));

      sendCancellationEmail(order.email, {
        customerName: order.email,
        orderNumber: order.orderNumber,
        refundAmountCents: charge.amount_refunded,
        refundTimeline: "3–5 business days",
      }).catch(console.error);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
