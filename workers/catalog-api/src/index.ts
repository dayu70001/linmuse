type D1Result<T = unknown> = {
  results?: T[];
};

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement;
  first: <T = unknown>() => Promise<T | null>;
  all: <T = unknown>() => Promise<D1Result<T>>;
};

type D1Database = {
  prepare: (sql: string) => D1PreparedStatement;
};

export interface Env {
  DB: D1Database;
}

type ExecutionCtx = {
  waitUntil: (promise: Promise<unknown>) => void;
};

type CloudflareCacheStorage = CacheStorage & {
  default: Cache;
};

type QueryBuild = {
  where: string[];
  params: unknown[];
};

type SitemapProductRow = {
  slug?: string | null;
  product_code?: string | null;
  category?: string | null;
  updated_at?: string | null;
  imported_at?: string | null;
  created_at?: string | null;
};

const LIGHT_FIELDS = [
  "product_code",
  "slug",
  "title",
  "category",
  "subcategory",
  "brand",
  "model",
  "gender",
  "color",
  "main_thumbnail_url",
  "imported_at",
].join(", ");

// Same LIGHT_FIELDS but qualified with the alias `p` for the LEFT JOIN list
// query. We expose ONE extra column (seo_display_title) so cards can prefer
// the cleaned display title without paying for the full SEO bundle on every
// list response.
const LIGHT_QUALIFIED = LIGHT_FIELDS
  .split(", ")
  .map((c) => `p.${c}`)
  .join(", ");

const DETAIL_FIELDS = [
  "product_code",
  "slug",
  "title",
  "description",
  "category",
  "subcategory",
  "brand",
  "model",
  "gender",
  "color",
  "main_thumbnail_url",
  "main_image_url",
  "gallery_thumbnail_urls",
  "gallery_image_urls",
  "source_album_url",
  "source_fingerprint",
  "import_batch_id",
  "imported_at",
  "created_at",
  "status",
  "is_active",
].join(", ");

const SORT_SQL = "ORDER BY CAST(substr(product_code, 8) AS INTEGER) DESC, imported_at DESC, created_at DESC, product_code DESC";

// product_seo_content columns the front-end short-card actually consumes.
// product_seo_content is a SEPARATE table; the worker LEFT JOINs it onto
// /product/:code so existing rows keep working when no SEO row exists yet.
const SEO_CONTENT_COLUMNS = [
  "display_title",
  "short_subtitle",
  "product_overview",
  "material_details_json",
  "size_note",
  "care_note",
  "order_information",
  "how_to_ask",
  "service_note",
  "seo_title",
  "seo_description",
  "image_alt",
  "content_status",
  "content_version",
  "updated_at",
] as const;

const DETAIL_QUALIFIED = DETAIL_FIELDS
  .split(", ")
  .map((c) => `p.${c}`)
  .join(", ");

const SEO_QUALIFIED = SEO_CONTENT_COLUMNS
  .map((c) => `seo.${c} AS seo_${c}`)
  .join(", ");

type SeoContentRow = Partial<Record<`seo_${(typeof SEO_CONTENT_COLUMNS)[number]}`, unknown>>;

const HIDDEN_FILTER_VALUES = new Set(["", "other / unknown", "unknown", "other", "selected apparel", "selected shoes", "selected bags"]);

const BRAND_ALIASES: Record<string, string[]> = {
  "Louis Vuitton": ["Louis Vuitton", "LV", "L.V.", "Lv", "lv", "louis vuitton", "路易威登"],
  "Saint Laurent": ["Saint Laurent", "YSL", "Yves Saint Laurent", "ysl", "圣罗兰"],
  "Miu Miu": ["Miu Miu", "MiuMiu", "Miumiu", "MIUMIU", "miu miu", "miumiu", "缪缪"],
  Hermes: ["Hermes", "Hermès", "HERMES", "hermes", "爱马仕"],
  Gucci: ["Gucci", "GUCCI", "gucci", "古驰", "cucci", "Cucci"],
  Dior: ["Dior", "DIOR", "dior", "D家", "迪奥"],
  Chanel: ["Chanel", "CHANEL", "chanel", "香奈儿"],
};

const BRAND_BY_ALIAS = new Map(
  Object.entries(BRAND_ALIASES).flatMap(([canonical, aliases]) =>
    aliases.map((alias) => [taxonomyKey(alias), canonical] as const),
  ),
);

const BAG_SUBCATEGORY_ALIASES: Record<string, string[]> = {
  Handbags: ["Handbags", "Handbag"],
  "Shoulder Bags": ["Shoulder Bags"],
  "Crossbody Bags": ["Crossbody Bags", "Crossbody & Shoulder Bags"],
  "Tote Bags": ["Tote Bags", "Tote"],
  "Travel Bags": ["Travel Bags", "Travel", "Keepall"],
  Backpacks: ["Backpacks", "Backpack"],
  "Wallets & Cardholders": ["Wallets & Cardholders", "Wallets & Small Leather Goods", "Wallet", "Card Holder", "Cardholder"],
  Clutches: ["Clutches", "Clutch"],
};

const BAG_SUBCATEGORY_ORDER = [
  "Handbags",
  "Shoulder Bags",
  "Crossbody Bags",
  "Tote Bags",
  "Travel Bags",
  "Backpacks",
  "Wallets & Cardholders",
  "Clutches",
];

// Cache-Control strings used both as the response header AND as the TTL the
// Cloudflare Cache API honors when we cache.put() the response. Every hot GET
// endpoint is now backed by the edge Cache API (see serveCached) so a repeat
// request for the same normalized key never reaches D1.
const CACHE_CATALOG = "public, max-age=600, s-maxage=600, stale-while-revalidate=1800";
const CACHE_LATEST = "public, max-age=900, s-maxage=900, stale-while-revalidate=1800";
const CACHE_PRODUCT = "public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600";
// Short negative cache so a flood of non-existent slugs (scrapers / stale links)
// can't keep hammering D1 with full lookups.
const CACHE_PRODUCT_404 = "public, max-age=60, s-maxage=60";
const CACHE_FILTERS = "public, max-age=21600, s-maxage=21600, stale-while-revalidate=43200";
const CACHE_SITEMAP_PRODUCTS = "public, max-age=21600, s-maxage=21600, stale-while-revalidate=43200";

// Tracking / ad-click / cache-buster params that must NEVER affect the cache
// key — otherwise every Googlebot or ad referral with a unique utm/fbclid would
// punch straight through to D1.
const IGNORED_CACHE_PARAMS = new Set([
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "fbclid", "gclid", "gclsrc", "dclid", "msclkid", "ttclid", "yclid", "twclid",
  "ref", "referrer", "source", "spm", "scm",
  "_", "t", "ts", "timestamp", "random", "rand", "cb", "v", "cache",
]);

// Only these business params are allowed into the normalized cache key for each
// endpoint. Anything else (including the ignored set above) is dropped.
const ALLOWED_CACHE_PARAMS: Record<string, readonly string[]> = {
  catalog: ["category", "subcategory", "brand", "model", "search", "page", "pageSize"],
  latest: ["category", "page", "pageSize"],
  filters: ["category"],
  "sitemap-products": ["page", "pageSize"],
};

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

function jsonCached(value: unknown, cacheControl: string, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": cacheControl,
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

// Build a normalized GET Request to use as the Cache API key. Only the
// whitelisted business params for the endpoint are kept (trimmed + sorted), so
// `?page=1&utm_source=x&fbclid=y` and `?page=1` collapse to the same key.
// `pathOverride` lets /product/:id pass its decoded id as the cache path.
function normalizedCacheKey(request: Request, endpoint: string, pathOverride?: string) {
  const src = new URL(request.url);
  const key = new URL(src.origin + (pathOverride ?? src.pathname));
  const allowed = ALLOWED_CACHE_PARAMS[endpoint] || [];
  const pairs: Array<[string, string]> = [];
  for (const name of allowed) {
    const raw = src.searchParams.get(name);
    if (raw == null) continue;
    const value = clean(raw, 200);
    if (!value || IGNORED_CACHE_PARAMS.has(name)) continue;
    pairs.push([name, value]);
  }
  pairs.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [name, value] of pairs) key.searchParams.set(name, value);
  return new Request(key.toString(), { method: "GET" });
}

type ServeCachedOptions = {
  endpoint: string;
  key: Request;
  okCacheControl: string;
  notFoundCacheControl?: string;
  extraHeaders?: Record<string, string>;
  produce: () => Promise<Response>;
};

// Generic Cloudflare Cache API wrapper for every hot GET endpoint. On a HIT the
// stored response is returned without touching D1. On a MISS we run `produce`
// (which queries D1), tag it, and — only for cacheable statuses — store it.
async function serveCached(ctx: ExecutionCtx, opts: ServeCachedOptions): Promise<Response> {
  const cache = (caches as CloudflareCacheStorage).default;
  const extra = opts.extraHeaders || {};

  const hit = await cache.match(opts.key);
  if (hit) {
    const headers = new Headers(hit.headers);
    headers.set("x-linmuse-cache", "HIT");
    headers.set("x-linmuse-cache-endpoint", opts.endpoint);
    for (const [k, v] of Object.entries(extra)) headers.set(k, v);
    return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
  }

  const fresh = await opts.produce();
  let storeCacheControl: string | undefined;
  if (fresh.status === 200) storeCacheControl = opts.okCacheControl;
  else if (fresh.status === 404 && opts.notFoundCacheControl) storeCacheControl = opts.notFoundCacheControl;

  const headers = new Headers(fresh.headers);
  headers.set("x-linmuse-cache", "MISS");
  headers.set("x-linmuse-cache-endpoint", opts.endpoint);
  if (storeCacheControl) headers.set("cache-control", storeCacheControl);
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);

  const out = new Response(fresh.body, { status: fresh.status, statusText: fresh.statusText, headers });
  if (storeCacheControl) ctx.waitUntil(cache.put(opts.key, out.clone()));
  return out;
}

function clean(value: string | null, maxLength = 120) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function taxonomyKey(value: string | null | undefined) {
  return clean(value || "", 200)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s&/._-]+/g, "");
}

function isVisibleFilterValue(value: string | null | undefined) {
  const text = clean(value || "", 200);
  return Boolean(text && !HIDDEN_FILTER_VALUES.has(text.toLowerCase()));
}

function canonicalBrand(value: string | null | undefined) {
  const text = clean(value || "", 200);
  if (!isVisibleFilterValue(text)) return "";
  return BRAND_BY_ALIAS.get(taxonomyKey(text)) || text;
}

function brandFilterValues(value: string | null | undefined) {
  const canonical = canonicalBrand(value);
  if (!canonical) return [];
  return Array.from(new Set([canonical, ...(BRAND_ALIASES[canonical] || [])].map((item) => clean(item, 200)).filter(Boolean)));
}

function canonicalSubcategory(category: string | null | undefined, value: string | null | undefined) {
  const text = clean(value || "", 200);
  if (!isVisibleFilterValue(text)) return "";
  if (category !== "Bags") return text;
  if (text.toLowerCase() === "bags") return "";

  const key = taxonomyKey(text);
  for (const [canonical, aliases] of Object.entries(BAG_SUBCATEGORY_ALIASES)) {
    if (aliases.some((alias) => taxonomyKey(alias) === key)) return canonical;
  }
  return "";
}

function aggregateCanonicalCounts(rows: Array<{ value: string; count: number }>, canonicalize: (value: string) => string, order: string[] = []) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = canonicalize(row.value);
    if (!isVisibleFilterValue(value)) continue;
    counts.set(value, (counts.get(value) || 0) + Number(row.count || 0));
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      const aIndex = order.indexOf(a.value);
      const bIndex = order.indexOf(b.value);
      if (aIndex !== -1 || bIndex !== -1) {
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      }
      return a.value.localeCompare(b.value);
    });
}

function positiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function parseJsonArray(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function baseWhere() {
  return {
    where: ["status = ?", "is_active = ?"],
    params: ["published", 1],
  };
}

function addOptionalFilters(url: URL, query: QueryBuild, options: { includeSearch?: boolean; includeCategory?: boolean } = {}) {
  const includeCategory = options.includeCategory !== false;
  const category = clean(url.searchParams.get("category"));
  const subcategory = clean(url.searchParams.get("subcategory"));
  const brand = clean(url.searchParams.get("brand"));
  const model = clean(url.searchParams.get("model"));
  const search = clean(url.searchParams.get("search"), 180);

  if (includeCategory && category) {
    query.where.push("category = ?");
    query.params.push(category);
  }
  if (subcategory) {
    query.where.push("subcategory = ?");
    query.params.push(subcategory);
  }
  if (brand) {
    const brands = brandFilterValues(brand);
    if (brands.length > 1) {
      query.where.push(`brand IN (${brands.map(() => "?").join(", ")})`);
      query.params.push(...brands);
    } else if (brands.length === 1) {
      query.where.push("brand = ?");
      query.params.push(brands[0]);
    }
  }
  if (model) {
    query.where.push("model = ?");
    query.params.push(model);
  }
  if (options.includeSearch !== false && search) {
    const like = `%${search.replace(/[%_]/g, " ")}%`;
    query.where.push("(product_code LIKE ? OR title LIKE ? OR brand LIKE ? OR model LIKE ?)");
    query.params.push(like, like, like, like);
  }
}

function whereSql(query: QueryBuild) {
  return query.where.length ? `WHERE ${query.where.join(" AND ")}` : "";
}

// Prefix bare column references with the `p.` alias for the JOIN query, so
// columns shared with product_seo_content (e.g. `product_code`) are unambiguous.
const PRODUCTS_COLUMN_RE = /\b(product_code|status|is_active|category|subcategory|brand|model|title|imported_at|created_at|slug)\b/g;
function qualifyWhereForJoin(clause: string): string {
  return clause.replace(PRODUCTS_COLUMN_RE, "p.$1");
}

async function listProducts(env: Env, url: URL, options: { latest?: boolean } = {}) {
  const page = positiveInt(url.searchParams.get("page"), 1, 100000);
  const pageSize = positiveInt(url.searchParams.get("pageSize"), 25, 50);
  const offset = (page - 1) * pageSize;
  const query = baseWhere();
  addOptionalFilters(url, query, { includeSearch: !options.latest });
  const where = whereSql(query);

  const totalRow = await env.DB
    .prepare(`SELECT COUNT(*) AS total FROM products ${where}`)
    .bind(...query.params)
    .first<{ total: number }>();
  const total = Number(totalRow?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const safeOffset = (safePage - 1) * pageSize;

  // LEFT JOIN product_seo_content so list cards can prefer the cleaned
  // display_title when an approved SEO row exists. Only ONE extra column is
  // exposed (seo_display_title) to keep list payloads small.
  const qualifiedWhere = where ? `WHERE ${query.where.map(qualifyWhereForJoin).join(" AND ")}` : "";
  const qualifiedSort = SORT_SQL.replace(PRODUCTS_COLUMN_RE, "p.$1");
  const products = await env.DB
    .prepare(
      `SELECT ${LIGHT_QUALIFIED}, seo.display_title AS seo_display_title ` +
      `FROM products p ` +
      `LEFT JOIN product_seo_content seo ON seo.product_code = p.product_code ` +
      `${qualifiedWhere} ${qualifiedSort} LIMIT ? OFFSET ?`,
    )
    .bind(...query.params, pageSize, safeOffset)
    .all();

  return jsonCached(
    {
      products: products.results || [],
      total,
      page: safePage,
      pageSize,
      totalPages,
    },
    CACHE_CATALOG,
  );
}

function sitemapLastModified(row: SitemapProductRow) {
  return clean(row.updated_at || "", 80) || clean(row.imported_at || "", 80) || clean(row.created_at || "", 80) || null;
}

async function sitemapProducts(env: Env, url: URL) {
  const page = positiveInt(url.searchParams.get("page"), 1, 100000);
  const pageSize = positiveInt(url.searchParams.get("pageSize"), 1000, 1000);
  const offset = (page - 1) * pageSize;
  const rows = await env.DB
    .prepare(
      `SELECT
        slug,
        product_code,
        category,
        imported_at,
        created_at
      FROM products
      WHERE status = ? AND is_active = ?
      ORDER BY product_code ASC
      LIMIT ? OFFSET ?`,
    )
    .bind("published", 1, pageSize + 1, offset)
    .all<SitemapProductRow>();

  const resultRows = rows.results || [];
  const products = resultRows
    .slice(0, pageSize)
    .map((row) => {
      const productCode = clean(row.product_code || "", 120);
      const slug = clean(row.slug || productCode, 160).toLowerCase();
      return {
        slug,
        product_code: productCode,
        category: clean(row.category || "", 120),
        last_modified: sitemapLastModified(row),
      };
    })
    .filter((product) => product.slug && product.product_code);

  return jsonCached(
    {
      products,
      page,
      pageSize,
      count: products.length,
      hasMore: resultRows.length > pageSize,
    },
    CACHE_SITEMAP_PRODUCTS,
  );
}

async function getProduct(env: Env, slugOrCode: string) {
  const key = clean(decodeURIComponent(slugOrCode), 160);
  if (!key) return json({ error: "Missing product id" }, 400);

  // LEFT JOIN product_seo_content so existing rows still work when no SEO row exists.
  // The product_seo_content table is created by migrations/0001_product_seo_content.sql;
  // the LEFT JOIN returns NULL columns when the table is empty for this product, and
  // we never read products.title / products.description from anywhere — those stay
  // exactly as imported.
  const row = await env.DB
    .prepare(
      `SELECT ${DETAIL_QUALIFIED}, ${SEO_QUALIFIED} ` +
      `FROM products p ` +
      `LEFT JOIN product_seo_content seo ON seo.product_code = p.product_code ` +
      `WHERE p.status = ? AND p.is_active = ? AND (p.slug = ? OR p.product_code = ?) LIMIT 1`,
    )
    .bind("published", 1, key, key)
    .first<Record<string, unknown> & SeoContentRow>();

  if (!row) return json({ error: "Product not found" }, 404);

  // Pull every seo_* column off the joined row and rebuild a clean nested object.
  // If display_title is empty, treat the whole bundle as missing (no SEO row joined).
  const seoBundle = buildSeoContentBundle(row);

  // Strip the seo_* prefixed columns from the top-level response so the shape stays
  // identical to before for clients that don't know about seo_content yet.
  const cleanRow: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!k.startsWith("seo_")) cleanRow[k] = v;
  }

  return jsonCached(
    {
      ...cleanRow,
      gallery_thumbnail_urls: parseJsonArray(row.gallery_thumbnail_urls),
      gallery_image_urls: parseJsonArray(row.gallery_image_urls),
      seo_content: seoBundle,
    },
    CACHE_PRODUCT,
  );
}

function strOrEmpty(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function parseSeoArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((s) => String(s || "")).filter(Boolean);
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((s) => String(s || "")).filter(Boolean);
    if (typeof parsed === "string" && parsed.trim()) return [parsed];
  } catch {
    // not JSON — fall through to splitting on common separators
  }
  return value.split(/\r?\n|·/).map((s) => s.trim()).filter(Boolean);
}

function buildSeoContentBundle(row: SeoContentRow) {
  const displayTitle = strOrEmpty(row.seo_display_title).trim();
  // The LEFT JOIN returns all NULLs when no SEO row exists; treat that as "no bundle"
  // so the client knows to fall back to the legacy fields.
  if (!displayTitle) return null;
  return {
    display_title: displayTitle,
    short_subtitle: strOrEmpty(row.seo_short_subtitle).trim(),
    product_overview: strOrEmpty(row.seo_product_overview).trim(),
    material_details: parseSeoArray(row.seo_material_details_json),
    size_note: strOrEmpty(row.seo_size_note).trim(),
    care_note: strOrEmpty(row.seo_care_note).trim(),
    order_information: parseSeoArray(row.seo_order_information),
    how_to_ask: strOrEmpty(row.seo_how_to_ask).trim(),
    service_note: strOrEmpty(row.seo_service_note).trim(),
    seo_title: strOrEmpty(row.seo_seo_title).trim(),
    seo_description: strOrEmpty(row.seo_seo_description).trim(),
    image_alt: strOrEmpty(row.seo_image_alt).trim(),
    content_status: strOrEmpty(row.seo_content_status).trim(),
    content_version: strOrEmpty(row.seo_content_version).trim(),
    updated_at: strOrEmpty(row.seo_updated_at).trim(),
  };
}

async function distinctValues(env: Env, column: string, category: string) {
  const query = baseWhere();
  if (category) {
    query.where.push("category = ?");
    query.params.push(category);
  }
  query.where.push(`${column} IS NOT NULL`);
  query.where.push(`${column} != ''`);
  const rows = await env.DB
    .prepare(`SELECT ${column} AS value, COUNT(*) AS count FROM products ${whereSql(query)} GROUP BY ${column} ORDER BY count DESC, value ASC`)
    .bind(...query.params)
    .all<{ value: string; count: number }>();
  return (rows.results || []).map((row) => ({ value: row.value, count: row.count }));
}

async function filters(env: Env, url: URL) {
  const category = clean(url.searchParams.get("category"));
  const categoriesRows = await env.DB
    .prepare("SELECT category AS value, COUNT(*) AS count FROM products WHERE status = ? AND is_active = ? AND category IS NOT NULL AND category != '' GROUP BY category ORDER BY count DESC, value ASC")
    .bind("published", 1)
    .all<{ value: string; count: number }>();
  const categories = (categoriesRows.results || []).map((row) => ({ value: row.value, count: row.count }));
  const [subcategories, brands, models] = await Promise.all([
    distinctValues(env, "subcategory", category),
    distinctValues(env, "brand", category),
    distinctValues(env, "model", category),
  ]);
  const cleanSubcategories = aggregateCanonicalCounts(
    subcategories,
    (value) => canonicalSubcategory(category, value),
    category === "Bags" ? BAG_SUBCATEGORY_ORDER : [],
  );
  const cleanBrands = aggregateCanonicalCounts(brands, canonicalBrand);
  const cleanModels = aggregateCanonicalCounts(models, (value) => (isVisibleFilterValue(value) ? clean(value, 200) : ""));

  return jsonCached(
    {
      categories: categories.map((item) => item.value),
      subcategories: cleanSubcategories.map((item) => item.value),
      brands: cleanBrands.map((item) => item.value),
      models: cleanModels.map((item) => item.value),
      counts: {
        categories,
        subcategories: cleanSubcategories,
        brands: cleanBrands,
        models: cleanModels,
      },
    },
    CACHE_FILTERS,
  );
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionCtx): Promise<Response> {
    if (request.method === "OPTIONS") return json({ ok: true });
    // Cache GET and HEAD (curl -I). Everything else bypasses the cache entirely.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json({ error: "Method not allowed" }, 405);
    }

    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/+$/, "") || "/";

    try {
      if (pathname === "/health") return json({ ok: true });

      if (pathname === "/catalog") {
        const page = positiveInt(url.searchParams.get("page"), 1, 100000);
        const pageSize = positiveInt(url.searchParams.get("pageSize"), 25, 50);
        return serveCached(ctx, {
          endpoint: "catalog",
          key: normalizedCacheKey(request, "catalog"),
          okCacheControl: CACHE_CATALOG,
          extraHeaders: { "x-linmuse-page": String(page), "x-linmuse-limit": String(pageSize) },
          produce: () => listProducts(env, url),
        });
      }

      if (pathname === "/latest") {
        const page = positiveInt(url.searchParams.get("page"), 1, 100000);
        const pageSize = positiveInt(url.searchParams.get("pageSize"), 25, 50);
        return serveCached(ctx, {
          endpoint: "latest",
          key: normalizedCacheKey(request, "latest"),
          okCacheControl: CACHE_LATEST,
          extraHeaders: { "x-linmuse-page": String(page), "x-linmuse-limit": String(pageSize) },
          produce: () => listProducts(env, url, { latest: true }),
        });
      }

      if (pathname === "/filters") {
        return serveCached(ctx, {
          endpoint: "filters",
          key: normalizedCacheKey(request, "filters"),
          okCacheControl: CACHE_FILTERS,
          produce: () => filters(env, url),
        });
      }

      if (pathname === "/sitemap-products") {
        return serveCached(ctx, {
          endpoint: "sitemap-products",
          key: normalizedCacheKey(request, "sitemap-products"),
          okCacheControl: CACHE_SITEMAP_PRODUCTS,
          produce: () => sitemapProducts(env, url),
        });
      }

      if (pathname.startsWith("/product/")) {
        const id = pathname.slice("/product/".length);
        const decoded = clean(decodeURIComponent(id), 160);
        return serveCached(ctx, {
          endpoint: "product",
          key: normalizedCacheKey(request, "product", `/product/${encodeURIComponent(decoded)}`),
          okCacheControl: CACHE_PRODUCT,
          notFoundCacheControl: CACHE_PRODUCT_404,
          produce: () => getProduct(env, id),
        });
      }

      return json({ error: "Not found" }, 404);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
    }
  },
};
