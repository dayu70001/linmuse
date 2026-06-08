import type { Metadata } from "next";
import { CatalogGrid } from "@/components/CatalogGrid";
import { SectionHeading } from "@/components/SectionHeading";
import { getCatalogProducts } from "@/lib/products";
import { buildCanonical, SITE_NAME } from "@/lib/seo";
import { headers } from "next/headers";
import { Suspense } from "react";

const title = "New Arrivals | LM Dkbrand";
const description =
  "Explore the latest LM Dkbrand arrivals across apparel, shoes, watches, bags and accessories for retail and wholesale buyers.";
const canonical = buildCanonical("/new-arrivals");

export const metadata: Metadata = {
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
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

function getPageSize(userAgent: string, mobileHint: string | null) {
  return mobileHint === "?1" || /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent) ? 20 : 25;
}

export default async function NewArrivalsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    category?: string;
    subcategory?: string;
    brand?: string;
    model?: string;
    search?: string;
    page?: string;
  }>;
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
    onlyNew: true,
  });

  return (
    <main className="overflow-x-hidden bg-white">
      <section className="section-pad">
        <div className="container-page">
          <SectionHeading
            eyebrow="New arrivals"
            title="Latest Curated Products"
            text="A focused view of the latest selected products for retail and wholesale buyers."
          />
          <Suspense fallback={null}>
            <CatalogGrid catalog={catalog} onlyNew />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
