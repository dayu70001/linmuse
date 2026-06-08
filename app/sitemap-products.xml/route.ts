const SITE_URL = "https://linmuse.com";
const DEFAULT_API_BASE = "https://linmuse-catalog-api-staging.linmusedkbrand2026.workers.dev";
const PRODUCT_SITEMAP_PAGE_SIZE = 1000;
const MAX_PRODUCT_SITEMAP_PAGES = 100;
const CACHE_CONTROL = "public, max-age=300, s-maxage=300, stale-while-revalidate=600";

type SitemapProduct = {
  slug?: string | null;
  product_code?: string | null;
  category?: string | null;
  last_modified?: string | null;
};

type SitemapProductsResponse = {
  products?: SitemapProduct[];
  page?: number;
  pageSize?: number;
  count?: number;
  hasMore?: boolean;
};

function productApiBase() {
  return (
    process.env.PRODUCT_API_BASE ||
    process.env.NEXT_PUBLIC_PRODUCT_API_BASE ||
    DEFAULT_API_BASE
  ).replace(/\/+$/, "");
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function xmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": CACHE_CONTROL,
    },
  });
}

function errorResponse() {
  return xmlResponse(
    `<?xml version="1.0" encoding="UTF-8"?>\n<error>Product sitemap is temporarily unavailable.</error>\n`,
    502,
  );
}

function validLastmod(value: string | null | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function positivePage(value: string | null) {
  const parsed = Number(value || "");
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

async function fetchProductSitemapPage(page: number) {
  const url = `${productApiBase()}/sitemap-products?page=${page}&pageSize=${PRODUCT_SITEMAP_PAGE_SIZE}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });
  if (!response.ok) throw new Error("Product sitemap source failed");
  return response.json() as Promise<SitemapProductsResponse>;
}

function sitemapIndexXml(pages: number[]) {
  const entries = pages
    .map((page) => {
      const loc = `${SITE_URL}/sitemap-products.xml?page=${page}`;
      return `  <sitemap>\n    <loc>${xmlEscape(loc)}</loc>\n  </sitemap>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`;
}

function productUrlsetXml(products: SitemapProduct[]) {
  const seen = new Set<string>();
  const entries = products
    .flatMap((product) => {
      const slug = String(product.slug || product.product_code || "").trim();
      if (!slug || seen.has(slug)) return [];
      seen.add(slug);

      const loc = `${SITE_URL}/catalog/${encodeURIComponent(slug)}`;
      const lastmod = validLastmod(product.last_modified);
      const lastmodXml = lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : "";
      return [`  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmodXml}\n  </url>`];
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");

  try {
    if (!pageParam) {
      const pages: number[] = [];
      for (let page = 1; page <= MAX_PRODUCT_SITEMAP_PAGES; page += 1) {
        const data = await fetchProductSitemapPage(page);
        const count = Number(data.count || 0);
        if (count <= 0) break;
        pages.push(page);
        if (!data.hasMore || count < PRODUCT_SITEMAP_PAGE_SIZE) break;
      }
      return xmlResponse(sitemapIndexXml(pages));
    }

    const page = positivePage(pageParam);
    const data = await fetchProductSitemapPage(page);
    return xmlResponse(productUrlsetXml(data.products || []));
  } catch {
    return errorResponse();
  }
}
