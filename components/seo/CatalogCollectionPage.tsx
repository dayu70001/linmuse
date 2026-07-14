import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { SeoBreadcrumbs } from "@/components/seo/SeoBreadcrumbs";
import { SeoFaq } from "@/components/seo/SeoFaq";
import type { CatalogCollectionConfig } from "@/lib/catalogCollections";
import { getCatalogCollectionProducts } from "@/lib/products";
import {
  buildBreadcrumbJsonLd,
  buildCanonical,
  buildFaqJsonLd,
  jsonLdStringify,
  SITE_NAME,
} from "@/lib/seo";

export type CollectionPageParam = string | string[] | undefined;

function parseCollectionPage(value: CollectionPageParam) {
  if (value === undefined) return 1;
  if (Array.isArray(value) || !/^[1-9]\d*$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

export function createCatalogCollectionMetadata(
  config: CatalogCollectionConfig,
  rawPage?: CollectionPageParam,
): Metadata {
  const page = parseCollectionPage(rawPage);
  const pageSuffix = page && page > 1 ? ` - Page ${page}` : "";
  const title = pageSuffix
    ? `${config.h1} Collection${pageSuffix} | LM Dkbrand`
    : config.title;
  const path = page && page > 1 ? `/catalog/${config.slug}?page=${page}` : `/catalog/${config.slug}`;
  const canonical = buildCanonical(path);
  return {
    title,
    description: config.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: config.description,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description: config.description },
    robots: { index: true, follow: true },
  };
}

function paginationHref(config: CatalogCollectionConfig, page: number) {
  return page <= 1 ? `/catalog/${config.slug}` : `/catalog/${config.slug}?page=${page}`;
}

export async function CatalogCollectionPage({
  config,
  page,
}: {
  config: CatalogCollectionConfig;
  page?: CollectionPageParam;
}) {
  const requestedPage = parseCollectionPage(page);
  if (requestedPage === null) notFound();
  if (page !== undefined && requestedPage === 1) {
    permanentRedirect(`/catalog/${config.slug}`);
  }

  const collection = await getCatalogCollectionProducts({
    category: config.category,
    subcategories: config.subcategories,
    page: requestedPage,
    pageSize: 25,
  });
  if (requestedPage > collection.totalPages) notFound();
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(config.breadcrumbs);
  const faqJsonLd = buildFaqJsonLd(config.faqs);
  const itemListJsonLd = collection.products.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: collection.products.length,
    itemListElement: collection.products.map((product, index) => ({
      "@type": "ListItem",
      position: (collection.page - 1) * collection.pageSize + index + 1,
      name: product.seo_content?.display_title || product.title_en,
      url: buildCanonical(`/catalog/${product.slug}`),
    })),
  } : null;

  return (
    <main className="overflow-x-hidden bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(faqJsonLd) }} />
      {itemListJsonLd ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(itemListJsonLd) }} />
      ) : null}

      <section className="section-pad">
        <div className="container-page max-w-4xl">
          <SeoBreadcrumbs items={config.breadcrumbs} />
          <div className="mt-7 max-w-3xl">
            <p className="eyebrow">{config.eyebrow}</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">{config.h1}</h1>
            <p className="mt-5 text-base leading-7 text-muted">{config.intro}</p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link className="btn-primary" href={config.wholesalePage.href}>{config.wholesalePage.label}</Link>
            <Link className="btn-secondary" href="/catalog">Full Catalog</Link>
            <Link className="btn-secondary" href={config.catalogPage.href}>{config.catalogPage.label}</Link>
          </div>

          <div className="mt-10 grid gap-8">
            {config.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-serif text-2xl text-ink sm:text-3xl">{section.heading}</h2>
                <div className="mt-3 grid gap-3">
                  {section.paragraphs.map((paragraph) => (
                    <p className="text-sm leading-7 text-muted sm:text-base" key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper" aria-labelledby={`${config.slug}-products`}>
        <div className="container-page">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Live catalog</p>
              <h2 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl" id={`${config.slug}-products`}>
                Browse Current Products
              </h2>
            </div>
            <p className="text-sm font-semibold text-muted">{collection.total} matching products</p>
          </div>

          {collection.products.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {collection.products.map((product) => <ProductCard key={product.product_code} product={product} />)}
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-line bg-white p-6 text-center text-sm font-semibold text-muted">
              This collection is being updated. Browse the full catalog or check again later.
            </div>
          )}

          {collection.totalPages > 1 ? (
            <nav aria-label="Collection pagination" className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {collection.page > 1 ? <Link className="btn-secondary" href={paginationHref(config, collection.page - 1)}>Previous</Link> : null}
              <span className="text-sm font-semibold text-muted">Page {collection.page} of {collection.totalPages}</span>
              {collection.page < collection.totalPages ? <Link className="btn-secondary" href={paginationHref(config, collection.page + 1)}>Next</Link> : null}
            </nav>
          ) : null}
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page max-w-3xl">
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">Collection Questions</h2>
          <SeoFaq items={config.faqs} />
        </div>
      </section>
    </main>
  );
}
