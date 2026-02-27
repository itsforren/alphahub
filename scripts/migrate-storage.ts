/**
 * Storage Migration Script
 *
 * Migrates storage buckets and files from the old Supabase project to the new one,
 * preserving exact file paths so database references remain valid.
 *
 * Usage (full migration with service role key):
 *   OLD_SUPABASE_SERVICE_KEY="<old service role key>" \
 *   NEW_SUPABASE_URL="$SUPABASE_V2_URL" \
 *   NEW_SUPABASE_SERVICE_KEY="$SUPABASE_V2_SERVICE_ROLE_KEY" \
 *   npx tsx scripts/migrate-storage.ts
 *
 * Usage (public buckets only, no service key needed):
 *   NEW_SUPABASE_URL="$SUPABASE_V2_URL" \
 *   NEW_SUPABASE_SERVICE_KEY="$SUPABASE_V2_SERVICE_ROLE_KEY" \
 *   npx tsx scripts/migrate-storage.ts
 *
 * Usage (single bucket):
 *   OLD_SUPABASE_SERVICE_KEY="<key>" \
 *   NEW_SUPABASE_URL="$SUPABASE_V2_URL" \
 *   NEW_SUPABASE_SERVICE_KEY="$SUPABASE_V2_SERVICE_ROLE_KEY" \
 *   npx tsx scripts/migrate-storage.ts --bucket agreements
 *
 * Environment variables:
 *   OLD_SUPABASE_URL          - Old project URL (default: https://qydkrpirrfelgtcqasdx.supabase.co)
 *   OLD_SUPABASE_SERVICE_KEY  - Old project service role key (required for private buckets)
 *   NEW_SUPABASE_URL          - New project URL (required)
 *   NEW_SUPABASE_SERVICE_KEY  - New project service role key (required)
 *
 * Notes:
 *   - Uses upsert: true so reruns are safe (idempotent)
 *   - Public buckets (media, chat-attachments) can be migrated with just the anon key
 *   - Private bucket (agreements) requires OLD_SUPABASE_SERVICE_KEY
 *   - One .wav file (54.7 MB) exceeds free tier 50 MB upload limit
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Configuration ──

const OLD_URL =
  process.env.OLD_SUPABASE_URL ||
  "https://qydkrpirrfelgtcqasdx.supabase.co";

const OLD_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5ZGtycGlycmZlbGd0Y3Fhc2R4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzOTc5MzMsImV4cCI6MjA4MDk3MzkzM30.cuApLx0HIVbpS2x8hKB540xZklO0GbcO1f2a_WwZD8w";

// Service role key is preferred (accesses all buckets including private)
const OLD_KEY = process.env.OLD_SUPABASE_SERVICE_KEY || OLD_ANON_KEY;
const hasServiceKey = !!process.env.OLD_SUPABASE_SERVICE_KEY;

const NEW_URL = process.env.NEW_SUPABASE_URL || "";
const NEW_KEY = process.env.NEW_SUPABASE_SERVICE_KEY || "";

if (!NEW_URL || !NEW_KEY) {
  console.error(
    "ERROR: NEW_SUPABASE_URL and NEW_SUPABASE_SERVICE_KEY are required"
  );
  process.exit(1);
}

// Parse --bucket flag for single-bucket mode
const bucketArg = process.argv.find((a) => a.startsWith("--bucket"));
const targetBucket = bucketArg
  ? process.argv[process.argv.indexOf(bucketArg) + 1] ||
    bucketArg.split("=")[1]
  : null;

const ALL_BUCKETS = [
  { name: "media", public: true },
  { name: "agreements", public: false },
  { name: "chat-attachments", public: true },
];

const BUCKETS = targetBucket
  ? ALL_BUCKETS.filter((b) => b.name === targetBucket)
  : ALL_BUCKETS;

if (BUCKETS.length === 0) {
  console.error(`ERROR: Unknown bucket "${targetBucket}"`);
  console.error(`Valid buckets: ${ALL_BUCKETS.map((b) => b.name).join(", ")}`);
  process.exit(1);
}

// ── Clients ──

const oldSupabase = createClient(OLD_URL, OLD_KEY);
const newSupabase = createClient(NEW_URL, NEW_KEY);

// ── Stats ──

interface MigrationStats {
  bucket: string;
  total: number;
  success: number;
  failed: number;
  skipped: number;
  failures: { path: string; error: string }[];
}

// ── Helper: Recursively list all files in a bucket ──

async function listAllFiles(
  client: SupabaseClient,
  bucketName: string,
  prefix: string = ""
): Promise<string[]> {
  const allFiles: string[] = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const { data, error } = await client.storage
      .from(bucketName)
      .list(prefix, { limit, offset });

    if (error) {
      console.error(
        `  Error listing ${bucketName}/${prefix} (offset ${offset}):`,
        error.message
      );
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

      // Item with id: null and no metadata is a folder -- recurse
      if (item.id === null || !item.metadata) {
        const subFiles = await listAllFiles(client, bucketName, fullPath);
        allFiles.push(...subFiles);
      } else {
        // It's a file
        allFiles.push(fullPath);
      }
    }

    // If we got fewer items than the limit, we've reached the end
    if (data.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

// ── Helper: Migrate a single file with retry ──

async function migrateFile(
  bucketName: string,
  filePath: string,
  retries: number = 2
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Download from old project
      const { data: fileData, error: downloadError } =
        await oldSupabase.storage.from(bucketName).download(filePath);

      if (downloadError || !fileData) {
        const msg = `Download failed: ${downloadError?.message || "No data returned"}`;
        if (attempt < retries) {
          console.log(`  Retry ${attempt + 1}/${retries} for ${filePath}...`);
          await sleep(1000 * (attempt + 1));
          continue;
        }
        return { success: false, error: msg };
      }

      // Detect content type from the file blob or use a default
      const contentType = fileData.type || "application/octet-stream";

      // Upload to new project with upsert to handle retries
      const { error: uploadError } = await newSupabase.storage
        .from(bucketName)
        .upload(filePath, fileData, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        const msg = `Upload failed: ${uploadError.message}`;
        // Don't retry upload size limit errors
        if (msg.includes("maximum allowed size")) {
          return { success: false, error: msg };
        }
        if (attempt < retries) {
          console.log(`  Retry ${attempt + 1}/${retries} for ${filePath}...`);
          await sleep(1000 * (attempt + 1));
          continue;
        }
        return { success: false, error: msg };
      }

      return { success: true };
    } catch (err: any) {
      if (attempt < retries) {
        console.log(`  Retry ${attempt + 1}/${retries} for ${filePath}...`);
        await sleep(1000 * (attempt + 1));
        continue;
      }
      return { success: false, error: `Exception: ${err.message}` };
    }
  }
  return { success: false, error: "Exhausted retries" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Helper: Create bucket if not exists ──

async function ensureBucket(
  client: SupabaseClient,
  name: string,
  isPublic: boolean
): Promise<void> {
  const { error } = await client.storage.createBucket(name, {
    public: isPublic,
  });

  if (error) {
    if (
      error.message?.includes("already exists") ||
      error.message?.includes("Duplicate")
    ) {
      console.log(`  Bucket "${name}" already exists -- continuing`);
    } else {
      console.error(`  Warning creating bucket "${name}":`, error.message);
    }
  } else {
    console.log(
      `  Created bucket "${name}" (${isPublic ? "public" : "private"})`
    );
  }
}

// ── Main migration ──

async function migrate(): Promise<void> {
  console.log("=== Storage Migration: Old -> New Supabase Project ===\n");
  console.log(`Old project: ${OLD_URL}`);
  console.log(`New project: ${NEW_URL}`);
  console.log(
    `Auth mode: ${hasServiceKey ? "service_role (full access)" : "anon key (public buckets only)"}`
  );
  if (targetBucket) {
    console.log(`Target bucket: ${targetBucket}`);
  }
  console.log("");

  if (!hasServiceKey) {
    console.log(
      "NOTE: No OLD_SUPABASE_SERVICE_KEY provided."
    );
    console.log(
      "  Public buckets (media, chat-attachments) will be migrated."
    );
    console.log(
      "  Private bucket (agreements) requires the old project's service_role key."
    );
    console.log(
      "  Get it from: Supabase Dashboard > Settings > API > service_role\n"
    );
  }

  const allStats: MigrationStats[] = [];
  let totalFiles = 0;
  let totalSuccess = 0;
  let totalFailed = 0;

  for (const bucket of BUCKETS) {
    console.log(
      `\n--- Bucket: ${bucket.name} (${bucket.public ? "public" : "private"}) ---`
    );

    // Skip private buckets when no service key
    if (!bucket.public && !hasServiceKey) {
      console.log(
        `  SKIPPED: Private bucket "${bucket.name}" requires OLD_SUPABASE_SERVICE_KEY`
      );
      allStats.push({
        bucket: bucket.name,
        total: 0,
        success: 0,
        failed: 0,
        skipped: 1,
        failures: [],
      });
      continue;
    }

    // Step 1: Create bucket on new project
    await ensureBucket(newSupabase, bucket.name, bucket.public);

    // Step 2: List all files in old bucket
    console.log(`  Listing files in old project...`);
    const files = await listAllFiles(oldSupabase, bucket.name);
    console.log(`  Found ${files.length} files`);

    if (files.length === 0) {
      allStats.push({
        bucket: bucket.name,
        total: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        failures: [],
      });
      continue;
    }

    // Step 3: Migrate each file
    const stats: MigrationStats = {
      bucket: bucket.name,
      total: files.length,
      success: 0,
      failed: 0,
      skipped: 0,
      failures: [],
    };

    for (let i = 0; i < files.length; i++) {
      const filePath = files[i];
      const progress = `[${i + 1}/${files.length}]`;

      const result = await migrateFile(bucket.name, filePath);

      if (result.success) {
        stats.success++;
        if ((i + 1) % 10 === 0 || i === files.length - 1) {
          console.log(`  ${progress} Migrated: ${filePath}`);
        }
      } else {
        stats.failed++;
        stats.failures.push({
          path: filePath,
          error: result.error || "Unknown",
        });
        console.error(`  ${progress} FAILED: ${filePath} -- ${result.error}`);
      }
    }

    allStats.push(stats);
    totalFiles += stats.total;
    totalSuccess += stats.success;
    totalFailed += stats.failed;

    console.log(
      `  Bucket "${bucket.name}": ${stats.success}/${stats.total} migrated` +
        (stats.failed > 0 ? `, ${stats.failed} failed` : "")
    );
  }

  // ── Summary ──

  console.log("\n\n=== MIGRATION SUMMARY ===\n");
  console.log(`Total files: ${totalFiles}`);
  console.log(`Successful:  ${totalSuccess}`);
  console.log(`Failed:      ${totalFailed}`);
  console.log("");

  for (const s of allStats) {
    const status =
      s.skipped > 0
        ? "SKIPPED (needs service key)"
        : `${s.success}/${s.total} migrated` +
          (s.failed > 0 ? ` (${s.failed} failed)` : "");
    console.log(`  ${s.bucket}: ${status}`);
  }

  if (totalFailed > 0) {
    console.log("\n--- Failed Files ---");
    for (const s of allStats) {
      for (const f of s.failures) {
        console.log(`  ${s.bucket}/${f.path}: ${f.error}`);
      }
    }
  }

  const skippedBuckets = allStats.filter((s) => s.skipped > 0);
  if (skippedBuckets.length > 0) {
    console.log("\n--- Skipped Buckets ---");
    console.log("To migrate private buckets, rerun with:");
    console.log(
      '  OLD_SUPABASE_SERVICE_KEY="<key>" npx tsx scripts/migrate-storage.ts --bucket agreements'
    );
  }

  console.log("\n=== Migration complete ===");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

// Run
migrate().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
