import { CatalogGrid } from "@/components/CatalogGrid";
import { SectionHeading } from "@/components/SectionHeading";
import { getCatalogProducts } from "@/lib/products";
import { Suspense } from "react";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const products = await getCatalogProducts(params?.category);

  return (
    <main className="bg-white">
      <section className="section-pad">
        <div className="container-page">
          <SectionHeading
            eyebrow="Catalog"
            title="Shop Apparel, Shoes, Watches & Bags"
            text="Browse selected factory-direct products for retail and wholesale orders. Search by product ID or title, then save the product ID or screenshot for later."
          />
          <Suspense fallback={null}>
            <CatalogGrid initialCategory={params?.category || "All"} products={products} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
