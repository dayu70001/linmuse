import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

type ImportRow = {
  product_code: string;
  slug?: string;
  category?: string;
  subcategory?: string;
  source_title_cn?: string;
  cleaned_source_title_cn?: string;
  source_description_cn?: string;
  cleaned_source_description_cn?: string;
  title_source_cn?: string;
  description_source_cn?: string;
  title_en?: string;
  description_en?: string;
  sizes_display?: string;
  colors_display?: string;
  moq?: string;
  delivery_time?: string;
  image_folder?: string;
  main_image?: string;
  gallery_images?: string | string[];
  main_thumbnail?: string;
  gallery_thumbnails?: string | string[];
  image_count?: number;
  source_url?: string;
  source_product_url?: string;
  source_album_url?: string;
  source_fingerprint?: string;
  import_batch_id?: string;
  imported_at?: string;
  status?: string;
  notes?: string;
};

type Args = {
  input: string;
  category: string;
  dryRun: boolean;
  debugPayloadOnly: boolean;
  validateJsonOnly: boolean;
  publish: boolean;
  uploadConcurrency: number;
  debugCodes: string[];
};

type Report = {
  dry_run: boolean;
  import_batch_id: string;
  imported_at: string;
  category: string;
  total_products_read: number;
  total_products_imported: number;
  created_products: number;
  updated_products: number;
  skipped_duplicates: number;
  total_images_uploaded: number;
  failed_uploads: number;
  skipped_products: Array<{ product_code?: string; reason: string }>;
  failed_products: Array<{ product_code?: string; reason: string }>;
  product_codes_imported: string[];
  product_codes_created: string[];
  product_codes_updated: string[];
  products: Array<{
    product_code: string;
    action: "create" | "update" | "dry_run";
    image_count: number;
    main_image_url?: string;
    main_thumbnail_url?: string;
    public_urls?: string[];
    thumbnail_urls?: string[];
  }>;
};

const bucketName = "product-images";
const defaultSizes = "Contact us for current size availability";
const defaultColors = "Contact us for available color options";
const chineseTextRe = /[\u3400-\u9fff]/;
const badControlRe = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;
const replacementCharRe = /\uFFFD/;

type ExistingProduct = {
  product_code: string;
  source_fingerprint: string | null;
};

type PayloadValidation = {
  ok: boolean;
  product_code?: string;
  body_length: number;
  issues: string[];
};

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    input: "",
    category: "Apparel",
    dryRun: false,
    debugPayloadOnly: false,
    validateJsonOnly: false,
    publish: false,
    uploadConcurrency: 3,
    debugCodes: ["LM-SHO-0163", "LM-SHO-0164", "LM-SHO-0165"],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--input") {
      args.input = argv[index + 1] || "";
      index += 1;
    } else if (value === "--category") {
      args.category = argv[index + 1] || "Apparel";
      index += 1;
    } else if (value === "--dry-run") {
      args.dryRun = true;
    } else if (value === "--debug-payload-only") {
      args.debugPayloadOnly = true;
      args.dryRun = true;
    } else if (value === "--validate-json-only") {
      args.validateJsonOnly = true;
      args.dryRun = true;
    } else if (value === "--debug-codes") {
      args.debugCodes = (argv[index + 1] || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
    } else if (value === "--publish") {
      args.publish = true;
    } else if (value === "--upload-concurrency") {
      args.uploadConcurrency = Math.max(1, Math.min(Number(argv[index + 1] || 3) || 3, 5));
      index += 1;
    }
  }

  if (!args.input) {
    throw new Error("Missing --input path/to/products-import.translated.json");
  }

  return args;
}

function cleanSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function batchTimestamp(value = new Date().toISOString()) {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function batchIdFor(category: string, rows: ImportRow[]) {
  const rowBatch = rows.find((row) => row.import_batch_id)?.import_batch_id;
  if (rowBatch) return rowBatch;
  return `${category.toLowerCase()}-${batchTimestamp()}`;
}

function categoryPrefix(category: string) {
  const normalized = category.toLowerCase();
  if (normalized === "shoes") return "LM-SHO";
  if (normalized === "watches") return "LM-WAT";
  if (normalized === "bags") return "LM-BAG";
  return "LM-APP";
}

function parseProductNumber(productCode: string, prefix: string) {
  const match = productCode.match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`, "i"));
  return match ? Number(match[1]) : 0;
}

function nextProductCode(prefix: string, nextNumber: number) {
  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
}

function parseGallery(row: ImportRow) {
  if (Array.isArray(row.gallery_images)) {
    return row.gallery_images;
  }

  if (typeof row.gallery_images === "string" && row.gallery_images.trim()) {
    return row.gallery_images
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function parseThumbnailGallery(row: ImportRow) {
  if (Array.isArray(row.gallery_thumbnails)) {
    return row.gallery_thumbnails;
  }

  if (typeof row.gallery_thumbnails === "string" && row.gallery_thumbnails.trim()) {
    return row.gallery_thumbnails
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function existingResolvedPaths(items: string[], importDir: string) {
  return items
    .map((item) => path.resolve(importDir, item))
    .filter((item) => existsSync(item) && statSync(item).isFile());
}

function localImagePaths(row: ImportRow, importDir: string) {
  const fromGallery = existingResolvedPaths(parseGallery(row), importDir);

  if (fromGallery.length > 0) {
    return Array.from(new Set(fromGallery));
  }

  if (!row.image_folder) {
    return [];
  }

  const folder = path.resolve(importDir, row.image_folder);
  if (!existsSync(folder)) {
    return [];
  }

  return readdirSync(folder)
    .filter((file) => /\.(webp|jpg|jpeg|png)$/i.test(file))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((file) => path.join(folder, file));
}

function localThumbnailPaths(row: ImportRow, importDir: string) {
  const fromGallery = existingResolvedPaths(parseThumbnailGallery(row), importDir);
  if (fromGallery.length > 0) {
    return Array.from(new Set(fromGallery));
  }

  if (row.image_folder) {
    const thumbsFolder = path.resolve(importDir, row.image_folder, "thumbs");
    if (existsSync(thumbsFolder)) {
      return readdirSync(thumbsFolder)
        .filter((file) => /\.(webp|jpg|jpeg|png)$/i.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map((file) => path.join(thumbsFolder, file));
    }
  }

  return [];
}

function storagePublicUrl(supabaseUrl: string, storagePath: string) {
  if (!supabaseUrl) return `${bucketName}/${storagePath}`;
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`;
}

function plannedPublicUrls(filePaths: string[], storageFolder: string, kind: "display" | "thumbs", supabaseUrl: string) {
  return filePaths.map((filePath) => storagePublicUrl(supabaseUrl, `${storageFolder}/${kind}/${path.basename(filePath)}`));
}

function sanitizePayloadText(value: unknown) {
  const input = String(value ?? "");
  let output = "";
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = input.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        output += input[index] + input[index + 1];
        index += 1;
      }
      continue;
    }
    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }
    output += input[index];
  }
  return output
    .replace(replacementCharRe, "")
    .replace(badControlRe, "")
    .normalize("NFC");
}

function sanitizeJsonValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizePayloadText(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeJsonValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .map(([key, item]) => [key, sanitizeJsonValue(item)])
    );
  }
  if (typeof value === "number" && !Number.isFinite(value)) return null;
  return value;
}

function hasUnpairedSurrogate(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function collectJsonValueIssues(value: unknown, pathName = "$", issues: string[] = []) {
  if (value === undefined) {
    issues.push(`${pathName}: undefined`);
    return issues;
  }
  if (typeof value === "bigint") {
    issues.push(`${pathName}: BigInt`);
    return issues;
  }
  if (typeof value === "function" || typeof value === "symbol") {
    issues.push(`${pathName}: unsupported ${typeof value}`);
    return issues;
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    issues.push(`${pathName}: non-finite number`);
    return issues;
  }
  if (typeof value === "string") {
    if (replacementCharRe.test(value)) issues.push(`${pathName}: replacement character`);
    if (badControlRe.test(value)) issues.push(`${pathName}: illegal control character`);
    if (hasUnpairedSurrogate(value)) issues.push(`${pathName}: unpaired surrogate`);
    return issues;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectJsonValueIssues(item, `${pathName}[${index}]`, issues));
    return issues;
  }
  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      collectJsonValueIssues(item, `${pathName}.${key}`, issues);
    }
  }
  return issues;
}

function contentTypeFor(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".webp") return "image/webp";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

function buildProductPayload({
  row,
  rowCategory,
  assignedProductCode,
  assignedSlug,
  publicUrls,
  thumbnailUrls,
  rowFingerprint,
  importBatchId,
  importedAt,
  publish,
}: {
  row: ImportRow;
  rowCategory: string;
  assignedProductCode: string;
  assignedSlug: string;
  publicUrls: string[];
  thumbnailUrls: string[];
  rowFingerprint: string;
  importBatchId: string;
  importedAt: string;
  publish: boolean;
}) {
  const desiredStatus = publish ? "published" : row.status || "draft";
  const desiredIsActive = desiredStatus === "published" || desiredStatus === "active";
  return sanitizeJsonValue({
    product_code: assignedProductCode,
    slug: assignedSlug,
    category: rowCategory,
    subcategory: row.subcategory || `Selected ${rowCategory}`,
    title_en: row.title_en || assignedProductCode,
    description_en: row.description_en || "",
    source_title_cn: row.source_title_cn || "",
    source_description_cn: row.source_description_cn || "",
    title_source_cn: row.title_source_cn || row.cleaned_source_title_cn || "",
    description_source_cn: row.description_source_cn || row.cleaned_source_description_cn || "",
    sizes_display: row.sizes_display || defaultSizes,
    colors_display: row.colors_display || defaultColors,
    moq: row.moq || "From 1 piece",
    delivery_time: row.delivery_time || "7-12 business days",
    main_image_url: publicUrls[0] || null,
    main_thumbnail_url: thumbnailUrls[0] || publicUrls[0] || null,
    gallery_image_urls: publicUrls,
    gallery_thumbnail_urls: thumbnailUrls.length > 0 ? thumbnailUrls : publicUrls,
    image_count: publicUrls.length,
    source_url: row.source_url || "",
    source_product_url: row.source_product_url || "",
    source_album_url: row.source_album_url || row.source_url || "",
    source_fingerprint: rowFingerprint || null,
    import_batch_id: row.import_batch_id || importBatchId,
    imported_at: row.imported_at || importedAt,
    status: desiredStatus,
    is_active: desiredIsActive,
    is_featured: false,
    notes: row.notes || "",
  }) as Record<string, unknown>;
}

function validateProductPayload(product: Record<string, unknown>, row: ImportRow, expectedCategory: string): PayloadValidation {
  const issues = collectJsonValueIssues(product);
  const productCode = String(product.product_code || "");
  const titleEn = String(product.title_en || "").trim();
  const descriptionEn = String(product.description_en || "").trim();
  const sourceTitleCn = String(product.source_title_cn || "");
  const sourceDescriptionCn = String(product.source_description_cn || "");
  const galleryImages = Array.isArray(product.gallery_image_urls) ? product.gallery_image_urls : [];
  const galleryThumbnails = Array.isArray(product.gallery_thumbnail_urls) ? product.gallery_thumbnail_urls : [];

  if (!productCode) issues.push("$.product_code: empty");
  if (expectedCategory.toLowerCase() === "shoes" && !/^LM-SHO-\d+$/i.test(productCode)) {
    issues.push("$.product_code: expected LM-SHO-number");
  }
  if (String(product.category || "") !== expectedCategory) issues.push("$.category: mismatch");
  if (!titleEn) issues.push("$.title_en: empty");
  if (!descriptionEn) issues.push("$.description_en: empty");
  if (chineseTextRe.test(titleEn)) issues.push("$.title_en: contains Chinese");
  if (chineseTextRe.test(descriptionEn)) issues.push("$.description_en: contains Chinese");
  if (replacementCharRe.test(sourceTitleCn) || replacementCharRe.test(sourceDescriptionCn)) {
    issues.push("$.source_title_cn/source_description_cn: contains replacement character");
  }
  if (sourceTitleCn.includes("出厂价") || sourceDescriptionCn.includes("出厂价")) {
    issues.push("$.source_title_cn/source_description_cn: contains 出厂价");
  }
  if (row.product_code && row.product_code.includes("R08NPRF")) issues.push("input.product_code: contains R08NPRF");
  if (galleryImages.length === 0) issues.push("$.gallery_image_urls: empty");
  if (galleryThumbnails.length === 0) issues.push("$.gallery_thumbnail_urls: empty");

  let body = "";
  try {
    body = JSON.stringify(product);
    if (!body || body === "undefined") issues.push("JSON.stringify: empty body");
    JSON.parse(body);
  } catch (error) {
    issues.push(`JSON body invalid: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    ok: issues.length === 0,
    product_code: productCode,
    body_length: body.length,
    issues,
  };
}

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

async function uploadObject({
  supabaseUrl,
  serviceKey,
  storagePath,
  filePath,
}: {
  supabaseUrl: string;
  serviceKey: string;
  storagePath: string;
  filePath: string;
}) {
  const response = await withRetry(() => fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${storagePath}`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": contentTypeFor(filePath),
        "x-upsert": "true",
      },
      body: readFileSync(filePath),
    }), 2);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed for ${storagePath}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(task: () => Promise<T>, retries: number) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await task();
      if (result instanceof Response && !result.ok) {
        throw new Error(`HTTP ${result.status}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await wait(700 * (attempt + 1));
      }
    }
  }
  throw lastError;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function upsertProduct({
  supabaseUrl,
  serviceKey,
  product,
}: {
  supabaseUrl: string;
  serviceKey: string;
  product: Record<string, unknown>;
}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/products?on_conflict=product_code`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Product upsert failed for ${product.product_code}`);
  }

  return response.json();
}

async function fetchExistingProducts({
  supabaseUrl,
  serviceKey,
  category,
}: {
  supabaseUrl: string;
  serviceKey: string;
  category: string;
}) {
  if (!supabaseUrl || !serviceKey) return [] as ExistingProduct[];
  const response = await fetch(
    `${supabaseUrl}/rest/v1/products?select=product_code,source_fingerprint&category=eq.${encodeURIComponent(category)}&limit=10000`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Could not read existing products from Supabase.");
  }

  return response.json() as Promise<ExistingProduct[]>;
}

async function createProduct({
  supabaseUrl,
  serviceKey,
  product,
}: {
  supabaseUrl: string;
  serviceKey: string;
  product: Record<string, unknown>;
}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/products`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Product create failed for ${product.product_code}`);
  }

  return response.json();
}

async function updateProductByCode({
  supabaseUrl,
  serviceKey,
  productCode,
  product,
}: {
  supabaseUrl: string;
  serviceKey: string;
  productCode: string;
  product: Record<string, unknown>;
}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/products?product_code=eq.${encodeURIComponent(productCode)}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(product),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Product update failed for ${productCode}`);
  }

  return response.json();
}

async function main() {
  loadEnvLocal();

  const args = parseArgs();
  const inputPath = path.resolve(process.cwd(), args.input);
  const importDir = path.dirname(inputPath);

  if (!existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  const rows = JSON.parse(readFileSync(inputPath, "utf8")) as ImportRow[];
  if (!Array.isArray(rows)) {
    throw new Error("Input JSON must be an array of products.");
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const category = args.category || rows[0]?.category || "Apparel";
  const importBatchId = batchIdFor(category, rows);
  const importedAt = rows.find((row) => row.imported_at)?.imported_at || new Date().toISOString();

  if (!args.dryRun && (!supabaseUrl || !serviceKey)) {
    throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for real import.");
  }

  let existingProducts: ExistingProduct[] = [];
  if (!args.dryRun && supabaseUrl && serviceKey) {
    try {
      existingProducts = await fetchExistingProducts({ supabaseUrl, serviceKey, category });
    } catch (error) {
      if (!args.dryRun) {
        throw error;
      }
      console.warn(`Could not read existing Supabase products during dry-run: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const existingByFingerprint = new Map(
    existingProducts
      .filter((product) => product.source_fingerprint)
      .map((product) => [product.source_fingerprint as string, product])
  );
  const existingByCode = new Map(existingProducts.map((product) => [product.product_code, product]));
  const prefix = categoryPrefix(category);
  let nextNumber = Math.max(0, ...existingProducts.map((product) => parseProductNumber(product.product_code, prefix))) + 1;
  const seenInputFingerprints = new Set<string>();
  const totalImagesPlanned = rows.reduce((sum, row) => sum + localImagePaths(row, importDir).length + localThumbnailPaths(row, importDir).length, 0);
  let uploadedProgress = 0;

  const report: Report = {
    dry_run: args.dryRun,
    import_batch_id: importBatchId,
    imported_at: importedAt,
    category,
    total_products_read: rows.length,
    total_products_imported: 0,
    created_products: 0,
    updated_products: 0,
    skipped_duplicates: 0,
    total_images_uploaded: 0,
    failed_uploads: 0,
    skipped_products: [],
    failed_products: [],
    product_codes_imported: [],
    product_codes_created: [],
    product_codes_updated: [],
    products: [],
  };
  const payloadDebugRows: Array<{
    product_code: string;
    action: "create" | "update";
    validation: PayloadValidation;
    payload: Record<string, unknown>;
    json_body: string;
  }> = [];

  for (const row of rows) {
    try {
      const rowFingerprint = row.source_fingerprint || "";
      if (rowFingerprint && seenInputFingerprints.has(rowFingerprint)) {
        report.skipped_duplicates += 1;
        report.skipped_products.push({ product_code: row.product_code, reason: "Duplicate source_fingerprint inside input file" });
        continue;
      }
      if (rowFingerprint) seenInputFingerprints.add(rowFingerprint);

      const existingBySource = rowFingerprint ? existingByFingerprint.get(rowFingerprint) : undefined;
      const existingByProductCode = row.product_code ? existingByCode.get(row.product_code) : undefined;
      const existingProduct = existingBySource || (!rowFingerprint ? existingByProductCode : undefined);
      const action: "create" | "update" = existingProduct ? "update" : "create";
      const assignedProductCode = existingProduct?.product_code || row.product_code || nextProductCode(prefix, nextNumber++);
      const assignedSlug = row.slug || cleanSlug(assignedProductCode);

      const imagePaths = localImagePaths(row, importDir);
      const thumbnailPaths = localThumbnailPaths(row, importDir);
      if (imagePaths.length === 0) {
        report.skipped_products.push({
          product_code: assignedProductCode,
          reason: "No local product images found",
        });
        continue;
      }

      const rowCategory = args.category || row.category || "Apparel";
      const storageFolder = `${rowCategory.toLowerCase()}/${assignedProductCode}`;
      const publicUrls: string[] = [];
      const thumbnailUrls: string[] = [];

      if (args.dryRun) {
        publicUrls.push(...plannedPublicUrls(imagePaths, storageFolder, "display", supabaseUrl));
        thumbnailUrls.push(...plannedPublicUrls(thumbnailPaths, storageFolder, "thumbs", supabaseUrl));
      } else {
        const uploadedDisplays = await mapWithConcurrency(
          imagePaths,
          args.uploadConcurrency,
          async (filePath) => {
            const storagePath = `${storageFolder}/display/${path.basename(filePath)}`;
            const publicUrl = await uploadObject({ supabaseUrl, serviceKey, storagePath, filePath });
            uploadedProgress += 1;
            report.total_images_uploaded += 1;
            if (uploadedProgress === totalImagesPlanned || uploadedProgress % 50 === 0) {
              console.log(`Uploaded images ${uploadedProgress}/${totalImagesPlanned}`);
              console.log(`Failed uploads: ${report.failed_uploads}`);
            }
            return publicUrl;
          }
        );
        publicUrls.push(...uploadedDisplays);
        const uploadedThumbnails = await mapWithConcurrency(
          thumbnailPaths,
          args.uploadConcurrency,
          async (filePath) => {
            const storagePath = `${storageFolder}/thumbs/${path.basename(filePath)}`;
            const publicUrl = await uploadObject({ supabaseUrl, serviceKey, storagePath, filePath });
            uploadedProgress += 1;
            report.total_images_uploaded += 1;
            if (uploadedProgress === totalImagesPlanned || uploadedProgress % 50 === 0) {
              console.log(`Uploaded images ${uploadedProgress}/${totalImagesPlanned}`);
              console.log(`Failed uploads: ${report.failed_uploads}`);
            }
            return publicUrl;
          }
        );
        thumbnailUrls.push(...uploadedThumbnails);
      }

      const productPayload = buildProductPayload({
        row,
        rowCategory,
        assignedProductCode,
        assignedSlug,
        publicUrls,
        thumbnailUrls,
        rowFingerprint,
        importBatchId,
        importedAt,
        publish: args.publish,
      });
      const validation = validateProductPayload(productPayload, row, rowCategory);
      if (args.debugCodes.includes(assignedProductCode)) {
        payloadDebugRows.push({
          product_code: assignedProductCode,
          action,
          validation,
          payload: productPayload,
          json_body: JSON.stringify(productPayload),
        });
      }
      if (!validation.ok) {
        throw new Error(`Invalid Supabase payload: ${validation.issues.join("; ")}`);
      }

      if (!args.dryRun) {
        if (action === "update") {
          await updateProductByCode({ supabaseUrl, serviceKey, productCode: assignedProductCode, product: productPayload });
        } else {
          await createProduct({ supabaseUrl, serviceKey, product: productPayload });
        }
      }

      report.total_products_imported += 1;
      if (action === "update") {
        report.updated_products += 1;
        report.product_codes_updated.push(assignedProductCode);
      } else {
        report.created_products += 1;
        report.product_codes_created.push(assignedProductCode);
      }
      report.product_codes_imported.push(assignedProductCode);
      report.products.push({
        product_code: assignedProductCode,
        action: args.dryRun ? "dry_run" : action,
        image_count: publicUrls.length,
        main_image_url: publicUrls[0],
        main_thumbnail_url: thumbnailUrls[0] || publicUrls[0],
        public_urls: publicUrls,
        thumbnail_urls: thumbnailUrls,
      });

      console.log(`${args.dryRun ? "Would import" : action === "update" ? "Updated" : "Created"} ${assignedProductCode}: ${publicUrls.length} display images, ${thumbnailUrls.length} thumbnails`);
      if (report.total_products_imported === rows.length || report.total_products_imported % 10 === 0) {
        console.log(`Imported products ${report.total_products_imported}/${rows.length}`);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      report.failed_uploads += 1;
      report.failed_products.push({
        product_code: row.product_code,
        reason,
      });
      console.error(`FAILED product ${row.product_code || "(no code)"}: ${reason}`);
      try {
        const liveReportPath = path.join(importDir, "import-to-supabase-report.json");
        writeFileSync(liveReportPath, `${JSON.stringify(report, null, 2)}\\n`);
      } catch {}
    }
  }

  if (args.debugPayloadOnly || payloadDebugRows.length > 0) {
    const debugSuffix = args.debugCodes.length > 0 ? args.debugCodes.join("-") : "payloads";
    const debugPath = path.join(importDir, `debug-supabase-payloads-${debugSuffix}.json`);
    writeFileSync(debugPath, `${JSON.stringify({
      input: inputPath,
      category,
      debug_codes: args.debugCodes,
      payloads: payloadDebugRows,
    }, null, 2)}\n`);
    console.log(`Debug payloads: ${debugPath}`);
  }

  const reportPath = path.join(importDir, "import-to-supabase-report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  const importedCodes = report.product_codes_imported;
  const lmShoCodes = importedCodes.filter((code) => /^LM-SHO-\d+$/i.test(code)).length;
  const lmAppCodes = importedCodes.filter((code) => /^LM-APP/i.test(code)).length;
  const lmBagCodes = importedCodes.filter((code) => /^LM-BAG/i.test(code)).length;
  const r08Codes = importedCodes.filter((code) => /R08NPRF/i.test(code)).length;

  console.log("");
  console.log(`Products read: ${report.total_products_read}`);
  console.log(`Products ${args.dryRun ? "checked" : "imported"}: ${report.total_products_imported}`);
  console.log(`Product codes checked: ${importedCodes.length}`);
  console.log(`LM-SHO-number codes: ${lmShoCodes}`);
  console.log(`LM-APP codes: ${lmAppCodes}`);
  console.log(`LM-BAG codes: ${lmBagCodes}`);
  console.log(`R08NPRF codes: ${r08Codes}`);
  console.log(`Skipped products: ${report.skipped_products.length}`);
  console.log(`Failed products: ${report.failed_products.length}`);
  console.log(`Images ${args.dryRun ? "found" : "uploaded"}: ${args.dryRun ? report.products.reduce((sum, item) => sum + item.image_count, 0) : report.total_images_uploaded}`);
  console.log(`Report: ${reportPath}`);

  if (report.failed_products.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
