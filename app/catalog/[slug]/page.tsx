import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { getCatalogProductBySlug } from "@/lib/products";
import type { CatalogProduct, CatalogSeoContent } from "@/lib/products";
import { buildCanonical, jsonLdStringify, safeAbsoluteUrl, SITE_NAME } from "@/lib/seo";

export const revalidate = 300;
export const dynamicParams = true;

const productDescriptionFallback = "View product details, images and order information from LM Dkbrand.";
const riskyTermPattern = /\b(replica|fake|1:1|aaa)\b|原单|顶级复刻/i;

function safeSeoText(value: string | null | undefined, fallback: string) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text || riskyTermPattern.test(text)) return fallback;
  return text;
}

function productTitle(product: CatalogProduct) {
  const seo = product.seo_content;
  return safeSeoText(seo?.seo_title || seo?.display_title || product.title_en, "Product");
}

function productDescription(product: CatalogProduct) {
  const seo = product.seo_content;
  return safeSeoText(
    seo?.seo_description || seo?.product_overview || product.description_en,
    productDescriptionFallback,
  ).slice(0, 300);
}

function productImages(product: CatalogProduct) {
  return Array.from(
    new Set([product.main_image_url, ...product.gallery_image_urls].map(safeAbsoluteUrl).filter(Boolean)),
  );
}

function productUrl(product: CatalogProduct, slug: string) {
  return buildCanonical(`/catalog/${product.slug || slug}`);
}

const getCachedProductBySlug = cache(async (slug: string) => {
  try {
    return await getCatalogProductBySlug(slug);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("D1 product API failed: 404") || message.includes("Product not found")) {
      return null;
    }
    throw error;
  }
});

export async function generateStaticParams() {
  return [];
}

// SEO metadata uses the joined product_seo_content row when present, otherwise
// falls back to the legacy product title / description. Never overwrites the
// underlying products.title / products.description columns.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product) return {};
  const seo = product.seo_content;
  const title = productTitle(product);
  const description = productDescription(product);
  const canonical = productUrl(product, slug);
  const image = safeAbsoluteUrl(product.main_image_url);
  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
      images: image ? [{ url: image, alt: seo?.image_alt || product.title_en }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const galleryImages = product.gallery_image_urls.length > 0
    ? product.gallery_image_urls
    : product.main_image_url
      ? [product.main_image_url]
      : [];
  const galleryThumbnails = product.gallery_thumbnail_urls.length > 0
    ? product.gallery_thumbnail_urls
    : product.main_thumbnail_url
      ? [product.main_thumbnail_url]
      : galleryImages;

  const seo = product.seo_content;
  const galleryAlt = seo?.image_alt || product.title_en;
  const title = productTitle(product);
  const description = productDescription(product);
  const canonical = productUrl(product, slug);
  const images = productImages(product);
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description,
    sku: product.product_code,
    category: product.category,
    image: images,
    brand: {
      "@type": "Brand",
      name: "LM Dkbrand",
    },
    url: canonical,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: buildCanonical("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Catalog",
        item: buildCanonical("/catalog"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.category,
        item: buildCanonical(`/catalog?category=${encodeURIComponent(product.category)}`),
      },
      {
        "@type": "ListItem",
        position: 4,
        name: title,
        item: canonical,
      },
    ],
  };

  return (
    <main className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdStringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdStringify(breadcrumbJsonLd) }}
      />
      <section className="section-pad">
        <div className="container-page">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-gold" href="/catalog">
            <ArrowLeft size={16} />
            Back to catalog
          </Link>

          <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_0.82fr] lg:gap-10">
            <ProductImageGallery images={galleryImages} thumbnailImages={galleryThumbnails} title={galleryAlt} />

            <div className="lg:pt-4">
              {seo ? <SeoShortCard product={product} seo={seo} /> : <LegacyDetail product={product} />}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// New short-card layout used whenever the product has an approved row in
// product_seo_content. Order, copy, and structure match the panel preview.
function SeoShortCard({ product, seo }: { product: CatalogProduct; seo: CatalogSeoContent }) {
  const oneLiner = (seo.short_subtitle || seo.product_overview || "").trim();
  const orderInfo = seo.order_information.length ? seo.order_information.join(" · ") : "";
  return (
    <>
      <p className="eyebrow">{product.category}</p>
      <h1 className="mt-3 font-serif text-2xl leading-tight text-ink sm:text-4xl">
        {seo.display_title || product.title_en}
      </h1>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded bg-paper px-3 py-2 text-sm font-bold text-ink">{product.product_code}</span>
      </div>
      {oneLiner ? (
        <p className="mt-5 text-sm leading-6 text-muted sm:text-base sm:leading-7">{oneLiner}</p>
      ) : null}

      {seo.material_details.length > 0 ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs uppercase tracking-wide text-muted">Key Details</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-ink">
            {seo.material_details.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {seo.size_note ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs uppercase tracking-wide text-muted">Size / Color</p>
          <p className="mt-1 text-sm font-semibold text-ink">{seo.size_note}</p>
        </div>
      ) : null}

      {orderInfo ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs uppercase tracking-wide text-muted">Order Info</p>
          <p className="mt-1 text-sm text-ink">{orderInfo}</p>
        </div>
      ) : null}

      {seo.how_to_ask ? (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs uppercase tracking-wide text-muted">Ask for Details</p>
          <p className="mt-1 rounded-lg bg-paper px-4 py-3 text-sm leading-6 text-muted">{seo.how_to_ask}</p>
        </div>
      ) : null}
    </>
  );
}

// Legacy layout — unchanged from before. Used when no SEO content has been
// published for this product yet, so existing items keep working.
function LegacyDetail({ product }: { product: CatalogProduct }) {
  return (
    <>
      <p className="eyebrow">{product.category}</p>
      <h1 className="mt-3 font-serif text-2xl leading-tight text-ink sm:text-4xl">
        {product.title_en}
      </h1>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="rounded bg-paper px-3 py-2 text-sm font-bold text-ink">{product.product_code}</span>
      </div>
      <p className="mt-5 text-sm leading-6 text-muted sm:text-base sm:leading-7">{product.description_en}</p>
      <div className="mt-5 space-y-2 border-y border-line py-4 text-sm font-semibold text-ink">
        <p>Sizes: As per product description.</p>
        <p>Colors: Common / varies by batch.</p>
        <p>Delivery: {product.delivery_time || "7-12 business days"}.</p>
      </div>
      <p className="mt-5 rounded-lg bg-paper px-4 py-3 text-sm leading-6 text-muted">
        Save the product ID or screenshot this page, then contact our team separately for price, size, color, and delivery details.
      </p>
    </>
  );
}
