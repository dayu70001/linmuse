import fs from "node:fs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type AdminProductRow = {
  product_code: string;
  title: string | null;
  category: string | null;
  source_album_url: string | null;
  import_batch_id: string | null;
  imported_at: string | null;
  main_thumbnail_url: string | null;
  status: string | null;
  is_active: number | boolean | null;
  active?: number | boolean | null;
  published?: number | boolean | null;
};

type TableColumn = {
  name: string;
};

const DB_NAME = "linmuse-products-staging";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const header = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return header === token;
}

function cleanCode(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function isValidProductCode(value: string) {
  return /^LM-[A-Z]{3}-\d{4,}$/.test(value);
}

function readStagingDatabaseId() {
  const cwd = typeof process.cwd === "function" ? process.cwd() : "";
  if (!cwd) return "";
  const file = `${cwd}/workers/catalog-api/wrangler.staging.toml`;
  try {
    const text = fs.readFileSync(file, "utf8");
    const match = text.match(/database_id\s*=\s*"([^"]+)"/);
    return match?.[1] || "";
  } catch {
    return "";
  }
}

function d1Config() {
  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || process.env.R2_ACCOUNT_ID || "",
    token:
      process.env.CLOUDFLARE_API_TOKEN ||
      process.env.CF_API_TOKEN ||
      process.env.CLOUDFLARE_D1_TOKEN ||
      process.env.D1_API_TOKEN ||
      "",
    databaseId:
      process.env.CLOUDFLARE_D1_DATABASE_ID ||
      process.env.D1_DATABASE_ID ||
      process.env.LINMUSE_D1_DATABASE_ID ||
      readStagingDatabaseId(),
  };
}

async function runD1Query<T>(sql: string, params: unknown[] = []) {
  const cfg = d1Config();
  if (!cfg.accountId || !cfg.token || !cfg.databaseId) {
    throw new Error("Cloudflare D1 credentials are not configured for the admin product API.");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/d1/database/${cfg.databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
      cache: "no-store",
    },
  );
  const payload = await response.json().catch(() => null) as
    | { success?: boolean; errors?: Array<{ message?: string }>; result?: Array<{ results?: T[] }> }
    | null;

  if (!response.ok || !payload?.success) {
    const message = payload?.errors?.map((item) => item.message).filter(Boolean).join("; ") || `HTTP ${response.status}`;
    throw new Error(`D1 ${DB_NAME} query failed: ${message}`);
  }
  return payload.result?.[0]?.results || [];
}

async function productColumns() {
  const rows = await runD1Query<TableColumn>("PRAGMA table_info(products)");
  return new Set(rows.map((row) => row.name).filter(Boolean));
}

function boolValue(value: unknown) {
  return value === true || value === 1 || value === "1";
}

function normalizeProduct(row: AdminProductRow | null, columns: Set<string>) {
  if (!row) return null;
  const active = columns.has("active") ? boolValue(row.active) : boolValue(row.is_active);
  const published = columns.has("published")
    ? boolValue(row.published)
    : row.status === "published" && active;
  return {
    product_code: row.product_code,
    title: row.title || "",
    category: row.category || "",
    source_album_url: row.source_album_url || "",
    import_batch_id: row.import_batch_id || "",
    imported_at: row.imported_at || "",
    main_thumbnail_url: row.main_thumbnail_url || "",
    status: row.status || "",
    is_active: boolValue(row.is_active),
    active,
    published,
  };
}

async function findProduct(productCode: string) {
  const columns = await productColumns();
  const optionalColumns = [
    columns.has("status") ? "status" : "",
    columns.has("is_active") ? "is_active" : "",
    columns.has("active") ? "active" : "",
    columns.has("published") ? "published" : "",
    columns.has("source_album_url") ? "source_album_url" : "",
    columns.has("import_batch_id") ? "import_batch_id" : "",
    columns.has("imported_at") ? "imported_at" : "",
  ].filter(Boolean);
  const select = [
    "product_code",
    "title",
    "category",
    "main_thumbnail_url",
    ...optionalColumns,
  ].join(", ");
  const rows = await runD1Query<AdminProductRow>(
    `SELECT ${select} FROM products WHERE product_code = ? LIMIT 1`,
    [productCode],
  );
  return normalizeProduct(rows[0] || null, columns);
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "管理员 Token 错误或未设置" }, { status: 401 });
  }
  const url = new URL(req.url);
  const productCode = cleanCode(url.searchParams.get("product_code"));
  if (!isValidProductCode(productCode)) {
    return NextResponse.json({ error: "请输入完整且准确的 product_code，例如 LM-WAT-0302。" }, { status: 400 });
  }

  try {
    const product = await findProduct(productCode);
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    return NextResponse.json({ ok: true, product });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "管理员 Token 错误或未设置" }, { status: 401 });
  }
  let body: { product_code?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const productCode = cleanCode(body.product_code);
  if (body.action !== "hide") {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }
  if (!isValidProductCode(productCode)) {
    return NextResponse.json({ error: "Only exact product_code hide is allowed." }, { status: 400 });
  }

  try {
    const before = await findProduct(productCode);
    if (!before) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const columns = await productColumns();
    const updates: string[] = [];
    const params: unknown[] = [];
    if (columns.has("active")) {
      updates.push("active = ?");
      params.push(0);
    }
    if (columns.has("published")) {
      updates.push("published = ?");
      params.push(0);
    }
    if (columns.has("status")) {
      updates.push("status = ?");
      params.push("hidden");
    }
    if (columns.has("is_active")) {
      updates.push("is_active = ?");
      params.push(0);
    }
    if (updates.length === 0) {
      return NextResponse.json({ error: "No supported hide fields found on products table." }, { status: 500 });
    }
    await runD1Query(`UPDATE products SET ${updates.join(", ")} WHERE product_code = ?`, [...params, productCode]);
    const product = await findProduct(productCode);
    const confirmed = Boolean(product && product.active === false && product.published === false);
    if (!confirmed) {
      return NextResponse.json({ error: "Hide was not confirmed after update.", before, product }, { status: 502 });
    }
    return NextResponse.json({ ok: true, before, product, confirmed });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 502 });
  }
}
