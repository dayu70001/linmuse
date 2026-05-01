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
  status?: string;
  notes?: string;
};

type Args = {
  input: string;
  category: string;
  dryRun: boolean;
  publish: boolean;
};

type Report = {
  dry_run: boolean;
  total_products_read: number;
  total_products_imported: number;
  total_images_uploaded: number;
  skipped_products: Array<{ product_code?: string; reason: string }>;
  failed_products: Array<{ product_code?: string; reason: string }>;
  product_codes_imported: string[];
  products: Array<{
    product_code: string;
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

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    input: "",
    category: "Apparel",
    dryRun: false,
    publish: false,
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
    } else if (value === "--publish") {
      args.publish = true;
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

function contentTypeFor(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".webp") return "image/webp";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
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
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucketName}/${storagePath}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentTypeFor(filePath),
      "x-upsert": "true",
    },
    body: readFileSync(filePath),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed for ${storagePath}`);
  }

  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${storagePath}`;
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

  if (!args.dryRun && (!supabaseUrl || !serviceKey)) {
    throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for real import.");
  }

  const report: Report = {
    dry_run: args.dryRun,
    total_products_read: rows.length,
    total_products_imported: 0,
    total_images_uploaded: 0,
    skipped_products: [],
    failed_products: [],
    product_codes_imported: [],
    products: [],
  };

  for (const row of rows) {
    try {
      if (!row.product_code) {
        report.skipped_products.push({ reason: "Missing product_code" });
        continue;
      }

      const imagePaths = localImagePaths(row, importDir);
      const thumbnailPaths = localThumbnailPaths(row, importDir);
      if (imagePaths.length === 0) {
        report.skipped_products.push({
          product_code: row.product_code,
          reason: "No local product images found",
        });
        continue;
      }

      const category = args.category || row.category || "Apparel";
      const storageFolder = `${category.toLowerCase()}/${row.product_code}`;
      const publicUrls: string[] = [];
      const thumbnailUrls: string[] = [];

      if (args.dryRun) {
        for (const filePath of imagePaths) {
          publicUrls.push(`${bucketName}/${storageFolder}/display/${path.basename(filePath)}`);
        }
        for (const filePath of thumbnailPaths) {
          thumbnailUrls.push(`${bucketName}/${storageFolder}/thumbs/${path.basename(filePath)}`);
        }
      } else {
        for (const filePath of imagePaths) {
          const storagePath = `${storageFolder}/display/${path.basename(filePath)}`;
          const publicUrl = await uploadObject({
            supabaseUrl,
            serviceKey,
            storagePath,
            filePath,
          });
          publicUrls.push(publicUrl);
          report.total_images_uploaded += 1;
        }
        for (const filePath of thumbnailPaths) {
          const storagePath = `${storageFolder}/thumbs/${path.basename(filePath)}`;
          const publicUrl = await uploadObject({
            supabaseUrl,
            serviceKey,
            storagePath,
            filePath,
          });
          thumbnailUrls.push(publicUrl);
          report.total_images_uploaded += 1;
        }
      }

      const productPayload = {
        product_code: row.product_code,
        slug: row.slug || cleanSlug(row.product_code),
        category,
        subcategory: row.subcategory || "Selected Apparel",
        title_en: row.title_en || row.product_code,
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
        status: "draft",
        is_active: args.publish,
        is_featured: false,
        notes: row.notes || "",
      };

      if (!args.dryRun) {
        await upsertProduct({ supabaseUrl, serviceKey, product: productPayload });
      }

      report.total_products_imported += 1;
      report.product_codes_imported.push(row.product_code);
      report.products.push({
        product_code: row.product_code,
        image_count: publicUrls.length,
        main_image_url: publicUrls[0],
        main_thumbnail_url: thumbnailUrls[0] || publicUrls[0],
        public_urls: publicUrls,
        thumbnail_urls: thumbnailUrls,
      });

      console.log(`${args.dryRun ? "Would import" : "Imported"} ${row.product_code}: ${publicUrls.length} display images, ${thumbnailUrls.length} thumbnails`);
    } catch (error) {
      report.failed_products.push({
        product_code: row.product_code,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const reportPath = path.join(importDir, "import-to-supabase-report.json");
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log("");
  console.log(`Products read: ${report.total_products_read}`);
  console.log(`Products ${args.dryRun ? "checked" : "imported"}: ${report.total_products_imported}`);
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
