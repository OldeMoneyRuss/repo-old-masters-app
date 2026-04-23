import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireAdmin();
  const { id } = await params;

  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const raw = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(verificationTokens).values({
    userId: user.id,
    tokenHash,
    purpose: "password_reset",
    expiresAt,
  });

  await sendPasswordResetEmail(user.email, user.name ?? user.email, raw);

  return NextResponse.json({ ok: true });
}
