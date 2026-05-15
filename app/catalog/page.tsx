import { CatalogGrid } from "@/components/CatalogGrid";
import { SectionHeading } from "@/components/SectionHeading";
import { getCatalogProducts } from "@/lib/products";
import { headers } from "next/headers";
import { Suspense } from "react";

function getPageSize(userAgent: string, mobileHint: string | null) {
  return mobileHint === "?1" || /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent) ? 20 : 25;
}

export default async function CatalogPage({
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
