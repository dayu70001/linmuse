import type { Metadata } from "next";
import { CatalogGrid } from "@/components/CatalogGrid";
import { SectionHeading } from "@/components/SectionHeading";
import { getCatalogProducts } from "@/lib/products";
import { buildCanonical, SITE_NAME } from "@/lib/seo";
import { headers } from "next/headers";
import { Suspense } from "react";

type CatalogSearchParams = {
  category?: string;
  subcategory?: string;
  brand?: string;
  model?: string;
  search?: string;
  page?: string;
};

const categoryTitles: Record<string, string> = {
  Apparel: "Apparel Catalog | LM Dkbrand",
  Shoes: "Shoes Catalog | LM Dkbrand",
  Watches: "Watches Catalog | LM Dkbrand",
  Bags: "Bags Catalog | LM Dkbrand",
  Accessories: "Accessories Catalog | LM Dkbrand",
};

const catalogDescription =
  "Browse LM Dkbrand apparel, shoes, watches, bags and accessories by category and product code for retail and wholesale inquiries.";

function catalogTitle(category: string | undefined) {
  return category && categoryTitles[category] ? categoryTitles[category] : "Catalog | LM Dkbrand";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<CatalogSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const title = catalogTitle(params?.category);
  const canonical = buildCanonical("/catalog");
  const hasSearch = Boolean(String(params?.search || "").trim());

  return {
    title,
    description: catalogDescription,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description: catalogDescription,
      url: canonical,
      siteName: SITE_NAME,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: catalogDescription,
    },
    robots: {
      index: !hasSearch,
      follow: true,
    },
  };
}

function getPageSize(userAgent: string, mobileHint: string | null) {
  return mobileHint === "?1" || /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent) ? 20 : 25;
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const headerList = await headers();
  const catalog = await getCatalogProducts({
    category: params?.category,
    subcategory: params?.subcategory,
    brand: params?.brand,
    model: params?.model,
    search: params?.search,
    page: params?.page,
    pageSize: getPageSize(headerList.get("user-agent") || "", headerList.get("sec-ch-ua-mobile")),
  });

  return (
    <main className="overflow-x-hidden bg-white">
      <section className="section-pad">
        <div className="container-page">
          <SectionHeading
            eyebrow="Catalog"
            title="Shop Catalog"
            text="Browse selected factory-direct fashion products for retail and wholesale orders. Search by product ID or title, then save the product ID or screenshot for your assigned sales contact."
          />
          <Suspense fallback={null}>
            <CatalogGrid catalog={catalog} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
