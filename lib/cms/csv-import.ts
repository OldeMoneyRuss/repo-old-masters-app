"use server";

import Papa from "papaparse";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { artworks, artists, movements, museums } from "@/db/schema";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "./slug";
import { logAdminAction } from "./audit";

const rowSchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().max(200).optional().default(""),
  artist_slug: z.string().max(160).optional().default(""),
  movement_slug: z.string().max(160).optional().default(""),
  museum_slug: z.string().max(160).optional().default(""),
  year_label: z.string().max(80).optional().default(""),
  short_description: z.string().max(2000).optional().default(""),
  long_description: z.string().max(20_000).optional().default(""),
  provenance_note: z.string().max(5000).optional().default(""),
  subject_tags: z.string().max(2000).optional().default(""),
  publish_status: z.enum(["draft", "published", "archived"]).optional().default("draft"),
  rights_approved: z.string().optional().default("false"),
  sort_weight: z.string().optional().default("0"),
});

export type ImportReport = {
  ok: boolean;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export async function runCsvImportAction(formData: FormData): Promise<ImportReport> {
  const session = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return {
      ok: false,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [{ row: 0, message: "No file uploaded." }],
    };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const report: ImportReport = {
    ok: true,
    processed: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  if (parsed.errors.length) {
    for (const e of parsed.errors) {
      report.errors.push({
        row: e.row ?? 0,
        message: `Parse error: ${e.message}`,
      });
    }
  }

  const artistBySlug = new Map(
    (await db.select({ id: artists.id, slug: artists.slug }).from(artists)).map(
      (r) => [r.slug, r.id],
    ),
  );
  const movementBySlug = new Map(
    (await db.select({ id: movements.id, slug: movements.slug }).from(movements)).map(
      (r) => [r.slug, r.id],
    ),
  );
  const museumBySlug = new Map(
    (await db.select({ id: museums.id, slug: museums.slug }).from(museums)).map(
      (r) => [r.slug, r.id],
    ),
  );

  let rowIndex = 1; // header is row 1
  for (const raw of parsed.data) {
    rowIndex++;
    report.processed++;
    const result = rowSchema.safeParse(raw);
    if (!result.success) {
      report.skipped++;
      report.errors.push({
        row: rowIndex,
        message: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
      continue;
    }
    const r = result.data;

    const artistId = r.artist_slug ? (artistBySlug.get(r.artist_slug) ?? null) : null;
    const movementId = r.movement_slug ? (movementBySlug.get(r.movement_slug) ?? null) : null;
    const museumId = r.museum_slug ? (museumBySlug.get(r.museum_slug) ?? null) : null;

    if (r.artist_slug && !artistId) {
      report.skipped++;
      report.errors.push({
        row: rowIndex,
        message: `Unknown artist_slug: ${r.artist_slug}`,
      });
      continue;
    }
    if (r.movement_slug && !movementId) {
      report.skipped++;
      report.errors.push({
        row: rowIndex,
        message: `Unknown movement_slug: ${r.movement_slug}`,
      });
      continue;
    }
    if (r.museum_slug && !museumId) {
      report.skipped++;
      report.errors.push({
        row: rowIndex,
        message: `Unknown museum_slug: ${r.museum_slug}`,
      });
      continue;
    }

    const slug = slugify(r.slug || r.title);
    const tags = r.subject_tags.split(",").map((t) => t.trim()).filter(Boolean);
    const rightsApproved = /^(1|true|yes|y)$/i.test(r.rights_approved.trim());
    const sortWeight = Number.parseInt(r.sort_weight, 10) || 0;

    if (r.publish_status === "published" && !rightsApproved) {
      report.skipped++;
      report.errors.push({
        row: rowIndex,
        message: "Cannot import as published without rights_approved=true.",
      });
      continue;
    }

    const [existing] = await db
      .select({ id: artworks.id })
      .from(artworks)
      .where(eq(artworks.slug, slug))
      .limit(1);

    const publishedAt = r.publish_status === "published" ? new Date() : null;
    const values = {
      slug,
      title: r.title,
      artistId,
      movementId,
      museumId,
      yearLabel: r.year_label || null,
      shortDescription: r.short_description || null,
      longDescription: r.long_description || null,
      provenanceNote: r.provenance_note || null,
      subjectTags: tags,
      publishStatus: r.publish_status,
      rightsApproved,
      sortWeight,
      publishedAt,
      updatedAt: new Date(),
    };

    try {
      if (existing) {
        await db.update(artworks).set(values).where(eq(artworks.id, existing.id));
        report.updated++;
      } else {
        await db.insert(artworks).values(values);
        report.created++;
      }
    } catch (err) {
      report.skipped++;
      report.errors.push({
        row: rowIndex,
        message: err instanceof Error ? err.message : "db_error",
      });
    }
  }

  await logAdminAction({
    actorUserId: session.user.id,
    action: "artwork.bulk_import",
    entityType: "artwork",
    payload: {
      processed: report.processed,
      created: report.created,
      updated: report.updated,
      skipped: report.skipped,
    },
  });

  report.ok = report.errors.length === 0;
  revalidatePath("/");
  revalidatePath("/catalog");
  revalidateTag("artworks");
  return report;
}
