import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { sendShippedEmail } from "@/lib/email";

const ALLOWED_TRANSITIONS: Record<string, string> = {
  paid: "in_production",
  in_production: "quality_check",
  quality_check: "shipped",
  shipped: "delivered",
};

const bodySchema = z.object({
  status: z.string(),
  trackingNumber: z.string().optional(),
  trackingCarrier: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  const { id } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const { status: targetStatus, trackingNumber, trackingCarrier } = parsed.data;

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const allowedNext = ALLOWED_TRANSITIONS[order.status];
  if (allowedNext !== targetStatus) {
    return NextResponse.json(
      { error: `Cannot transition from ${order.status} to ${targetStatus}.` },
      { status: 422 },
    );
  }

  if (targetStatus === "shipped") {
    if (!trackingNumber?.trim() || !trackingCarrier?.trim()) {
      return NextResponse.json(
        { error: "Tracking number and carrier are required before marking Shipped." },
        { status: 422 },
      );
    }
  }

  const now = new Date();
  const patch: Partial<typeof orders.$inferInsert> = {
    status: targetStatus as typeof orders.$inferInsert["status"],
    updatedAt: now,
  };
  if (targetStatus === "shipped") {
    patch.trackingNumber = trackingNumber!.trim();
    patch.trackingCarrier = trackingCarrier!.trim();
    patch.shippedAt = now;
  }
  if (targetStatus === "delivered") {
    patch.deliveredAt = now;
  }

  await db.update(orders).set(patch).where(eq(orders.id, id));

  await logAuditEvent({
    actorUserId: session.user.id ?? null,
    action: "order.status_change",
    entityType: "order",
    entityId: id,
    payload: { from: order.status, to: targetStatus },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  if (targetStatus === "shipped") {
    await sendShippedEmail(order.email, {
      customerName: order.email,
      orderNumber: order.orderNumber,
      trackingNumber: trackingNumber!.trim(),
      trackingCarrier: trackingCarrier!.trim(),
      estimatedDelivery: "3–5 business days",
      orderUrl: `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/account/orders/${id}`,
    }).catch((err) => console.error("[status] shipped email failed:", err));
  }

  return NextResponse.json({ ok: true });
}
