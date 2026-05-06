import type { ProductBadge } from "@/data/products";
import {
  ALL_CATEGORY,
  HOME_FEATURED_CATEGORIES,
  cleanTaxonomyValue,
  isVisibleTaxonomyValue,
  isAllowedSubcategoryForCategory,
  sortCategories,
  sortSubcategories,
} from "@/lib/catalogTaxonomy";

export type CatalogProduct = {
  id?: string;
  product_code: string;
  slug: string;
  category: string;
  subcategory: string | null;
  brand?: string | null;
  model?: string | null;
  title_en: string;
  title_cn?: string | null;
  description_en: string | null;
  sizes_display: string | null;
  colors_display: string | null;
  moq: string | null;
  delivery_time: string | null;
  main_image_url: string | null;
  main_thumbnail_url: string | null;
  gallery_image_urls: string[];
  gallery_thumbnail_urls: string[];
  image_count: number | null;
  status?: string | null;
  is_active?: boolean | null;
  is_featured?: boolean | null;
  badge?: ProductBadge;
  imported_at?: string | null;
  created_at?: string | null;
};

export type CatalogFilters = {
  category?: string | null;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  search?: string | null;
  page?: number | string | null;
  pageSize?: number;
  onlyNew?: boolean;
};

export type CatalogActiveFilters = {
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  search: string;
};

export type CatalogFilterOptions = {
  categories: string[];
  subcategories: string[];
  brands: string[];
  models: string[];
};

export type CatalogProductsResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: CatalogActiveFilters;
  filterOptions: CatalogFilterOptions;
};

const catalogProductSelectWithClassification = [
  "id",
  "product_code",
  "slug",
  "category",
  "subcategory",
  "brand",
  "model",
  "title_en",
  "main_thumbnail_url",
  "status",
  "is_active",
  "is_featured",
  "imported_at",
  "created_at",
].join(",");

const catalogProductSelectLight = catalogProductSelectWithClassification;

const catalogProductSelectBase = [
  "id",
  "product_code",
  "slug",
  "category",
  "subcategory",
  "title_en",
  "main_thumbnail_url",
  "status",
  "is_active",
  "is_featured",
  "imported_at",
  "created_at",
].join(",");

const detailProductSelect = [
  "id",
  "product_code",
  "slug",
  "category",
  "subcategory",
  "brand",
  "model",
  "title_en",
  "description_en",
  "sizes_display",
  "colors_display",
  "moq",
  "delivery_time",
  "main_image_url",
  "main_thumbnail_url",
  "gallery_image_urls",
  "gallery_thumbnail_urls",
  "image_count",
  "status",
  "is_active",
  "is_featured",
  "imported_at",
  "created_at",
].join(",");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function isConfigured() {
  return Boolean(supabaseUrl && anonKey);
}

function normalizeCategory(category: string | null | undefined) {
  return cleanTaxonomyValue(category) || "Products";
}

function normalizeGallery(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return [];
}

function parseCategory(value: string | null | undefined) {
  const category = cleanTaxonomyValue(value);
  return isVisibleTaxonomyValue(category) ? category : ALL_CATEGORY;
}

function cleanFilter(value: string | null | undefined) {
  const text = String(value || "").trim();
  return text.length > 0 && text !== "All" ? text : "";
}

function isVisibleOption(value: string | null | undefined) {
  return isVisibleTaxonomyValue(value);
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

function parsePage(value: CatalogFilters["page"]) {
  return Math.max(1, Number(value || 1) || 1);
}

function encodeValue(value: string) {
  return encodeURIComponent(value.trim());
}

function encodeIlike(value: string) {
  return encodeURIComponent(`*${value.replace(/[(),]/g, " ").trim()}*`);
}

function mapProductRow(row: Record<string, unknown>): CatalogProduct {
  const mainImage = typeof row.main_image_url === "string" ? row.main_image_url : null;
  const mainThumbnail = typeof row.main_thumbnail_url === "string" ? row.main_thumbnail_url : null;
  const gallery = normalizeGallery(row.gallery_image_urls);
  const thumbnails = normalizeGallery(row.gallery_thumbnail_urls);
  const displayImage = mainThumbnail || mainImage || thumbnails[0] || gallery[0] || null;

  return {
    id: typeof row.id === "string" ? row.id : undefined,
    product_code: String(row.product_code || ""),
    slug: String(row.slug || row.product_code || ""),
    category: normalizeCategory(typeof row.category === "string" ? row.category : null),
    subcategory: typeof row.subcategory === "string" ? row.subcategory : null,
    brand: typeof row.brand === "string" ? row.brand : null,
    model: typeof row.model === "string" ? row.model : null,
    title_en: String(row.title_en || row.title_cn || row.product_code || "Selected Product"),
    title_cn: typeof row.title_cn === "string" ? row.title_cn : null,
    description_en: typeof row.description_en === "string" ? row.description_en : null,
    sizes_display: typeof row.sizes_display === "string" ? row.sizes_display : null,
    colors_display: typeof row.colors_display === "string" ? row.colors_display : null,
    moq: typeof row.moq === "string" ? row.moq : null,
    delivery_time: typeof row.delivery_time === "string" ? row.delivery_time : null,
    main_image_url: mainImage || gallery[0] || displayImage,
    main_thumbnail_url: displayImage,
    gallery_image_urls: gallery.length > 0 ? gallery : displayImage ? [displayImage] : [],
    gallery_thumbnail_urls: thumbnails.length > 0 ? thumbnails : displayImage ? [displayImage] : [],
    image_count: typeof row.image_count === "number" ? row.image_count : null,
    status: typeof row.status === "string" ? row.status : null,
    is_active: typeof row.is_active === "boolean" ? row.is_active : null,
    is_featured: typeof row.is_featured === "boolean" ? row.is_featured : null,
    badge: row.is_featured ? "Popular" : "New",
    imported_at: typeof row.imported_at === "string" ? row.imported_at : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
  };
}

async function fetchProducts(path: string, withCount = false) {
  if (!isConfigured()) {
    return { rows: [], total: 0 };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        ...(withCount ? { Prefer: "count=exact" } : {}),
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return { rows: [], total: 0, failed: true };
    }

    const rows = (await response.json()) as Record<string, unknown>[];
    const contentRange = response.headers.get("content-range") || "";
    const totalFromHeader = Number(contentRange.split("/")[1]);
    const mapped = rows.map(mapProductRow).filter((product) => product.product_code && product.slug);
    return {
      rows: mapped,
      total: Number.isFinite(totalFromHeader) ? totalFromHeader : mapped.length,
    };
  } catch {
    return { rows: [], total: 0, failed: true };
  }
}

async function fetchRawRows(path: string) {
  if (!isConfigured()) {
    return { rows: [] as Record<string, unknown>[], failed: true };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return { rows: [] as Record<string, unknown>[], failed: true };
    }

    return { rows: (await response.json()) as Record<string, unknown>[] };
  } catch {
    return { rows: [] as Record<string, unknown>[], failed: true };
  }
}

function buildCatalogPath(filters: CatalogActiveFilters, page: number, pageSize: number, includeClassificationFields: boolean, onlyNew = false) {
  const activeCategory = parseCategory(filters.category);
  const params = [
    `select=${onlyNew ? catalogProductSelectLight : includeClassificationFields ? catalogProductSelectWithClassification : catalogProductSelectBase}`,
    "is_active=eq.true",
    "status=eq.published",
  ];

  if (activeCategory !== ALL_CATEGORY) params.push(`category=eq.${encodeValue(activeCategory)}`);
  if (filters.subcategory) params.push(`subcategory=eq.${encodeValue(filters.subcategory)}`);
  if (includeClassificationFields && filters.brand) params.push(`brand=eq.${encodeValue(filters.brand)}`);
  if (includeClassificationFields && filters.model) params.push(`model=eq.${encodeValue(filters.model)}`);

  if (filters.search) {
    const pattern = encodeIlike(filters.search);
    const searchableColumns = includeClassificationFields
      ? ["product_code", "title_en", "category", "subcategory", "brand", "model"]
      : ["product_code", "title_en", "category", "subcategory"];
    params.push(`or=(${searchableColumns.map((column) => `${column}.ilike.${pattern}`).join(",")})`);
  }

  const from = (page - 1) * pageSize;
  params.push("order=imported_at.desc.nullslast,created_at.desc.nullslast", `offset=${from}`, `limit=${pageSize}`);

  return `products?${params.join("&")}`;
}

function normalizeFilters(filters: CatalogFilters, filterOptions?: CatalogFilterOptions): CatalogActiveFilters {
  const rawCategory = parseCategory(filters.category);
  const category = filterOptions && !filterOptions.categories.includes(rawCategory) ? ALL_CATEGORY : rawCategory;
  const brand = cleanFilter(filters.brand);
  const model = cleanFilter(filters.model);
  const subcategory = cleanFilter(filters.subcategory);
  const safeSubcategory = subcategory && isAllowedSubcategoryForCategory(category, subcategory) ? subcategory : "";

  return {
    category,
    subcategory: filterOptions && safeSubcategory && !filterOptions.subcategories.includes(safeSubcategory) ? "" : safeSubcategory,
    brand: filterOptions && brand && !filterOptions.brands.includes(brand) ? "" : brand,
    model: filterOptions && model && !filterOptions.models.includes(model) ? "" : model,
    search: String(filters.search || "").trim(),
  };
}

async function getCatalogFilterOptions(category = "All"): Promise<CatalogFilterOptions> {
  const withClassification = await fetchRawRows(
    "products?select=category,subcategory,brand,model&is_active=eq.true&status=eq.published&limit=20000",
  );
  const allRows = withClassification.rows;
  const productCategories = sortCategories(allRows.map((product) => String(product.category || "")));
  const categories = [ALL_CATEGORY, ...productCategories];
  const requestedCategory = parseCategory(category);
  const activeCategory = categories.includes(requestedCategory) ? requestedCategory : ALL_CATEGORY;
  const optionRows = activeCategory === ALL_CATEGORY
    ? allRows
    : allRows.filter((product) => cleanTaxonomyValue(String(product.category || "")) === activeCategory);

  return {
    categories,
    subcategories: activeCategory === ALL_CATEGORY
      ? []
      : sortSubcategories(
          activeCategory,
          optionRows
            .map((product) => String(product.subcategory || ""))
            .filter((subcategory) => isAllowedSubcategoryForCategory(activeCategory, subcategory)),
        ),
    brands: [...new Set(optionRows.map((product) => String(product.brand || "").trim()).filter(isVisibleOption))].sort(),
    models: [...new Set(optionRows.map((product) => String(product.model || "").trim()).filter(isVisibleOption))].sort(),
  };
}


function newestTime(product: CatalogProduct) {
  return Date.parse(product.imported_at || product.created_at || "") || 0;
}

function sortNewestProducts(products: CatalogProduct[]) {
  return [...products].sort((a, b) => {
    const timeDiff = newestTime(b) - newestTime(a);
    if (timeDiff !== 0) return timeDiff;
    return String(b.product_code || "").localeCompare(String(a.product_code || ""));
  });
}

async function getLimitedNewArrivalsProducts(
  page: number,
  pageSize: number,
  filterOptions: CatalogFilterOptions,
  normalized: CatalogActiveFilters,
) {
  const perCategoryLimit = 50;
  const offset = (page - 1) * pageSize;

  let rows: CatalogProduct[] = [];

  if (normalized.category === ALL_CATEGORY) {
    const visibleHomeCategories = HOME_FEATURED_CATEGORIES.filter((category) =>
      filterOptions.categories.includes(category),
    );

    const batches = await Promise.all(
      visibleHomeCategories.map((category) =>
        fetchProducts(
          buildCatalogPath(
            {
              ...normalized,
              category,
              subcategory: "",
              brand: "",
              model: "",
            },
            1,
            perCategoryLimit,
            true,
            true,
          ),
          false,
        ),
      ),
    );

    rows = batches.flatMap((batch) => batch.rows);
  } else {
    const result = await fetchProducts(
      buildCatalogPath(
        {
          ...normalized,
          subcategory: "",
          brand: "",
          model: "",
        },
        1,
        perCategoryLimit,
        true,
        true,
      ),
      false,
    );

    rows = result.rows;
  }

  const cleanRows = removeClearlyWrongProducts(sortNewestProducts(rows));
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

export async function getCatalogProducts(filters: CatalogFilters = {}) {
  const page = parsePage(filters.page);
  const pageSize = filters.pageSize || 25;
  const initialCategory = parseCategory(filters.category).toString();
  const filterOptions = await getCatalogFilterOptions(initialCategory);
  const normalized = normalizeFilters(filters, filterOptions);

  if (filters.onlyNew) {
    return getLimitedNewArrivalsProducts(page, pageSize, filterOptions, normalized);
  }

  let result = await fetchProducts(
    buildCatalogPath(normalized, page, pageSize, true, Boolean(filters.onlyNew)),
    true,
  );

  if (result.failed) {
    result = await fetchProducts(
      buildCatalogPath(normalized, page, pageSize, false, Boolean(filters.onlyNew)),
      true,
    );
  }

  if (result.rows.length > 0 || result.total > 0) {
    const visibleRows = removeClearlyWrongProducts(result.rows);
    const adjustedTotal = normalized.category === "Shoes"
      ? Math.max(0, result.total - 47)
      : result.total;
    const totalPages = Math.max(1, Math.ceil(adjustedTotal / pageSize));

    return {
      products: visibleRows,
      total: adjustedTotal,
      page: Math.min(page, totalPages),
      pageSize,
      totalPages,
      filters: normalized,
      filterOptions,
    };
  }

  return {
    products: [],
    total: 0,
    page: 1,
    pageSize,
    totalPages: 1,
    filters: normalized,
    filterOptions,
  };
}

export async function getCatalogProductBySlug(slug: string) {
  const result = await fetchProducts(
    `products?select=${detailProductSelect}&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&limit=1`
  );
  const rows = result.rows;

  if (rows[0]) {
    return rows[0];
  }

  return null;
}
