import fs from "node:fs";

function readEnv(file: string) {
  const env: Record<string, string> = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
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

const confirmDelete = process.env.CONFIRM_DELETE_INACTIVE_PRODUCTS === "YES";

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceKey!,
      Authorization: `Bearer ${serviceKey}`,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }

  if (res.status === 204) return null;
  return await res.json();
}

function extractStoragePaths(product: any) {
  const urls: string[] = [];

  for (const key of [
    "main_image_url",
    "main_thumbnail_url",
  ]) {
    if (typeof product[key] === "string") urls.push(product[key]);
  }

  for (const key of [
    "gallery_image_urls",
    "gallery_thumbnail_urls",
  ]) {
    if (Array.isArray(product[key])) {
      for (const url of product[key]) {
        if (typeof url === "string") urls.push(url);
      }
    }
  }

  const paths = new Set<string>();

  for (const url of urls) {
    const m = String(url).match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (m?.[2]) {
      paths.add(decodeURIComponent(m[2]));
    }
  }

  return Array.from(paths);
}

async function main() {
  const products = await api(
    "/rest/v1/products?select=product_code,category,title_en,status,is_active,import_batch_id,main_image_url,main_thumbnail_url,gallery_image_urls,gallery_thumbnail_urls&or=(is_active.is.false,is_active.is.null,status.neq.published)&limit=10000&order=category.asc,product_code.asc"
  );

  const list = Array.isArray(products) ? products : [];

  const byCategory: Record<string, number> = {};
  const byBatch: Record<string, number> = {};
  let imagePathCount = 0;

  for (const p of list) {
    byCategory[p.category || "Unknown"] = (byCategory[p.category || "Unknown"] || 0) + 1;
    byBatch[p.import_batch_id || "NO_BATCH"] = (byBatch[p.import_batch_id || "NO_BATCH"] || 0) + 1;
    imagePathCount += extractStoragePaths(p).length;
  }

  console.log("====== INACTIVE / NOT FRONTEND VISIBLE PRODUCTS ======");
  console.log("准备清理产品数:", list.length);
  console.log("关联图片路径数:", imagePathCount);
  console.log("");
  console.log("按分类:");
  console.table(byCategory);
  console.log("");
  console.log("按 batch:");
  console.table(byBatch);
  console.log("");
  console.log("前 80 个产品:");
  for (const p of list.slice(0, 80)) {
    console.log(`${p.product_code} | ${p.category} | active=${p.is_active} | status=${p.status} | batch=${p.import_batch_id || ""} | ${(p.title_en || "").slice(0, 80)}`);
  }

  const report = {
    generated_at: new Date().toISOString(),
    dry_run: !confirmDelete,
    products_count: list.length,
    image_paths_count: imagePathCount,
    by_category: byCategory,
    by_batch: byBatch,
    products: list.map((p: any) => ({
      product_code: p.product_code,
      category: p.category,
      status: p.status,
      is_active: p.is_active,
      import_batch_id: p.import_batch_id,
      title_en: p.title_en,
      image_paths: extractStoragePaths(p),
    })),
  };

  fs.writeFileSync("inactive-products-cleanup-report.json", JSON.stringify(report, null, 2));
  console.log("");
  console.log("报告已生成: inactive-products-cleanup-report.json");

  if (!confirmDelete) {
    console.log("");
    console.log("当前是 DRY RUN，没有删除任何东西。");
    console.log("确认没问题后，再运行带 CONFIRM_DELETE_INACTIVE_PRODUCTS=YES 的删除命令。");
    return;
  }

  console.log("");
  console.log("====== DELETE MODE ======");

  const allPaths = Array.from(new Set(list.flatMap((p: any) => extractStoragePaths(p))));

  if (allPaths.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < allPaths.length; i += chunkSize) {
      const chunk = allPaths.slice(i, i + chunkSize);
      await api("/storage/v1/object/product-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefixes: chunk }),
      });
      console.log(`已删除图片对象: ${Math.min(i + chunk.length, allPaths.length)}/${allPaths.length}`);
    }
  }

  const codes = list.map((p: any) => p.product_code).filter(Boolean);

  if (codes.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < codes.length; i += chunkSize) {
      const chunk = codes.slice(i, i + chunkSize);
      const inList = chunk.map((x: string) => `"${x}"`).join(",");
      await api(`/rest/v1/products?product_code=in.(${inList})`, {
        method: "DELETE",
        headers: {
          Prefer: "return=minimal",
        },
      });
      console.log(`已删除产品: ${Math.min(i + chunk.length, codes.length)}/${codes.length}`);
    }
  }

  console.log("");
  console.log("✅ 清理完成");
}

main().catch((err) => {
  console.error("❌", err.message || err);
  process.exit(1);
});
