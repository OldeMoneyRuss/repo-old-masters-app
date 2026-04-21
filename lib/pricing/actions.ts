"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { pricingConfig, type PriceModifiers } from "@/db/schema/pricing";
import { requireAdmin } from "@/lib/auth";
import { invalidatePricingCache } from "@/lib/pricing";
import { logAdminAction } from "@/lib/cms/audit";
import { PRINT_SIZES } from "@/lib/images/sizes";

const PAPER_TYPES = ["archival_matte", "lustre", "fine_art_cotton"] as const;

const updateSchema = z.object({
  basePriceCents: z.coerce.number().int().min(0).max(1_000_000),
  sizeModifiers: z.record(z.string(), z.coerce.number().int()),
  paperModifiers: z.record(z.string(), z.coerce.number().int()),
});

export async function updatePricingAction(formData: FormData) {
  const session = await requireAdmin();

  const sizeModifiers: PriceModifiers = {};
  for (const size of PRINT_SIZES) {
    const raw = formData.get(`size_${size}`);
    if (raw != null && raw !== "") {
      sizeModifiers[size] = Number(raw);
    }
  }
  const paperModifiers: PriceModifiers = {};
  for (const paper of PAPER_TYPES) {
    const raw = formData.get(`paper_${paper}`);
    if (raw != null && raw !== "") {
      paperModifiers[paper] = Number(raw);
    }
  }

  const parsed = updateSchema.safeParse({
    basePriceCents: formData.get("basePriceCents"),
    sizeModifiers,
    paperModifiers,
  });
  if (!parsed.success) {
    redirect("/admin/pricing?error=invalid");
  }

  await db
    .insert(pricingConfig)
    .values({
      id: 1,
      basePriceCents: parsed.data.basePriceCents,
      sizeModifiers: parsed.data.sizeModifiers,
      paperModifiers: parsed.data.paperModifiers,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pricingConfig.id,
      set: {
        basePriceCents: parsed.data.basePriceCents,
        sizeModifiers: parsed.data.sizeModifiers,
        paperModifiers: parsed.data.paperModifiers,
        updatedAt: new Date(),
      },
    });

  invalidatePricingCache();

  await logAdminAction({
    actorUserId: session.user.id,
    action: "pricing.update",
    entityType: "pricing_config",
    entityId: "1",
    payload: parsed.data,
  });

  revalidatePath("/admin/pricing");
  redirect("/admin/pricing?saved=1");
}
