import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { sendCancellationEmail } from "@/lib/email";

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  const { id } = await params;

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status !== "paid") {
    return NextResponse.json(
      { error: `Orders can only be cancelled while status is 'paid'. Current: ${order.status}.` },
      { status: 422 },
    );
  }
  if (!order.stripePaymentIntentId) {
    return NextResponse.json(
      { error: "No Stripe payment intent found on this order." },
      { status: 422 },
    );
  }

  const refund = await stripe().refunds.create({
    payment_intent: order.stripePaymentIntentId,
  });

  await db
    .update(orders)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(orders.id, id));

  await logAuditEvent({
    actorUserId: session.user.id ?? null,
    action: "order.cancelled",
    entityType: "order",
    entityId: id,
    payload: {
      stripeRefundId: refund.id,
      refundAmountCents: refund.amount,
    },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  await sendCancellationEmail(order.email, {
    customerName: order.email,
    orderNumber: order.orderNumber,
    refundAmountCents: order.totalCents,
    refundTimeline: "3–5 business days",
  }).catch((err) => console.error("[cancel] email failed:", err));

  return NextResponse.json({ ok: true });
}
