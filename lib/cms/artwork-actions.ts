"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { artworks, artists, movements, museums } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "./slug";
import { logAdminAction } from "./audit";

const PUBLISH_STATUSES = ["draft", "published", "archived"] as const;

const artworkSchema = z.object({
  slug: z.string().max(200).optional().or(z.literal("")),
  title: z.string().min(1).max(300),
  artistId: z.string().uuid().optional().or(z.literal("")),
  movementId: z.string().uuid().optional().or(z.literal("")),
  museumId: z.string().uuid().optional().or(z.literal("")),
  yearLabel: z.string().max(80).optional().or(z.literal("")),
  shortDescription: z.string().max(2000).optional().or(z.literal("")),
  longDescription: z.string().max(20_000).optional().or(z.literal("")),
  provenanceNote: z.string().max(5000).optional().or(z.literal("")),
  subjectTags: z.string().max(2000).optional().or(z.literal("")),
  publishStatus: z.enum(PUBLISH_STATUSES),
  rightsApproved: z.string().optional().or(z.literal("")),
  sortWeight: z.coerce.number().int().min(-10_000).max(10_000).optional(),
  seoTitle: z.string().max(200).optional().or(z.literal("")),
  seoDescription: z.string().max(1000).optional().or(z.literal("")),
});

async function ensureUniqueArtworkSlug(desired: string, excludeId?: string) {
  let candidate = desired;
  let i = 2;
  while (true) {
    const [row] = await db
      .select({ id: artworks.id })
      .from(artworks)
      .where(
        excludeId
          ? and(eq(artworks.slug, candidate), ne(artworks.id, excludeId))
          : eq(artworks.slug, candidate),
      )
      .limit(1);
    if (!row) return candidate;
    candidate = `${desired}-${i++}`;
  }
}

function nullable(v: string | null | undefined): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

export async function upsertArtworkAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "") || null;

  const parsed = artworkSchema.safeParse({
    slug: formData.get("slug") ?? "",
    title: formData.get("title") ?? "",
    artistId: formData.get("artistId") ?? "",
    movementId: formData.get("movementId") ?? "",
    museumId: formData.get("museumId") ?? "",
    yearLabel: formData.get("yearLabel") ?? "",
    shortDescription: formData.get("shortDescription") ?? "",
    longDescription: formData.get("longDescription") ?? "",
    provenanceNote: formData.get("provenanceNote") ?? "",
    subjectTags: formData.get("subjectTags") ?? "",
    publishStatus: formData.get("publishStatus") ?? "draft",
    rightsApproved: formData.get("rightsApproved") ?? "",
    sortWeight: formData.get("sortWeight") ?? 0,
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
  });
  if (!parsed.success) {
    const base = id ? `/admin/artworks/${id}` : "/admin/artworks/new";
    redirect(`${base}?error=invalid`);
  }

  const d = parsed.data;
  const slug = await ensureUniqueArtworkSlug(
    slugify(d.slug || d.title),
    id ?? undefined,
  );
  const tags = (d.subjectTags || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const rightsApproved = d.rightsApproved === "on" || d.rightsApproved === "true";

  if (d.publishStatus === "published" && !rightsApproved) {
    const base = id ? `/admin/artworks/${id}` : "/admin/artworks/new";
    redirect(`${base}?error=rights_required`);
  }

  const publishedAt =
    d.publishStatus === "published" ? new Date() : null;

  const values = {
    slug,
    title: d.title,
    artistId: (nullable(d.artistId) as string | null) ?? null,
    movementId: (nullable(d.movementId) as string | null) ?? null,
    museumId: (nullable(d.museumId) as string | null) ?? null,
    yearLabel: nullable(d.yearLabel),
    shortDescription: nullable(d.shortDescription),
    longDescription: nullable(d.longDescription),
    provenanceNote: nullable(d.provenanceNote),
    subjectTags: tags,
    publishStatus: d.publishStatus,
    rightsApproved,
    sortWeight: d.sortWeight ?? 0,
    seoTitle: nullable(d.seoTitle),
    seoDescription: nullable(d.seoDescription),
    updatedAt: new Date(),
  };

  let artworkId = id;
  if (id) {
    await db
      .update(artworks)
      .set({
        ...values,
        publishedAt:
          d.publishStatus === "published" ? publishedAt ?? new Date() : null,
      })
      .where(eq(artworks.id, id));
    await logAdminAction({
      actorUserId: session.user.id,
      action: "artwork.update",
      entityType: "artwork",
      entityId: id,
      payload: { publishStatus: d.publishStatus },
    });
  } else {
    const [row] = await db
      .insert(artworks)
      .values({
        ...values,
        publishedAt,
      })
      .returning({ id: artworks.id });
    artworkId = row.id;
    await logAdminAction({
      actorUserId: session.user.id,
      action: "artwork.create",
      entityType: "artwork",
      entityId: row.id,
    });
  }

  revalidatePath("/admin/artworks");
  redirect(`/admin/artworks/${artworkId}?saved=1`);
}

export async function deleteArtworkAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/artworks?error=missing_id");
  await db.delete(artworks).where(eq(artworks.id, id));
  await logAdminAction({
    actorUserId: session.user.id,
    action: "artwork.delete",
    entityType: "artwork",
    entityId: id,
  });
  revalidatePath("/admin/artworks");
  redirect("/admin/artworks?deleted=1");
}

export async function listTaxonomies() {
  const [artistRows, movementRows, museumRows] = await Promise.all([
    db.select({ id: artists.id, name: artists.name }).from(artists).orderBy(artists.name),
    db.select({ id: movements.id, name: movements.name }).from(movements).orderBy(movements.name),
    db.select({ id: museums.id, name: museums.name }).from(museums).orderBy(museums.name),
  ]);
  return {
    artists: artistRows,
    movements: movementRows,
    museums: museumRows,
  };
}
