import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3-compatible storage client. Works with Cloudflare R2 (preferred per
 * decision OMP-34) or AWS S3 by swapping the endpoint env var.
 *
 * Required env:
 *   STORAGE_ACCOUNT_ID          (R2 account ID; ignored for AWS)
 *   STORAGE_ACCESS_KEY_ID
 *   STORAGE_SECRET_ACCESS_KEY
 *   STORAGE_BUCKET_PRIVATE      master images
 *   STORAGE_BUCKET_PUBLIC       derivatives served through CDN
 *   CDN_BASE_URL                public origin for derivatives
 */

function endpoint(): string | undefined {
  if (process.env.STORAGE_ENDPOINT) return process.env.STORAGE_ENDPOINT;
  if (process.env.STORAGE_ACCOUNT_ID) {
    return `https://${process.env.STORAGE_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }
  return undefined;
}

let _client: S3Client | null = null;
export function storageClient(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: process.env.STORAGE_REGION ?? "auto",
    endpoint: endpoint(),
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? "",
    },
  });
  return _client;
}

export const buckets = {
  private: () => must("STORAGE_BUCKET_PRIVATE"),
  public: () => must("STORAGE_BUCKET_PUBLIC"),
};

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

type PutOpts = {
  bucket: string;
  key: string;
  body: PutObjectCommandInput["Body"];
  contentType: string;
  cacheControl?: string;
};

export async function putObject({
  bucket,
  key,
  body,
  contentType,
  cacheControl,
}: PutOpts): Promise<void> {
  await storageClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
}

export async function presignGetUrl(
  bucket: string,
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  return getSignedUrl(
    storageClient(),
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: expiresInSeconds },
  );
}

export function publicUrl(key: string): string {
  const base = must("CDN_BASE_URL").replace(/\/$/, "");
  return `${base}/${key}`;
}
