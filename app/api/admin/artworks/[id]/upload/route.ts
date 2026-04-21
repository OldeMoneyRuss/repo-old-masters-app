import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { artworks } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { ingestMasterImage } from "@/lib/images/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (res) {
    return res as Response;
  }

  const { id } = await ctx.params;

  const [row] = await db
    .select({ id: artworks.id })
    .from(artworks)
    .where(eq(artworks.id, id))
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "artwork_not_found" }, { status: 404 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const result = await ingestMasterImage({
      artworkId: id,
      buffer,
      mimeType: file.type || "application/octet-stream",
      originalFilename: file.name,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "ingest_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
