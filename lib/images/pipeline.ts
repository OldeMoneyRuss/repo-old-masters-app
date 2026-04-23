import { createHash } from "node:crypto";
import sharp from "sharp";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  artworks,
  assets,
  artworkSizeEligibility,
} from "@/db/schema";
import { putObject, buckets } from "@/lib/storage";
import {
  ALLOWED_MASTER_MIME,
  DERIVATIVE_SPECS,
  MAX_MASTER_BYTES,
  MIN_MASTER_LONGEST_EDGE,
  type DerivativeKind,
} from "./sizes";
import { computeEligibility } from "./fit-pad";
import { extractDominantColors } from "./palette";

type IngestResult = {
  masterAssetId: string;
  width: number;
  height: number;
  dominantColors: string[];
  derivatives: DerivativeKind[];
};

export async function ingestMasterImage(options: {
  artworkId: string;
  buffer: Buffer;
  mimeType: string;
  originalFilename: string;
}): Promise<IngestResult> {
  const { artworkId, buffer, mimeType, originalFilename } = options;
  if (!ALLOWED_MASTER_MIME.has(mimeType)) {
    throw new Error(`Unsupported master image MIME type: ${mimeType}`);
  }
  if (buffer.byteLength > MAX_MASTER_BYTES) {
    throw new Error(
      `Master image exceeds max size (${buffer.byteLength} bytes > ${MAX_MASTER_BYTES}).`,
    );
  }

  const meta = await sharp(buffer, { failOn: "error" }).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) {
    throw new Error("Could not read image dimensions.");
  }
  if (Math.max(width, height) < MIN_MASTER_LONGEST_EDGE) {
    throw new Error(
      `Master image too small: longest edge ${Math.max(
        width,
        height,
      )}px < required ${MIN_MASTER_LONGEST_EDGE}px.`,
    );
  }

  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const orientation =
    width > height ? "landscape" : width < height ? "portrait" : "square";

  const masterKey = `artworks/${artworkId}/master/${sha256}${extFor(mimeType)}`;
  await putObject({
    bucket: buckets.private(),
    key: masterKey,
    body: buffer,
    contentType: mimeType,
    cacheControl: "private, max-age=31536000, immutable",
  });

  const [masterAsset] = await db
    .insert(assets)
    .values({
      artworkId,
      kind: "master",
      bucket: buckets.private(),
      key: masterKey,
      mimeType,
      widthPx: width,
      heightPx: height,
      sizeBytes: buffer.byteLength,
      sha256,
    })
    .returning({ id: assets.id });

  const producedKinds: DerivativeKind[] = [];
  for (const kind of Object.keys(DERIVATIVE_SPECS) as DerivativeKind[]) {
    const spec = DERIVATIVE_SPECS[kind];
    const pipeline = sharp(buffer).rotate();
    const resized =
      spec.mode === "cover"
        ? pipeline.resize(spec.width, spec.height, {
            fit: "cover",
            position: sharp.strategy.attention,
          })
        : pipeline.resize({
            width: spec.longestEdge,
            height: spec.longestEdge,
            fit: "inside",
            withoutEnlargement: true,
          });

    const isJpeg = kind === "thumb" || kind === "catalog" || kind === "email";
    const out = isJpeg
      ? await resized.jpeg({ quality: 82, mozjpeg: true }).toBuffer({
          resolveWithObject: true,
        })
      : await resized
          .webp({ quality: 82, effort: 4 })
          .toBuffer({ resolveWithObject: true });

    const ext = isJpeg ? "jpg" : "webp";
    const contentType = isJpeg ? "image/jpeg" : "image/webp";
    const key = `artworks/${artworkId}/${kind}.${ext}`;

    await putObject({
      bucket: buckets.public(),
      key,
      body: out.data,
      contentType,
      cacheControl: "public, max-age=31536000, immutable",
    });

    await db.insert(assets).values({
      artworkId,
      kind,
      bucket: buckets.public(),
      key,
      mimeType: contentType,
      widthPx: out.info.width,
      heightPx: out.info.height,
      sizeBytes: out.info.size,
    });

    producedKinds.push(kind);
  }

  const eligibility = computeEligibility(width, height);
  await db.transaction(async (tx) => {
    await tx
      .delete(artworkSizeEligibility)
      .where(eq(artworkSizeEligibility.artworkId, artworkId));
    if (eligibility.length) {
      await tx.insert(artworkSizeEligibility).values(
        eligibility.map((e) => ({
          artworkId,
          printSize: e.size,
          dpi: e.dpi,
          eligible: e.eligible,
          borderTreatment: "fit_pad",
        })),
      );
    }
  });

  const dominantColors = await extractDominantColors(buffer).catch(() => []);

  await db
    .update(artworks)
    .set({
      masterAssetId: masterAsset.id,
      orientation,
      updatedAt: new Date(),
    })
    .where(eq(artworks.id, artworkId));

  if (dominantColors.length) {
    await db
      .update(assets)
      .set({ dominantColors })
      .where(eq(assets.id, masterAsset.id));
  }

  console.log(
    `[images] Ingested ${originalFilename} for artwork ${artworkId}: ${producedKinds.length} derivatives.`,
  );

  return {
    masterAssetId: masterAsset.id,
    width,
    height,
    dominantColors,
    derivatives: producedKinds,
  };
}

function extFor(mime: string): string {
  if (mime === "image/tiff") return ".tif";
  if (mime === "image/png") return ".png";
  return ".jpg";
}
