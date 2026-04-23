"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { artists, movements, museums } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "./slug";
import { logAdminAction } from "./audit";

const artistSchema = z.object({
  slug: z.string().min(1).max(160).optional().or(z.literal("")),
  name: z.string().min(1).max(200),
  bio: z.string().max(10_000).optional().or(z.literal("")),
  birthYear: z.coerce.number().int().min(-3000).max(3000).optional().nullable(),
  deathYear: z.coerce.number().int().min(-3000).max(3000).optional().nullable(),
  nationality: z.string().max(100).optional().or(z.literal("")),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(1000).optional().or(z.literal("")),
});

const movementSchema = z.object({
  slug: z.string().min(1).max(160).optional().or(z.literal("")),
  name: z.string().min(1).max(200),
  description: z.string().max(10_000).optional().or(z.literal("")),
  dateRangeLabel: z.string().max(100).optional().or(z.literal("")),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(1000).optional().or(z.literal("")),
});

const museumSchema = z.object({
  slug: z.string().min(1).max(160).optional().or(z.literal("")),
  name: z.string().min(1).max(200),
  city: z.string().max(120).optional().or(z.literal("")),
  country: z.string().max(120).optional().or(z.literal("")),
  externalUrl: z.string().url().max(500).optional().or(z.literal("")),
});

function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj } as Record<string, unknown>;
  for (const [k, v] of Object.entries(out)) {
    if (v === "" || v === undefined) out[k] = null;
  }
  return out as T;
}

function toFormObject(formData: FormData): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [k, v] of formData.entries()) {
    out[k] = typeof v === "string" ? v : null;
  }
  return out;
}

async function ensureUniqueSlug(
  table: typeof artists | typeof movements | typeof museums,
  desired: string,
  excludeId?: string,
): Promise<string> {
  let candidate = desired;
  let i = 2;
  while (true) {
    const [row] = await db
      .select({ id: table.id })
      .from(table)
      .where(
        excludeId
          ? and(eq(table.slug, candidate), ne(table.id, excludeId))
          : eq(table.slug, candidate),
      )
      .limit(1);
    if (!row) return candidate;
    candidate = `${desired}-${i++}`;
  }
}

// ---------- Artists ----------

export async function upsertArtistAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const parsed = artistSchema.safeParse(toFormObject(formData));
  if (!parsed.success) {
    const base = id ? `/admin/artists/${id}` : "/admin/artists/new";
    redirect(`${base}?error=invalid`);
  }
  const data = emptyToNull(parsed.data);
  const slug = await ensureUniqueSlug(
    artists,
    slugify(data.slug?.toString() || data.name),
    id ?? undefined,
  );

  if (id) {
    await db
      .update(artists)
      .set({
        slug,
        name: data.name,
        bio: (data.bio as string | null) ?? null,
        birthYear: data.birthYear ?? null,
        deathYear: data.deathYear ?? null,
        nationality: (data.nationality as string | null) ?? null,
        seoTitle: (data.seoTitle as string | null) ?? null,
        seoDescription: (data.seoDescription as string | null) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(artists.id, id));
    await logAdminAction({
      actorUserId: session.user.id,
      action: "artist.update",
      entityType: "artist",
      entityId: id,
    });
  } else {
    const [row] = await db
      .insert(artists)
      .values({
        slug,
        name: data.name,
        bio: (data.bio as string | null) ?? null,
        birthYear: data.birthYear ?? null,
        deathYear: data.deathYear ?? null,
        nationality: (data.nationality as string | null) ?? null,
        seoTitle: (data.seoTitle as string | null) ?? null,
        seoDescription: (data.seoDescription as string | null) ?? null,
      })
      .returning({ id: artists.id });
    await logAdminAction({
      actorUserId: session.user.id,
      action: "artist.create",
      entityType: "artist",
      entityId: row.id,
    });
  }
  revalidatePath("/admin/artists");
  redirect("/admin/artists?saved=1");
}

export async function deleteArtistAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/artists?error=missing_id");
  await db.delete(artists).where(eq(artists.id, id));
  await logAdminAction({
    actorUserId: session.user.id,
    action: "artist.delete",
    entityType: "artist",
    entityId: id,
  });
  revalidatePath("/admin/artists");
  redirect("/admin/artists?deleted=1");
}

// ---------- Movements ----------

export async function upsertMovementAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const parsed = movementSchema.safeParse(toFormObject(formData));
  if (!parsed.success) {
    const base = id ? `/admin/movements/${id}` : "/admin/movements/new";
    redirect(`${base}?error=invalid`);
  }
  const data = emptyToNull(parsed.data);
  const slug = await ensureUniqueSlug(
    movements,
    slugify(data.slug?.toString() || data.name),
    id ?? undefined,
  );

  if (id) {
    await db
      .update(movements)
      .set({
        slug,
        name: data.name,
        description: (data.description as string | null) ?? null,
        dateRangeLabel: (data.dateRangeLabel as string | null) ?? null,
        seoTitle: (data.seoTitle as string | null) ?? null,
        seoDescription: (data.seoDescription as string | null) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(movements.id, id));
    await logAdminAction({
      actorUserId: session.user.id,
      action: "movement.update",
      entityType: "movement",
      entityId: id,
    });
  } else {
    const [row] = await db
      .insert(movements)
      .values({
        slug,
        name: data.name,
        description: (data.description as string | null) ?? null,
        dateRangeLabel: (data.dateRangeLabel as string | null) ?? null,
        seoTitle: (data.seoTitle as string | null) ?? null,
        seoDescription: (data.seoDescription as string | null) ?? null,
      })
      .returning({ id: movements.id });
    await logAdminAction({
      actorUserId: session.user.id,
      action: "movement.create",
      entityType: "movement",
      entityId: row.id,
    });
  }
  revalidatePath("/admin/movements");
  redirect("/admin/movements?saved=1");
}

export async function deleteMovementAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/movements?error=missing_id");
  await db.delete(movements).where(eq(movements.id, id));
  await logAdminAction({
    actorUserId: session.user.id,
    action: "movement.delete",
    entityType: "movement",
    entityId: id,
  });
  revalidatePath("/admin/movements");
  redirect("/admin/movements?deleted=1");
}

// ---------- Museums ----------

export async function upsertMuseumAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;
  const parsed = museumSchema.safeParse(toFormObject(formData));
  if (!parsed.success) {
    const base = id ? `/admin/museums/${id}` : "/admin/museums/new";
    redirect(`${base}?error=invalid`);
  }
  const data = emptyToNull(parsed.data);
  const slug = await ensureUniqueSlug(
    museums,
    slugify(data.slug?.toString() || data.name),
    id ?? undefined,
  );

  if (id) {
    await db
      .update(museums)
      .set({
        slug,
        name: data.name,
        city: (data.city as string | null) ?? null,
        country: (data.country as string | null) ?? null,
        externalUrl: (data.externalUrl as string | null) ?? null,
        updatedAt: new Date(),
      })
      .where(eq(museums.id, id));
    await logAdminAction({
      actorUserId: session.user.id,
      action: "museum.update",
      entityType: "museum",
      entityId: id,
    });
  } else {
    const [row] = await db
      .insert(museums)
      .values({
        slug,
        name: data.name,
        city: (data.city as string | null) ?? null,
        country: (data.country as string | null) ?? null,
        externalUrl: (data.externalUrl as string | null) ?? null,
      })
      .returning({ id: museums.id });
    await logAdminAction({
      actorUserId: session.user.id,
      action: "museum.create",
      entityType: "museum",
      entityId: row.id,
    });
  }
  revalidatePath("/admin/museums");
  redirect("/admin/museums?saved=1");
}

export async function deleteMuseumAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/museums?error=missing_id");
  await db.delete(museums).where(eq(museums.id, id));
  await logAdminAction({
    actorUserId: session.user.id,
    action: "museum.delete",
    entityType: "museum",
    entityId: id,
  });
  revalidatePath("/admin/museums");
  redirect("/admin/museums?deleted=1");
}
