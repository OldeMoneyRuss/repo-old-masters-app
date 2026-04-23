import { db } from "@/lib/db";
import { adminAuditLog } from "@/db/schema";

type AuditArgs = {
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
};

export async function logAuditEvent(args: AuditArgs): Promise<void> {
  await db.insert(adminAuditLog).values({
    actorUserId: args.actorUserId,
    action: args.action,
    entityType: args.entityType,
    entityId: args.entityId ?? null,
    payload: args.payload ?? null,
    ip: args.ip ?? null,
    userAgent: args.userAgent ?? null,
  });
}
