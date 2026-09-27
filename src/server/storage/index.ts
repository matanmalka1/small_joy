import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["jpeg", "png", "webp"]);

export class UploadError extends Error {}

type StoredObject = { url: string; storageKey: string };

interface StorageDriver {
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  remove(key: string): Promise<void>;
}

const localDriver: StorageDriver = {
  // Development only: files go to public/uploads (not persistent on serverless hosts).
  async put(key, body) {
    const dir = join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, key.split("/").pop()!), body);
    return `/uploads/${key.split("/").pop()}`;
  },
  async remove(key) {
    await unlink(join(process.cwd(), "public", "uploads", key.split("/").pop()!)).catch(() => undefined);
  },
};

function s3Driver(): StorageDriver {
  const e = env();
  if (!e.S3_BUCKET || !e.S3_ACCESS_KEY_ID || !e.S3_SECRET_ACCESS_KEY || !e.S3_PUBLIC_URL) {
    throw new UploadError("אחסון התמונות אינו מוגדר (S3_* חסרים)");
  }
  const client = new S3Client({
    region: e.S3_REGION,
    endpoint: e.S3_ENDPOINT,
    forcePathStyle: Boolean(e.S3_ENDPOINT),
    credentials: { accessKeyId: e.S3_ACCESS_KEY_ID, secretAccessKey: e.S3_SECRET_ACCESS_KEY },
  });
  return {
    async put(key, body, contentType) {
      await client.send(new PutObjectCommand({ Bucket: e.S3_BUCKET, Key: key, Body: body, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
      return `${e.S3_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
    },
    async remove(key) {
      await client.send(new DeleteObjectCommand({ Bucket: e.S3_BUCKET, Key: key }));
    },
  };
}

function driver(): StorageDriver {
  const e = env();
  if (e.STORAGE_DRIVER === "s3") return s3Driver();
  if (e.NODE_ENV === "production") throw new UploadError("בסביבת ייצור יש להגדיר STORAGE_DRIVER=s3");
  return localDriver;
}

/**
 * Validates by decoding the actual image bytes (not the file name / claimed
 * MIME type), re-encodes to WebP (strips EXIF/GPS metadata and any embedded
 * payloads) and stores it under a random name.
 */
export async function storeProductImage(file: File): Promise<StoredObject> {
  if (file.size === 0) throw new UploadError("הקובץ ריק");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("גודל קובץ מקסימלי: 5MB");
  const input = Buffer.from(await file.arrayBuffer());
  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new UploadError("הקובץ אינו תמונה תקינה");
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new UploadError("ניתן להעלות קבצי JPG, PNG או WEBP בלבד");
  if ((meta.width ?? 0) * (meta.height ?? 0) > 50_000_000) throw new UploadError("התמונה גדולה מדי");

  const output = await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const key = `products/${new Date().toISOString().slice(0, 7)}/${randomBytes(16).toString("hex")}.webp`;
  const url = await driver().put(key, output, "image/webp");
  return { url, storageKey: key };
}

export async function deleteStoredObject(storageKey: string | null | undefined) {
  if (!storageKey) return;
  try {
    await driver().remove(storageKey);
  } catch {
    // Orphaned objects are harmless; never block the admin action on cleanup.
  }
}
