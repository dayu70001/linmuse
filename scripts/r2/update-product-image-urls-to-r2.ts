import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvLocal } from "./r2-client.ts";

type Args = {
  dryRun: boolean;
  apply: boolean;
  report: string;
};

type MigrationImage = {
  product_code: string;
  kind: "thumbs" | "display";
  old_url: string;
  new_r2_url: string;
  upload_status?: string;
  public_fetch_status?: number | string;
};

type MigrationReport = {
  category?: string;
  products_scanned?: number;
  products_already_r2?: number;
  images: MigrationImage[];
  already_r2_images?: MigrationImage[];
};

type ProductRow = {
  product_code: string;
  main_thumbnail_url: string | null;
  main_image_url: string | null;
  gallery_thumbnail_urls: string[] | string | null;
  gallery_image_urls: string[] | string | null;
};

type UpdatePayload = {
  main_thumbnail_url: string | null;
  main_image_url: string | null;
  gallery_thumbnail_urls: string[];
  gallery_image_urls: string[];
};

const allowedUpdateFields = [
  "main_thumbnail_url",
  "main_image_url",
  "gallery_thumbnail_urls",
  "gallery_image_urls",
];

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const read = (name: string, fallback: string) => {
    const index = argv.indexOf(name);
    return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
  };
  return {
    dryRun: argv.includes("--dry-run"),
    apply: argv.includes("--apply"),
    report: read("--report", path.resolve(process.cwd(), "r2-migration-report.json")),
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

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function replaceWithMapping(value: string | null, mapping: Map<string, string>) {
  if (!value) return value;
  return mapping.get(value) || value;
}

function replaceArrayWithMapping(values: string[], mapping: Map<string, string>) {
  return values.map((value) => mapping.get(value) || value);
}

async function fetchProductsChunk(productCodes: string[]) {
  const { url, key } = readSupabaseConfig();
  const query = new URL(`${url}/rest/v1/products`);
  query.searchParams.set("select", [
    "product_code",
    "main_thumbnail_url",
    "main_image_url",
    "gallery_thumbnail_urls",
    "gallery_image_urls",
  ].join(","));
  query.searchParams.set("product_code", `in.(${productCodes.join(",")})`);
  query.searchParams.set("limit", String(productCodes.length));

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

async function fetchProducts(productCodes: string[]) {
  const uniqueCodes = unique(productCodes).sort();
  const rows: ProductRow[] = [];
  for (let index = 0; index < uniqueCodes.length; index += 100) {
    rows.push(...await fetchProductsChunk(uniqueCodes.slice(index, index + 100)));
  }
  return rows;
}

async function patchProductImageUrls(productCode: string, payload: UpdatePayload) {
  const { url, key } = readSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/products?product_code=eq.${encodeURIComponent(productCode)}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase image URL PATCH failed for ${productCode}: HTTP ${response.status}${text ? ` ${text.slice(0, 300)}` : ""}`);
  }
}

function isR2Url(value: string | null | undefined) {
  return typeof value === "string" && value.startsWith("https://img.linmuse.com/");
}

function hasOnlyR2Urls(product: ProductRow) {
  const urls = [
    product.main_thumbnail_url || "",
    product.main_image_url || "",
    ...asArray(product.gallery_thumbnail_urls),
    ...asArray(product.gallery_image_urls),
  ].filter(Boolean);
  return urls.length > 0 && urls.every(isR2Url);
}

function outputPathFor(args: Args, migrationReport: MigrationReport) {
  const category = (migrationReport.category || "").toLowerCase();
  const isFullApparel = category === "apparel" && Number(migrationReport.products_scanned || 0) > 10;
  if (args.dryRun && isFullApparel) {
    return path.resolve(process.cwd(), "r2-url-update-apparel-full-dry-run-report.json");
  }
  if (args.apply && isFullApparel) {
    return path.resolve(process.cwd(), "r2-url-update-apparel-full-apply-report.json");
  }
  return path.resolve(process.cwd(), args.dryRun ? "r2-url-update-dry-run-report.json" : "r2-url-update-apply-report.json");
}

function backupPathFor(migrationReport: MigrationReport) {
  const category = (migrationReport.category || "").toLowerCase();
  const isFullApparel = category === "apparel" && Number(migrationReport.products_scanned || 0) > 10;
  if (isFullApparel) {
    return path.resolve(process.cwd(), "r2-url-update-apparel-full-before-backup.json");
  }
  return path.resolve(process.cwd(), "r2-url-update-before-backup.json");
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  if (args.dryRun === args.apply) {
    throw new Error("Pass exactly one of --dry-run or --apply.");
  }

  const reportPath = path.resolve(process.cwd(), args.report);
  const migrationReport = JSON.parse(readFileSync(reportPath, "utf8")) as MigrationReport;
  const successfulImages = (migrationReport.images || []).filter((image) =>
    image.old_url &&
    image.new_r2_url &&
    image.upload_status === "uploaded" &&
    image.public_fetch_status === 200
  );
  const productCodes = unique(successfulImages.map((image) => image.product_code)).sort();
  const noopAlreadyR2Codes = unique((migrationReport.already_r2_images || []).map((image) => image.product_code)).sort();
  const verificationProductCodes = unique([...productCodes, ...noopAlreadyR2Codes]).sort();
  const products = await fetchProducts(productCodes);
  const byCode = new Map(products.map((product) => [product.product_code, product]));
  const imagesByCode = new Map<string, MigrationImage[]>();
  for (const image of successfulImages) {
    const group = imagesByCode.get(image.product_code) || [];
    group.push(image);
    imagesByCode.set(image.product_code, group);
  }

  const plans = productCodes.map((productCode) => {
    const product = byCode.get(productCode);
    const images = imagesByCode.get(productCode) || [];
    const mapping = new Map(images.map((image) => [image.old_url, image.new_r2_url]));
    if (!product) {
      return {
        product_code: productCode,
        missing_product: true,
        missing_mappings: 0,
        would_update_fields: [],
        update_payload: null,
      };
    }

    const currentThumbs = asArray(product.gallery_thumbnail_urls);
    const currentDisplays = asArray(product.gallery_image_urls);
    const plannedMainThumb = replaceWithMapping(product.main_thumbnail_url, mapping);
    const plannedMainImage = replaceWithMapping(product.main_image_url, mapping);
    const plannedThumbs = replaceArrayWithMapping(currentThumbs, mapping);
    const plannedDisplays = replaceArrayWithMapping(currentDisplays, mapping);
    const currentUrls = [
      product.main_thumbnail_url || "",
      product.main_image_url || "",
      ...currentThumbs,
      ...currentDisplays,
    ].filter(Boolean);
    const missingMappings = currentUrls.filter((url) => !mapping.has(url)).length;
    const wouldUpdateFields = [
      plannedMainThumb !== product.main_thumbnail_url ? "main_thumbnail_url" : "",
      plannedMainImage !== product.main_image_url ? "main_image_url" : "",
      JSON.stringify(plannedThumbs) !== JSON.stringify(currentThumbs) ? "gallery_thumbnail_urls" : "",
      JSON.stringify(plannedDisplays) !== JSON.stringify(currentDisplays) ? "gallery_image_urls" : "",
    ].filter(Boolean);

    return {
      product_code: productCode,
      missing_product: false,
      missing_mappings: missingMappings,
      would_update_fields: wouldUpdateFields,
      update_payload: {
        main_thumbnail_url: plannedMainThumb,
        main_image_url: plannedMainImage,
        gallery_thumbnail_urls: plannedThumbs,
        gallery_image_urls: plannedDisplays,
      },
      current: {
        main_thumbnail_url: product.main_thumbnail_url,
        main_image_url: product.main_image_url,
        gallery_thumbnail_urls_count: currentThumbs.length,
        gallery_image_urls_count: currentDisplays.length,
      },
      planned: {
        main_thumbnail_url: plannedMainThumb,
        main_image_url: plannedMainImage,
        gallery_thumbnail_urls_count: plannedThumbs.length,
        gallery_image_urls_count: plannedDisplays.length,
      },
      gallery_thumbnail_urls_count_change: `${currentThumbs.length} -> ${plannedThumbs.length}`,
      gallery_image_urls_count_change: `${currentDisplays.length} -> ${plannedDisplays.length}`,
    };
  });

  const missingProducts = plans.filter((plan) => plan.missing_product).length;
  const missingMappings = plans.reduce((sum, plan) => sum + Number(plan.missing_mappings || 0), 0);
  const wouldUpdateFields = unique(plans.flatMap((plan) => plan.would_update_fields || [])).sort();
  const unexpectedFields = wouldUpdateFields.filter((field) => !allowedUpdateFields.includes(field));
  const outputPath = outputPathFor(args, migrationReport);
  const output = {
    mode: args.dryRun ? "dry-run" : "apply",
    source_report: reportPath,
    source_products_scanned: migrationReport.products_scanned || null,
    source_products_already_r2: migrationReport.products_already_r2 || 0,
    products_planned: plans.length,
    products_noop_already_r2: migrationReport.products_already_r2 || 0,
    missing_products: missingProducts,
    missing_mappings: missingMappings,
    would_update_fields: wouldUpdateFields,
    unexpected_update_fields: unexpectedFields,
    plans,
    note: args.dryRun ? "dry-run only; no Supabase PATCH was executed" : "apply mode; only image URL fields were patched",
  };

  console.log(`mode: ${args.dryRun ? "dry-run" : "apply"}`);
  console.log(`source report: ${reportPath}`);
  console.log(`products planned: ${plans.length}`);
  console.log(`missing products: ${missingProducts}`);
  console.log(`missing mappings: ${missingMappings}`);
  console.log(`would update fields: ${wouldUpdateFields.join(", ")}`);
  const verbosePlans = plans.length > 40 ? plans.slice(0, 40) : plans;
  for (const plan of verbosePlans) {
    console.log(`${plan.product_code}: fields=${(plan.would_update_fields || []).join(", ") || "none"} thumbnails=${plan.gallery_thumbnail_urls_count_change || "n/a"} display=${plan.gallery_image_urls_count_change || "n/a"}`);
  }
  if (plans.length > verbosePlans.length) {
    console.log(`... ${plans.length - verbosePlans.length} more products included in report`);
  }

  if (missingProducts > 0 || missingMappings > 0 || unexpectedFields.length > 0) {
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    throw new Error("Preflight failed; no Supabase PATCH was executed.");
  }

  if (args.dryRun) {
    writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
    console.log(`report: ${outputPath}`);
    console.log("dry-run: no Supabase updates executed");
    return;
  }

  const backupPath = backupPathFor(migrationReport);
  const backupRows = productCodes.map((productCode) => {
    const product = byCode.get(productCode);
    return {
      product_code: productCode,
      main_thumbnail_url: product?.main_thumbnail_url || null,
      main_image_url: product?.main_image_url || null,
      gallery_thumbnail_urls: product ? asArray(product.gallery_thumbnail_urls) : [],
      gallery_image_urls: product ? asArray(product.gallery_image_urls) : [],
    };
  });
  writeFileSync(backupPath, `${JSON.stringify(backupRows, null, 2)}\n`);
  console.log(`backup: ${backupPath}`);

  const failedUpdates: Array<{ product_code: string; error: string }> = [];
  const updatedProductCodes: string[] = [];
  for (const plan of plans) {
    try {
      if (!plan.update_payload) throw new Error("missing update payload");
      await patchProductImageUrls(plan.product_code, plan.update_payload);
      updatedProductCodes.push(plan.product_code);
      console.log(`updated ${plan.product_code}`);
    } catch (error) {
      failedUpdates.push({
        product_code: plan.product_code,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`FAILED update ${plan.product_code}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const verifiedProducts = await fetchProducts(verificationProductCodes);
  const verifiedByCode = new Map(verifiedProducts.map((product) => [product.product_code, product]));
  const failedVerifications: Array<{ product_code: string; reason: string }> = [];
  for (const productCode of verificationProductCodes) {
    const product = verifiedByCode.get(productCode);
    if (!product) {
      failedVerifications.push({ product_code: productCode, reason: "missing_after_update" });
      continue;
    }
    const thumbUrls = asArray(product.gallery_thumbnail_urls);
    const displayUrls = asArray(product.gallery_image_urls);
    if (!isR2Url(product.main_thumbnail_url)) failedVerifications.push({ product_code: productCode, reason: "main_thumbnail_url_not_r2" });
    if (!isR2Url(product.main_image_url)) failedVerifications.push({ product_code: productCode, reason: "main_image_url_not_r2" });
    if (thumbUrls.length !== 9) failedVerifications.push({ product_code: productCode, reason: `gallery_thumbnail_urls_length_${thumbUrls.length}` });
    if (displayUrls.length !== 9) failedVerifications.push({ product_code: productCode, reason: `gallery_image_urls_length_${displayUrls.length}` });
    if (!hasOnlyR2Urls(product)) failedVerifications.push({ product_code: productCode, reason: "non_r2_url_remains" });
  }

  const sampleNewUrls = verifiedProducts.slice(0, 3).flatMap((product) => [
    product.main_thumbnail_url,
    product.main_image_url,
  ]).filter(Boolean);
  const applyReport = {
    mode: "apply",
    source_report: reportPath,
    source_products_scanned: migrationReport.products_scanned || null,
    products_noop_already_r2: noopAlreadyR2Codes.length,
    products_updated: updatedProductCodes.length,
    products_verified: verificationProductCodes.length - new Set(failedVerifications.map((item) => item.product_code)).size,
    failed_updates: failedUpdates,
    failed_verifications: failedVerifications,
    updated_product_codes: updatedProductCodes,
    backup_file: backupPath,
    sample_new_urls: sampleNewUrls,
    patched_fields_only: allowedUpdateFields,
  };
  writeFileSync(outputPath, `${JSON.stringify(applyReport, null, 2)}\n`);
  console.log(`report: ${outputPath}`);
  console.log(`products updated: ${applyReport.products_updated}`);
  console.log(`products verified: ${applyReport.products_verified}`);
  console.log(`failed updates: ${failedUpdates.length}`);
  console.log(`failed verifications: ${failedVerifications.length}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
