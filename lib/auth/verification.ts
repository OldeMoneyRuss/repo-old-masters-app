import { randomBytes, createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/db/schema";

const TTL_HOURS = 24;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function issueVerificationToken(
  userId: string,
): Promise<string> {
  const raw = randomBytes(32).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
  await db.insert(verificationTokens).values({
    userId,
    tokenHash,
    purpose: "email_verification",
    expiresAt,
  });
  return raw;
}

export async function consumeVerificationToken(
  raw: string,
): Promise<{ ok: true; userId: string } | { ok: false; reason: string }> {
  const tokenHash = hashToken(raw);
  const [row] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.tokenHash, tokenHash),
        isNull(verificationTokens.consumedAt),
        gt(verificationTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, reason: "invalid_or_expired" };

  await db.transaction(async (tx) => {
    await tx
      .update(verificationTokens)
      .set({ consumedAt: new Date() })
      .where(eq(verificationTokens.id, row.id));
    await tx
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, row.userId));
  });

  return { ok: true, userId: row.userId };
}
