import { CatalogGrid } from "@/components/CatalogGrid";
import { SectionHeading } from "@/components/SectionHeading";
import { getCatalogProducts } from "@/lib/products";
import { headers } from "next/headers";
import { Suspense } from "react";

function getPageSize(userAgent: string) {
  return /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent) ? 20 : 25;
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
    pageSize: getPageSize(headerList.get("user-agent") || ""),
    onlyNew: true,
  });

  return (
    <main className="overflow-x-hidden bg-white">
      <section className="section-pad">
        <div className="container-page">
          <SectionHeading
            eyebrow="New arrivals"
            title="Latest Curated Products"
            text="A focused view of newly selected apparel, shoes, watches, and bags for retail and wholesale buyers."
          />
          <Suspense fallback={null}>
            <CatalogGrid catalog={catalog} onlyNew />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
