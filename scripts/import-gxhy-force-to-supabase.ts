import fs from "node:fs";
import path from "node:path";

function readEnv(file: string) {
  const env: Record<string, string> = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

const env = { ...readEnv(".env.local"), ...process.env };
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("❌ 找不到 Supabase URL 或 service role key");
  process.exit(1);
}

function latestRunDir() {
  const base = path.join(process.cwd(), "imports", "gxhy1688");
  const dirs = fs.readdirSync(base)
    .filter(x => x.startsWith("gxhy-desktop-force-"))
    .map(x => path.join(base, x))
    .filter(x => fs.statSync(x).isDirectory())
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!dirs[0]) throw new Error("找不到 gxhy-desktop-force-* 文件夹");
  return dirs[0];
}

function readProducts(file: string) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(data) ? data : data.products || [];
}

async function api(pathname: string, options: RequestInit = {}) {
  const res = await fetch(`${supabaseUrl}${pathname}`, {
    ...options,
    headers: {
      apikey: serviceKey!,
      Authorization: `Bearer ${serviceKey}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

async function getAllowedProductColumns() {
  const res = await api("/rest/v1/products?select=*&limit=1");
  if (!res.ok) {
    console.error(await res.text());
    throw new Error("读取 products 表失败");
  }
  const rows = await res.json();
  if (!rows.length) return null;
  return new Set(Object.keys(rows[0]));
}

async function inferStorageBucket() {
  const res = await api("/rest/v1/products?select=main_image_url,gallery_image_urls&limit=30");
  if (res.ok) {
    const rows = await res.json();
    for (const row of rows) {
      const values = [
        row.main_image_url,
        ...(Array.isArray(row.gallery_image_urls) ? row.gallery_image_urls : []),
      ].filter(Boolean);
      for (const v of values) {
        const m = String(v).match(/\/storage\/v1\/object\/public\/([^/]+)\//);
        if (m?.[1]) return m[1];
      }
    }
  }

  const bucketRes = await api("/storage/v1/bucket");
  if (bucketRes.ok) {
    const buckets = await bucketRes.json();
    const names = buckets.map((b: any) => b.name || b.id).filter(Boolean);
    const preferred = names.find((n: string) => /product|catalog/i.test(n)) || names[0];
    if (preferred) return preferred;
  }

  return "product-images";
}

function storagePath(category: string, code: string, kind: "display" | "thumbs", filename: string) {
  return `products/${category}/${code}/${kind}/${filename}`;
}

function publicUrl(bucket: string, objectPath: string) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
}

async function uploadFile(bucket: string, objectPath: string, filePath: string) {
  const body = fs.readFileSync(filePath);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: serviceKey!,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "image/webp",
        "x-upsert": "true",
      },
      body,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`上传失败 ${objectPath}: ${text}`);
    }
  } catch (err: any) {
    throw new Error(`上传超时或失败 ${objectPath}: ${err?.message || err}`);
  } finally {
    clearTimeout(timer);
  }
}

const uploadConcurrency = Number(process.env.GXHY_UPLOAD_CONCURRENCY || "3");

async function runPool<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.max(1, limit) }, async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const run = latestRunDir();
  const input =
    fs.existsSync(path.join(run, "products-import.translated.import-ready-codes.json"))
      ? path.join(run, "products-import.translated.import-ready-codes.json")
      : path.join(run, "products-import.translated.json");

  if (!fs.existsSync(input)) throw new Error(`找不到输入文件: ${input}`);

  const products = readProducts(input);
  const category = "Watches";
  const batchId = `watches-gxhy-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const importedAt = new Date().toISOString();

  console.log("Run:", run);
  console.log("Input:", input);
  console.log("Products read:", products.length);

  const bucket = await inferStorageBucket();
  console.log("Storage bucket:", bucket);

  const allowedColumns = await getAllowedProductColumns();

  const existingFpRes = await api("/rest/v1/products?select=source_fingerprint,product_code&category=eq.Watches&limit=3000");
  if (!existingFpRes.ok) {
    console.error(await existingFpRes.text());
    throw new Error("读取现有 Watches 失败");
  }

  const existingRows = await existingFpRes.json();
  const existingFingerprints = new Set(existingRows.map((x: any) => x.source_fingerprint).filter(Boolean));

  let imported = 0;
  let skippedDuplicate = 0;
  let uploadedImages = 0;
  const skipped: any[] = [];
  const importedCodes: string[] = [];

  for (const [index, product] of products.entries()) {
    const code = product.product_code;
    const fp = product.source_fingerprint;

    if (fp && existingFingerprints.has(fp)) {
      skippedDuplicate++;
      skipped.push({ product_code: code, reason: "duplicate_source_fingerprint" });
      continue;
    }

    console.log(`
➡️ 开始导入 ${code} (${index + 1}/${products.length})`);

    const displayDir = path.join(run, "images", code, "display");
    const thumbsDir = path.join(run, "images", code, "thumbs");

    if (!fs.existsSync(displayDir) || !fs.existsSync(thumbsDir)) {
      skipped.push({ product_code: code, reason: "local_image_folder_missing" });
      continue;
    }

    const displayFiles = fs.readdirSync(displayDir).filter(x => x.endsWith(".webp")).sort();
    const thumbFiles = fs.readdirSync(thumbsDir).filter(x => x.endsWith(".webp")).sort();

    if (displayFiles.length < 9 || thumbFiles.length < 9) {
      skipped.push({
        product_code: code,
        reason: "below_min_images",
        display_count: displayFiles.length,
        thumbs_count: thumbFiles.length,
      });
      continue;
    }

    const displayUrls: string[] = [];
    const thumbUrls: string[] = [];

    const displayUrlResults = new Array(displayFiles.length);
    const thumbUrlResults = new Array(thumbFiles.length);

    await runPool(displayFiles, uploadConcurrency, async (file, index) => {
      const obj = storagePath(category, code, "display", file);
      console.log(`   upload display ${file}`);
      await uploadFile(bucket, obj, path.join(displayDir, file));
      displayUrlResults[index] = publicUrl(bucket, obj);
      uploadedImages++;
    });

    await runPool(thumbFiles, uploadConcurrency, async (file, index) => {
      const obj = storagePath(category, code, "thumbs", file);
      console.log(`   upload thumb ${file}`);
      await uploadFile(bucket, obj, path.join(thumbsDir, file));
      thumbUrlResults[index] = publicUrl(bucket, obj);
      uploadedImages++;
    });

    displayUrls.push(...displayUrlResults.filter(Boolean));
    thumbUrls.push(...thumbUrlResults.filter(Boolean));

    const row: Record<string, any> = {
      product_code: code,
      slug: code.toLowerCase(),
      category,
      title_en: product.title_en || product.title_cn || product.source_title_cn || code,
      title_cn: product.title_cn || product.source_title_cn || "",
      source_title_cn: product.source_title_cn || product.title_cn || "",
      description_en: product.description_en || "",
      description_cn: product.description_cn || product.source_description_cn || product.title_cn || "",
      source_description_cn: product.source_description_cn || product.description_cn || "",
      image_count: displayUrls.length,
      main_image_url: displayUrls[0],
      main_thumbnail_url: thumbUrls[0],
      gallery_image_urls: displayUrls,
      gallery_thumbnail_urls: thumbUrls,
      source_album_url: product.source_album_url,
      source_product_url: product.source_product_url,
      source_fingerprint: product.source_fingerprint,
      import_batch_id: batchId,
      imported_at: importedAt,
      is_active: false,
    };

    if (product.source_tab) row.source_tab = product.source_tab;
    if (product.source_page) row.source_page = product.source_page;

    const filteredRow = allowedColumns
      ? Object.fromEntries(Object.entries(row).filter(([k]) => allowedColumns.has(k)))
      : row;

    const upsertRes = await api("/rest/v1/products?on_conflict=product_code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(filteredRow),
    });

    if (!upsertRes.ok) {
      const text = await upsertRes.text();
      console.error(`❌ 产品写入 Supabase 失败: ${code}`);
      console.error(text);
      throw new Error(`product_upsert_failed: ${code}`);
    }

    imported++;
    importedCodes.push(code);
    console.log(`✅ imported ${code}`);
  }

  const report = {
    run,
    input,
    bucket,
    import_batch_id: batchId,
    products_read: products.length,
    products_imported: imported,
    skipped_duplicate: skippedDuplicate,
    images_uploaded: uploadedImages,
    imported_codes: importedCodes,
    skipped,
  };

  const reportPath = path.join(run, "gxhy-force-direct-supabase-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n====== DONE ======");
  console.log("Products read:", products.length);
  console.log("Products imported:", imported);
  console.log("Images uploaded:", uploadedImages);
  console.log("Skipped duplicate:", skippedDuplicate);
  console.log("Report:", reportPath);
}

main().catch(err => {
  console.error("❌", err.message || err);
  process.exit(1);
});
