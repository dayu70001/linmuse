import {
  ALL_CATEGORY,
  HOME_FEATURED_CATEGORIES,
  cleanTaxonomyValue,
  isVisibleTaxonomyValue,
  sortBrands,
  sortCategories,
} from "@/lib/catalogTaxonomy";
import type {
  CatalogActiveFilters,
  CatalogFilters,
  CatalogFilterOptions,
  CatalogProduct,
  CatalogProductsResult,
  CatalogSeoContent,
} from "@/lib/products";

type D1ListProduct = {
  product_code?: string;
  slug?: string;
  title?: string;
  category?: string;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  gender?: string | null;
  color?: string | null;
  main_thumbnail_url?: string | null;
  imported_at?: string | null;
  // Cleaned display title joined from product_seo_content. null when no SEO
  // row has been published for this product yet — the list card then falls
  // back to `title` (products.title from D1).
  seo_display_title?: string | null;
};

type D1SeoContentRaw = {
  display_title?: string | null;
  short_subtitle?: string | null;
  product_overview?: string | null;
  material_details?: string[] | null;
  size_note?: string | null;
  care_note?: string | null;
  order_information?: string[] | null;
  how_to_ask?: string | null;
  service_note?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  image_alt?: string | null;
  content_status?: string | null;
  content_version?: string | null;
  updated_at?: string | null;
};

type D1DetailProduct = D1ListProduct & {
  description?: string | null;
  main_image_url?: string | null;
  gallery_thumbnail_urls?: string[] | string | null;
  gallery_image_urls?: string[] | string | null;
  created_at?: string | null;
  status?: string | null;
  is_active?: boolean | number | null;
  seo_content?: D1SeoContentRaw | null;
};

type D1CatalogResponse = {
  products?: D1ListProduct[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

type D1FiltersResponse = {
  categories?: string[];
  subcategories?: string[];
  brands?: string[];
  models?: string[];
};

export function isD1WorkerProductSource() {
  return process.env.PRODUCT_SOURCE === "d1-worker";
}

function apiBase() {
  return (process.env.PRODUCT_API_BASE || "http://127.0.0.1:8787").replace(/\/+$/, "");
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function parsePage(value: CatalogFilters["page"]) {
  return Math.max(1, Number(value || 1) || 1);
}

const NEW_ARRIVALS_TOTAL_LIMIT = 199;
const REVALIDATE_CATALOG_SECONDS = 60;
const REVALIDATE_LATEST_SECONDS = 60;
const REVALIDATE_PRODUCT_SECONDS = 300;
const REVALIDATE_FILTERS_SECONDS = 300;

function newestTime(product: CatalogProduct) {
  return Date.parse(product.imported_at || product.created_at || "") || 0;
}

function productCodeNumber(product: CatalogProduct) {
  const match = String(product.product_code || "").match(/^LM-(APP|BAG|SHO|ACC|WAT)-(\d+)$/);
  return match ? Number(match[2]) : 0;
}

function sortNewestProducts(products: CatalogProduct[]) {
  return [...products].sort((a, b) => {
    const codeDiff = productCodeNumber(b) - productCodeNumber(a);
    if (codeDiff !== 0) return codeDiff;
    const timeDiff = newestTime(b) - newestTime(a);
    if (timeDiff !== 0) return timeDiff;
    return String(b.product_code || "").localeCompare(String(a.product_code || ""));
  });
}

function isClearlyWrongShoesProduct(product: CatalogProduct) {
  if (product.category !== "Shoes") return false;

  const title = String(product.title_en || "").toLowerCase();
  const apparelSignals = [
    "short sleeve",
    "shorts set",
    "t-shirt",
    "shirt",
    "pants",
    "hoodie",
    "sweater",
    "knitwear",
    "jacket",
    "coat",
    "vest",
    "polo",
  ];

  return apparelSignals.some((word) => title.includes(word));
}

function removeClearlyWrongProducts(products: CatalogProduct[]) {
  return products.filter((product) => !isClearlyWrongShoesProduct(product));
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function fetchJson<T>(path: string, options: { revalidate?: number } = {}): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...(options.revalidate ? { next: { revalidate: options.revalidate } } : { cache: "no-store" as const }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`D1 product API failed: ${response.status}${text ? ` ${text.slice(0, 240)}` : ""}`);
  }
  return response.json() as Promise<T>;
}

function emptyD1CatalogResult(
  page: number,
  pageSize: number,
  filters: CatalogActiveFilters,
  filterOptions: CatalogFilterOptions,
): CatalogProductsResult {
  return {
    products: [],
    total: 0,
    page: Math.max(1, page),
    pageSize,
    totalPages: 1,
    filters,
    filterOptions,
  };
}

function queryString(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    const text = clean(value);
    if (text && text !== ALL_CATEGORY) search.set(key, text);
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

function normalizeCategory(value: unknown) {
  const category = cleanTaxonomyValue(typeof value === "string" ? value : "");
  return isVisibleTaxonomyValue(category) ? category : "Products";
}

function sortModels(models: string[]) {
  return [...new Set(models.map(cleanTaxonomyValue).filter(isVisibleTaxonomyValue))].sort((a, b) =>
    a.localeCompare(b),
  );
}

function mapSeoContent(raw: D1SeoContentRaw | null | undefined): CatalogSeoContent | null {
  if (!raw || typeof raw !== "object") return null;
  const display = clean(raw.display_title);
  if (!display) return null; // worker returns null when no row was joined
  const arr = (v: string[] | null | undefined): string[] => Array.isArray(v) ? v.map((s) => clean(s)).filter(Boolean) : [];
  return {
    display_title: display,
    short_subtitle: clean(raw.short_subtitle),
    product_overview: clean(raw.product_overview),
    material_details: arr(raw.material_details),
    size_note: clean(raw.size_note),
    care_note: clean(raw.care_note),
    order_information: arr(raw.order_information),
    how_to_ask: clean(raw.how_to_ask),
    service_note: clean(raw.service_note),
    seo_title: clean(raw.seo_title),
    seo_description: clean(raw.seo_description),
    image_alt: clean(raw.image_alt),
    content_status: clean(raw.content_status) || undefined,
    content_version: clean(raw.content_version) || undefined,
    updated_at: clean(raw.updated_at) || undefined,
  };
}

// Build a CatalogSeoContent partial from a list row that only carries one column
// (seo_display_title). The other fields are filled in for the type but unused by
// card components — `display_title` is the only thing list cards need.
function mapListSeoContent(row: D1ListProduct): CatalogSeoContent | null {
  const display = clean(row.seo_display_title || "");
  if (!display) return null;
  return {
    display_title: display,
    short_subtitle: "",
    product_overview: "",
    material_details: [],
    size_note: "",
    care_note: "",
    order_information: [],
    how_to_ask: "",
    service_note: "",
    seo_title: "",
    seo_description: "",
    image_alt: "",
  };
}

function mapD1Product(row: D1ListProduct | D1DetailProduct): CatalogProduct {
  const gallery = normalizeArray((row as D1DetailProduct).gallery_image_urls);
  const thumbnails = normalizeArray((row as D1DetailProduct).gallery_thumbnail_urls);
  const mainImage = clean((row as D1DetailProduct).main_image_url) || gallery[0] || clean(row.main_thumbnail_url) || null;
  const mainThumbnail = clean(row.main_thumbnail_url) || thumbnails[0] || mainImage;

  return {
    product_code: clean(row.product_code),
    slug: clean(row.slug || row.product_code).toLowerCase(),
    category: normalizeCategory(row.category),
    subcategory: clean(row.subcategory) || null,
    brand: clean(row.brand) || null,
    model: clean(row.model) || null,
    title_en: clean(row.title || row.product_code || "Selected Product"),
    title_cn: null,
    description_en: clean((row as D1DetailProduct).description) || null,
    sizes_display: null,
    colors_display: null,
    moq: null,
    delivery_time: null,
    main_image_url: mainImage,
    main_thumbnail_url: mainThumbnail,
    gallery_image_urls: gallery.length > 0 ? gallery : mainImage ? [mainImage] : [],
    gallery_thumbnail_urls: thumbnails.length > 0 ? thumbnails : mainThumbnail ? [mainThumbnail] : [],
    image_count: gallery.length || thumbnails.length || null,
    status: clean((row as D1DetailProduct).status) || "published",
    is_active: (row as D1DetailProduct).is_active === 0 ? false : true,
    is_featured: null,
    badge: "New",
    imported_at: clean(row.imported_at) || null,
    created_at: clean((row as D1DetailProduct).created_at) || null,
    // Detail responses carry a full seo_content bundle; list responses carry
    // only seo_display_title. Prefer the bundle when present, fall back to the
    // partial built from the single list column.
    seo_content: mapSeoContent((row as D1DetailProduct).seo_content) || mapListSeoContent(row as D1ListProduct),
  };
}

function normalizeActiveFilters(filters: CatalogFilters, filterOptions: CatalogFilterOptions): CatalogActiveFilters {
  const rawCategory = cleanTaxonomyValue(filters.category || "");
  const category = rawCategory && filterOptions.categories.includes(rawCategory) ? rawCategory : ALL_CATEGORY;
  const subcategory = clean(filters.subcategory);
  const brand = clean(filters.brand);
  const model = clean(filters.model);

  return {
    category,
    subcategory: subcategory && filterOptions.subcategories.includes(subcategory) ? subcategory : "",
    brand: brand && filterOptions.brands.includes(brand) ? brand : "",
    model: model && filterOptions.models.includes(model) ? model : "",
    search: clean(filters.search),
  };
}

export async function getD1FilterOptions(category = ALL_CATEGORY): Promise<CatalogFilterOptions> {
  const requestedCategory = cleanTaxonomyValue(category || "") || ALL_CATEGORY;
  const categoryQuery = requestedCategory !== ALL_CATEGORY ? queryString({ category: requestedCategory }) : "";
  const [allFilters, categoryFilters] = await Promise.all([
    fetchJson<D1FiltersResponse>("/filters", { revalidate: REVALIDATE_FILTERS_SECONDS }).catch((): D1FiltersResponse => ({})),
    requestedCategory === ALL_CATEGORY
      ? Promise.resolve<D1FiltersResponse>({})
      : fetchJson<D1FiltersResponse>(`/filters${categoryQuery}`, { revalidate: REVALIDATE_FILTERS_SECONDS }).catch((): D1FiltersResponse => ({})),
  ]);
  const categories = [ALL_CATEGORY, ...sortCategories((allFilters.categories || []).filter(Boolean))];
  const activeCategory = categories.includes(requestedCategory) ? requestedCategory : ALL_CATEGORY;
  const scoped = activeCategory === ALL_CATEGORY
    ? { subcategories: [], brands: allFilters.brands || [], models: allFilters.models || [] }
    : categoryFilters;

  return {
    categories,
    subcategories: scoped.subcategories || [],
    brands: sortBrands(scoped.brands || []),
    models: sortModels(scoped.models || []),
  };
}

// Round-robins per-category lists (each already newest-first) instead of a
// global sort, so the "All" view can't be swamped by whichever category has
// the highest SKU counter (Apparel's counter runs far ahead of Shoes/Watches/
// Bags, so a flat sort-by-code buried the other categories past page one).
function interleaveByCategory(categoryRows: CatalogProduct[][]): CatalogProduct[] {
  const merged: CatalogProduct[] = [];
  const maxLength = categoryRows.reduce((max, rows) => Math.max(max, rows.length), 0);
  for (let i = 0; i < maxLength; i++) {
    for (const rows of categoryRows) {
      if (rows[i]) merged.push(rows[i]);
    }
  }
  return merged;
}

async function getLimitedNewArrivalsFromD1(
  page: number,
  pageSize: number,
  filterOptions: CatalogFilterOptions,
  normalized: CatalogActiveFilters,
): Promise<CatalogProductsResult> {
  const perCategoryLimit = 50;
  let cleanRows: CatalogProduct[];

  if (normalized.category === ALL_CATEGORY) {
    const visibleHomeCategories = HOME_FEATURED_CATEGORIES.filter((category) =>
      filterOptions.categories.includes(category),
    );
    const batches = await Promise.all(
      visibleHomeCategories.map(async (category) => {
        const response = await fetchJson<D1CatalogResponse>(`/latest${queryString({
          category,
          page: 1,
          pageSize: perCategoryLimit,
        })}`, { revalidate: REVALIDATE_LATEST_SECONDS });
        return removeClearlyWrongProducts(sortNewestProducts((response.products || []).map(mapD1Product)));
      }),
    );
    cleanRows = interleaveByCategory(batches).slice(0, NEW_ARRIVALS_TOTAL_LIMIT);
  } else {
    const response = await fetchJson<D1CatalogResponse>(`/latest${queryString({
      category: normalized.category,
      page: 1,
      pageSize: perCategoryLimit,
    })}`, { revalidate: REVALIDATE_LATEST_SECONDS });
    const rows = (response.products || []).map(mapD1Product);
    cleanRows = removeClearlyWrongProducts(sortNewestProducts(rows)).slice(0, NEW_ARRIVALS_TOTAL_LIMIT);
  }

  const total = cleanRows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const safeOffset = (safePage - 1) * pageSize;

  return {
    products: cleanRows.slice(safeOffset, safeOffset + pageSize),
    total,
    page: safePage,
    pageSize,
    totalPages,
    filters: normalized,
    filterOptions,
  };
}

export async function getCatalogProductsFromD1(filters: CatalogFilters = {}): Promise<CatalogProductsResult> {
  const page = parsePage(filters.page);
  const pageSize = filters.pageSize || 25;
  const initialOptions = await getD1FilterOptions(clean(filters.category) || ALL_CATEGORY);
  const normalized = normalizeActiveFilters(filters, initialOptions);
  if (filters.onlyNew) {
    try {
      return await getLimitedNewArrivalsFromD1(page, pageSize, initialOptions, normalized);
    } catch {
      return emptyD1CatalogResult(page, pageSize, normalized, initialOptions);
    }
  }

  const endpoint = filters.onlyNew ? "/latest" : "/catalog";
  let response: D1CatalogResponse;
  try {
    response = await fetchJson<D1CatalogResponse>(`${endpoint}${queryString({
      category: normalized.category,
      subcategory: filters.onlyNew ? "" : normalized.subcategory,
      brand: filters.onlyNew ? "" : normalized.brand,
      model: filters.onlyNew ? "" : normalized.model,
      search: filters.onlyNew ? "" : normalized.search,
      page,
      pageSize,
    })}`, { revalidate: REVALIDATE_CATALOG_SECONDS });
  } catch {
    return emptyD1CatalogResult(page, pageSize, normalized, initialOptions);
  }
  const filterOptions = normalized.category === ALL_CATEGORY
    ? initialOptions
    : await getD1FilterOptions(normalized.category);

  return {
    products: (response.products || []).map(mapD1Product).filter((product) => product.product_code && product.slug),
    total: Number(response.total || 0),
    page: Number(response.page || page),
    pageSize: Number(response.pageSize || pageSize),
    totalPages: Number(response.totalPages || Math.max(1, Math.ceil(Number(response.total || 0) / pageSize))),
    filters: normalized,
    filterOptions,
  };
}

export async function getCatalogProductBySlugFromD1(slugOrCode: string) {
  const product = await fetchJson<D1DetailProduct>(`/product/${encodeURIComponent(slugOrCode)}`, { revalidate: REVALIDATE_PRODUCT_SECONDS });
  return mapD1Product(product);
}
