import { CatalogGrid } from "@/components/CatalogGrid";
import { SectionHeading } from "@/components/SectionHeading";
import { getCatalogProducts } from "@/lib/products";
import { Suspense } from "react";

export default async function NewArrivalsPage() {
  const products = await getCatalogProducts();

  return (
    <main className="bg-white">
      <section className="section-pad">
        <div className="container-page">
          <SectionHeading
            eyebrow="New arrivals"
            title="Latest Curated Products"
            text="A focused view of newly selected apparel, shoes, watches, and bags for retail and wholesale buyers."
          />
          <Suspense fallback={null}>
            <CatalogGrid onlyNew products={products} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
