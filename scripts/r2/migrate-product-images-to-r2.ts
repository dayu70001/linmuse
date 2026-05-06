import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  contentTypeForUrl,
  loadEnvLocal,
  publicUrlFor,
  readR2Config,
  uploadBufferToR2,
} from "./r2-client.ts";

type Args = {
  category: string;
  limit: number | null;
  dryRun: boolean;
};

type ProductRow = {
  product_code: string;
  category: string;
  main_thumbnail_url: string | null;
  main_image_url: string | null;
  gallery_thumbnail_urls: string[] | string | null;
  gallery_image_urls: string[] | string | null;
};

type ImagePlan = {
  product_code: string;
  category: string;
  kind: "thumbs" | "display";
  index: number;
  old_url: string;
  r2_key: string;
  new_r2_url: string;
  file_size: number | null;
  upload_status: "dry_run" | "uploaded" | "failed";
  fetch_status: number | "not_fetched" | "failed";
  public_fetch_status: number | "not_fetched" | "failed";
  content_type?: string;
  public_content_type?: string;
  error?: string;
};

const reportPath = path.resolve(process.cwd(), "r2-migration-report.json");
const r2BaseUrl = "https://img.linmuse.com/";
const uploadConcurrency = 8;

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const read = (name: string, fallback: string) => {
    const index = argv.indexOf(name);
    return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
  };
  const limitValue = read("--limit", "");
  return {
    category: read("--category", "Apparel"),
    limit: limitValue ? Math.max(1, Number(limitValue) || 10) : null,
    dryRun: argv.includes("--dry-run"),
  };
}

function readSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const missing = [
    !url ? "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL" : "",
    !key ? "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY" : "",
  ].filter(Boolean);
  if (missing.length > 0) throw new Error(`Missing Supabase env vars: ${missing.join(", ")}`);
  return { url: url.replace(/\/+$/, ""), key };
}

function asArray(value: ProductRow["gallery_image_urls"]) {
  if (!value) return [] as string[];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {}
    return trimmed.split("|").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function uniqueUrls(items: string[]) {
  return Array.from(new Set(items.filter((item) => /^https?:\/\//i.test(item))));
}

function isR2Url(url: string) {
  return url.startsWith(r2BaseUrl);
}

function keyFor(product: ProductRow, kind: "thumbs" | "display", index: number) {
  const categoryLower = product.category.toLowerCase();
  return `products/${categoryLower}/${product.product_code}/${kind}/${String(index + 1).padStart(2, "0")}.webp`;
}

function imagePlansForProduct(product: ProductRow, publicBaseUrl: string) {
  const thumbUrls = uniqueUrls([
    product.main_thumbnail_url || "",
    ...asArray(product.gallery_thumbnail_urls),
  ]);
  const displayUrls = uniqueUrls([
    product.main_image_url || "",
    ...asArray(product.gallery_image_urls),
  ]);
  const plans: ImagePlan[] = [];
  thumbUrls.forEach((oldUrl, index) => {
    const r2Key = keyFor(product, "thumbs", index);
    plans.push({
      product_code: product.product_code,
      category: product.category,
      kind: "thumbs",
      index: index + 1,
      old_url: oldUrl,
      r2_key: r2Key,
      new_r2_url: publicUrlFor(publicBaseUrl, r2Key),
      file_size: null,
      upload_status: "dry_run",
      fetch_status: "not_fetched",
      public_fetch_status: "not_fetched",
    });
  });
  displayUrls.forEach((oldUrl, index) => {
    const r2Key = keyFor(product, "display", index);
    plans.push({
      product_code: product.product_code,
      category: product.category,
      kind: "display",
      index: index + 1,
      old_url: oldUrl,
      r2_key: r2Key,
      new_r2_url: publicUrlFor(publicBaseUrl, r2Key),
      file_size: null,
      upload_status: "dry_run",
      fetch_status: "not_fetched",
      public_fetch_status: "not_fetched",
    });
  });
  return plans;
}

async function fetchProductsPage(category: string, limit: number, offset: number) {
  const { url, key } = readSupabaseConfig();
  const query = new URL(`${url}/rest/v1/products`);
  query.searchParams.set("select", [
    "product_code",
    "category",
    "main_thumbnail_url",
    "main_image_url",
    "gallery_thumbnail_urls",
    "gallery_image_urls",
  ].join(","));
  query.searchParams.set("category", `eq.${category}`);
  query.searchParams.set("status", "eq.published");
  query.searchParams.set("is_active", "eq.true");
  query.searchParams.set("order", "product_code.asc");
  query.searchParams.set("limit", String(limit));
  query.searchParams.set("offset", String(offset));

  const response = await fetch(query, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase products read failed: HTTP ${response.status}${text ? ` ${text.slice(0, 300)}` : ""}`);
  }
  return response.json() as Promise<ProductRow[]>;
}

async function fetchAllProducts(category: string, limit: number | null) {
  const pageSize = limit ? Math.min(limit, 1000) : 1000;
  const all: ProductRow[] = [];
  let offset = 0;
  while (true) {
    const remaining = limit ? limit - all.length : pageSize;
    const batchLimit = Math.min(pageSize, remaining);
    if (batchLimit <= 0) break;
    const batch = await fetchProductsPage(category, batchLimit, offset);
    all.push(...batch);
    if (batch.length < batchLimit || (limit && all.length >= limit)) break;
    offset += batch.length;
  }
  return all;
}

async function migratePlan(plan: ImagePlan) {
  try {
    const response = await fetch(plan.old_url);
    plan.fetch_status = response.status;
    if (!response.ok) {
      plan.upload_status = "failed";
      plan.error = `fetch_failed_${response.status}`;
      return plan;
    }
    const body = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type")?.split(";")[0] || contentTypeForUrl(plan.old_url);
    const uploaded = await uploadBufferToR2(body, plan.r2_key, contentType, body.length);
    plan.file_size = uploaded.fileSize;
    plan.content_type = uploaded.contentType;
    plan.new_r2_url = uploaded.publicUrl;
    plan.upload_status = "uploaded";
    const publicResponse = await fetch(uploaded.publicUrl);
    plan.public_fetch_status = publicResponse.status;
    plan.public_content_type = publicResponse.headers.get("content-type")?.split(";")[0] || "";
    if (!publicResponse.ok) {
      plan.upload_status = "failed";
      plan.error = `public_fetch_failed_${publicResponse.status}`;
    }
    return plan;
  } catch (error) {
    plan.fetch_status = plan.fetch_status === "not_fetched" ? "failed" : plan.fetch_status;
    plan.public_fetch_status = plan.public_fetch_status === "not_fetched" ? "failed" : plan.public_fetch_status;
    plan.upload_status = "failed";
    plan.error = error instanceof Error ? error.message : String(error);
    return plan;
  }
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

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  const r2Config = readR2Config();
  const products = await fetchAllProducts(args.category, args.limit);
  const allPlans = products.flatMap((product) => imagePlansForProduct(product, r2Config.publicBaseUrl));
  const alreadyR2Plans = allPlans.filter((plan) => isR2Url(plan.old_url));
  const plans = allPlans.filter((plan) => !isR2Url(plan.old_url));
  const productCodesWithPlans = new Set(plans.map((plan) => plan.product_code));
  const productCodesAlreadyR2 = new Set(
    products
      .filter((product) => {
        const productPlans = allPlans.filter((plan) => plan.product_code === product.product_code);
        return productPlans.length > 0 && productPlans.every((plan) => isR2Url(plan.old_url));
      })
      .map((product) => product.product_code)
  );
  const missingImageUrls = products.filter((product) => {
    const productPlans = allPlans.filter((plan) => plan.product_code === product.product_code);
    return productPlans.length === 0;
  }).length;

  console.log(`mode: ${args.dryRun ? "dry-run" : "upload-only"}`);
  console.log(`category: ${args.category}`);
  console.log(`products selected: ${products.length}`);
  console.log(`products already R2: ${productCodesAlreadyR2.size}`);
  console.log(`products to migrate: ${productCodesWithPlans.size}`);
  console.log(`files planned: ${plans.length}`);
  console.log(`files already R2: ${alreadyR2Plans.length}`);
  const verboseProducts = args.limit ? products : products.slice(0, 20);
  for (const product of verboseProducts) {
    const productPlans = plans.filter((plan) => plan.product_code === product.product_code);
    const alreadyR2Count = alreadyR2Plans.filter((plan) => plan.product_code === product.product_code).length;
    console.log(`${product.product_code}: ${productPlans.length} old image URLs, ${alreadyR2Count} already R2`);
    for (const plan of productPlans) {
      console.log(`  ${plan.kind}/${String(plan.index).padStart(2, "0")} -> ${plan.r2_key}`);
    }
  }
  if (!args.limit && products.length > verboseProducts.length) {
    console.log(`... ${products.length - verboseProducts.length} more products included in report`);
  }

  const finalPlans = args.dryRun ? plans : [];
  if (!args.dryRun) {
    let completed = 0;
    const migrated = await mapWithConcurrency(plans, uploadConcurrency, async (plan) => {
      const result = await migratePlan(plan);
      completed += 1;
      if (completed === plans.length || completed % 100 === 0) {
        const failed = finalPlans.filter((item) => item.upload_status === "failed").length + (result.upload_status === "failed" ? 1 : 0);
        console.log(`processed files ${completed}/${plans.length}, failed=${failed}`);
      }
      return result;
    });
    finalPlans.push(...migrated);
  }
  const filesUploaded = finalPlans.filter((plan) => plan.upload_status === "uploaded").length;
  const failedDownloads = finalPlans.filter((plan) => plan.fetch_status === "failed" || (typeof plan.fetch_status === "number" && plan.fetch_status >= 400)).length;
  const failedUploads = finalPlans.filter((plan) => plan.upload_status === "failed" && !String(plan.error || "").startsWith("fetch_failed_") && !String(plan.error || "").startsWith("public_fetch_failed_")).length;
  const failedPublicFetches = finalPlans.filter((plan) => plan.public_fetch_status === "failed" || (typeof plan.public_fetch_status === "number" && plan.public_fetch_status >= 400)).length;
  const totalSizeUploaded = finalPlans
    .filter((plan) => plan.upload_status === "uploaded")
    .reduce((sum, plan) => sum + (plan.file_size || 0), 0);
  const samplePublicUrls = finalPlans
    .filter((plan) => plan.upload_status === "uploaded")
    .slice(0, 10)
    .map((plan) => plan.new_r2_url);
  const failedItems = finalPlans.filter((plan) => plan.upload_status === "failed");

  const reportOutputPath = args.dryRun && !args.limit
    ? path.resolve(process.cwd(), `r2-migration-${args.category.toLowerCase()}-full-dry-run-report.json`)
    : !args.dryRun && !args.limit
      ? path.resolve(process.cwd(), `r2-migration-${args.category.toLowerCase()}-full-upload-report.json`)
      : reportPath;
  writeFileSync(reportOutputPath, `${JSON.stringify({
    mode: args.dryRun ? "dry-run" : "upload-only",
    category: args.category,
    limit: args.limit,
    products_scanned: products.length,
    products_already_r2: productCodesAlreadyR2.size,
    products_to_migrate: productCodesWithPlans.size,
    files_already_r2: alreadyR2Plans.length,
    missing_image_urls: missingImageUrls,
    sample_product_codes: Array.from(productCodesWithPlans).slice(0, 20),
    sample_old_urls: plans.slice(0, 20).map((plan) => plan.old_url),
    sample_new_r2_urls: plans.slice(0, 20).map((plan) => plan.new_r2_url),
    products_processed: products.length,
    files_planned: finalPlans.length,
    files_uploaded: filesUploaded,
    failed_downloads: failedDownloads,
    failed_uploads: failedUploads,
    failed_public_fetches: failedPublicFetches,
    total_size_uploaded: totalSizeUploaded,
    sample_public_urls: samplePublicUrls,
    failed_items: failedItems,
    products: products.map((product) => ({
      product_code: product.product_code,
      category: product.category,
      old_image_url_count: finalPlans.filter((plan) => plan.product_code === product.product_code).length,
      already_r2_url_count: alreadyR2Plans.filter((plan) => plan.product_code === product.product_code).length,
    })),
    images: finalPlans,
    already_r2_images: alreadyR2Plans,
  }, null, 2)}\n`);
  console.log(`report: ${reportOutputPath}`);
  if (args.dryRun) {
    console.log("dry-run: no downloads, no R2 uploads, no Supabase updates");
  } else {
    console.log("upload-only: R2 uploads attempted, no Supabase updates");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
