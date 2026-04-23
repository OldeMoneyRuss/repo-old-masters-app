import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

const bodySchema = z.object({
  role: z.enum(["customer", "admin", "super_admin"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSuperAdmin();
  const { id } = await params;

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  const { role } = parsed.data;

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const previousRole = user.role;
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));

  await logAuditEvent({
    actorUserId: session.user.id ?? null,
    action: "user.role_change",
    entityType: "user",
    entityId: id,
    payload: { from: previousRole, to: role },
    ip: req.headers.get("x-forwarded-for") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
