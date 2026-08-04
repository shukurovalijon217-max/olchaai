#!/usr/bin/env tsx
/**
 * backfill-r2-cache-headers.ts
 *
 * One-time backfill: iterates every object in the R2 bucket and copies it
 * in-place with `Cache-Control: public, max-age=31536000, immutable` so that
 * Cloudflare edge-caches files uploaded before r2FinalizeUpload was in place.
 *
 * Idempotent — objects that already carry the correct Cache-Control header
 * are skipped without a copy.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server backfill:r2-cache-headers
 *
 * Required env vars (already in Replit Secrets):
 *   R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID,
 *   R2_BUCKET_NAME, R2_PUBLIC_URL
 *
 * Optional:
 *   DRY_RUN=1   — print what would be copied without actually doing it
 *   PREFIX=     — limit scan to a specific key prefix (e.g. PREFIX=uploads/)
 */

import {
  S3Client,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";

// ── Config ────────────────────────────────────────────────────────────────────

const REQUIRED_CACHE_CONTROL = "public, max-age=31536000, immutable";
const CONCURRENCY = 10; // parallel copy workers
const DRY_RUN = process.env.DRY_RUN === "1";
const KEY_PREFIX = process.env.PREFIX ?? "";

function getClient(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  if (
    !accountId ||
    !process.env.R2_ACCESS_KEY_ID ||
    !process.env.R2_SECRET_ACCESS_KEY ||
    !process.env.R2_BUCKET_NAME
  ) {
    console.error(
      "❌  Missing R2 env vars: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME"
    );
    process.exit(1);
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    },
    forcePathStyle: false,
  });
}

function getBucket(): string {
  return process.env.R2_BUCKET_NAME!;
}

// ── List all object keys ───────────────────────────────────────────────────────

async function* listAllKeys(
  client: S3Client,
  bucket: string,
  prefix: string
): AsyncGenerator<string> {
  let continuationToken: string | undefined;
  let page = 0;
  do {
    page++;
    const resp = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix || undefined,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      })
    );
    for (const obj of resp.Contents ?? []) {
      if (obj.Key) yield obj.Key;
    }
    continuationToken = resp.NextContinuationToken;
    if (page % 10 === 0) {
      process.stdout.write(`  …listed ${page * 1000} objects so far\n`);
    }
  } while (continuationToken);
}

// ── Process one key ────────────────────────────────────────────────────────────

async function processKey(
  client: S3Client,
  bucket: string,
  key: string
): Promise<"skipped" | "updated" | "dry-run"> {
  // HeadObject to read existing Cache-Control and ContentType
  const head = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key })
  );

  if (head.CacheControl === REQUIRED_CACHE_CONTROL) {
    return "skipped";
  }

  if (DRY_RUN) {
    return "dry-run";
  }

  const contentType = head.ContentType ?? "application/octet-stream";

  // Copy in-place with REPLACE metadata so CacheControl is set
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: key,
      CopySource: `${bucket}/${key}`,
      MetadataDirective: "REPLACE",
      ContentType: contentType,
      CacheControl: REQUIRED_CACHE_CONTROL,
    })
  );

  return "updated";
}

// ── Concurrency pool ───────────────────────────────────────────────────────────

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const item = items[idx++];
      await fn(item);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const client = getClient();
  const bucket = getBucket();

  console.log(`R2 bucket  : ${bucket}`);
  console.log(`Key prefix : ${KEY_PREFIX || "(all)"}`);
  console.log(`Dry run    : ${DRY_RUN}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Target     : Cache-Control: ${REQUIRED_CACHE_CONTROL}\n`);

  // Collect all keys first so we can show a total count
  process.stdout.write("Listing objects…\n");
  const allKeys: string[] = [];
  for await (const key of listAllKeys(client, bucket, KEY_PREFIX)) {
    allKeys.push(key);
  }
  console.log(`Total objects to inspect: ${allKeys.length}\n`);

  if (allKeys.length === 0) {
    console.log("Bucket is empty (or no objects match the prefix). Nothing to do.");
    return;
  }

  let skipped = 0;
  let updated = 0;
  let dryRun = 0;
  let failed = 0;
  let processed = 0;

  await runWithConcurrency(allKeys, CONCURRENCY, async (key) => {
    try {
      const result = await processKey(client, bucket, key);
      processed++;
      if (result === "skipped") {
        skipped++;
      } else if (result === "updated") {
        updated++;
        console.log(`  ✓ updated  ${key}`);
      } else {
        dryRun++;
        console.log(`  ~ dry-run  ${key}  (would copy-in-place)`);
      }
      if (processed % 100 === 0) {
        console.log(
          `  Progress: ${processed}/${allKeys.length}  updated=${updated}  skipped=${skipped}  failed=${failed}`
        );
      }
    } catch (err) {
      failed++;
      console.error(
        `  ✗ failed   ${key}:`,
        err instanceof Error ? err.message : err
      );
    }
  });

  console.log("\n──────────────────────────────────────────────");
  if (DRY_RUN) {
    console.log(`Dry-run complete.`);
    console.log(`  Would update : ${dryRun}`);
    console.log(`  Already ok   : ${skipped}`);
  } else {
    console.log(`Backfill complete.`);
    console.log(`  Updated  : ${updated}`);
    console.log(`  Skipped  : ${skipped} (already had correct Cache-Control)`);
    console.log(`  Failed   : ${failed}`);
  }

  if (failed > 0) {
    console.error("\nSome objects failed — re-run to retry them.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
