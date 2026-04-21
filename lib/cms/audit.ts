import { headers } from "next/headers";
import { db } from "@/lib/db";
import { adminAuditLog } from "@/db/schema";

type LogInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
};

export async function logAdminAction(input: LogInput): Promise<void> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const userAgent = h.get("user-agent");
  await db.insert(adminAuditLog).values({
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    payload: input.payload ?? null,
    ip: ip ?? undefined,
    userAgent: userAgent ?? undefined,
  });
}
