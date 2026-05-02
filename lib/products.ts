import { products as mockProducts, type Product, type ProductBadge, type ProductCategory } from "@/data/products";

export type CatalogProduct = {
  product_code: string;
  slug: string;
  category: ProductCategory;
  subcategory: string | null;
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
};

const productSelect = [
  "product_code",
  "slug",
  "category",
  "subcategory",
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

function normalizeCategory(category: string | null | undefined): ProductCategory {
  if (category === "Shoes" || category === "Watches" || category === "Bags") {
    return category;
  }
  return "Apparel";
}

function normalizeGallery(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return [];
}

function parseCategory(value: string | null | undefined): ProductCategory | "All" {
  if (value === "Apparel" || value === "Shoes" || value === "Watches" || value === "Bags") {
    return value;
  }
  return "All";
}

function mapProductRow(row: Record<string, unknown>): CatalogProduct {
  const mainImage = typeof row.main_image_url === "string" ? row.main_image_url : null;
  const mainThumbnail = typeof row.main_thumbnail_url === "string" ? row.main_thumbnail_url : null;
  const gallery = normalizeGallery(row.gallery_image_urls);
  const thumbnails = normalizeGallery(row.gallery_thumbnail_urls);
  const displayImage = mainThumbnail || mainImage || thumbnails[0] || gallery[0] || null;

  return {
    product_code: String(row.product_code || ""),
    slug: String(row.slug || row.product_code || ""),
    category: normalizeCategory(typeof row.category === "string" ? row.category : null),
    subcategory: typeof row.subcategory === "string" ? row.subcategory : null,
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
  };
}

export function mapMockProduct(product: Product): CatalogProduct {
  return {
    product_code: product.id,
    slug: product.slug,
    category: product.category,
    subcategory: product.subcategory,
    title_en: product.title,
    description_en: product.description,
    sizes_display: "Contact us for current size availability",
    colors_display: "Contact us for available color options",
    moq: product.moq,
    delivery_time: "7-12 business days",
    main_image_url: product.mainImage,
    main_thumbnail_url: product.mainImage,
    gallery_image_urls: [product.mainImage, ...product.images],
    gallery_thumbnail_urls: [product.mainImage, ...product.images],
    image_count: product.images.length + 1,
    status: "mock",
    is_active: true,
    is_featured: product.isFeatured,
    badge: product.badge,
  };
}

async function fetchProducts(path: string) {
  if (!isConfigured()) {
    return [];
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
      return [];
    }

    const rows = (await response.json()) as Record<string, unknown>[];
    return rows.map(mapProductRow).filter((product) => product.product_code && product.slug);
  } catch {
    return [];
  }
}

export async function getCatalogProducts(category?: string) {
  const selectedCategory = parseCategory(category);
  const filters = selectedCategory === "All" ? "" : `&category=eq.${encodeURIComponent(selectedCategory)}`;
  const rows = await fetchProducts(
    `products?select=${productSelect}&is_active=eq.true${filters}&order=product_code.desc`
  );

  if (rows.length > 0) return rows;

  const fallbackProducts = mockProducts.map(mapMockProduct);
  return selectedCategory === "All"
    ? fallbackProducts
    : fallbackProducts.filter((product) => product.category === selectedCategory);
}

export async function getCatalogProductBySlug(slug: string) {
  const rows = await fetchProducts(
    `products?select=${productSelect}&slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&limit=1`
  );

  if (rows[0]) {
    return rows[0];
  }

  const mock = mockProducts.find((product) => product.slug === slug);
  return mock ? mapMockProduct(mock) : null;
}
