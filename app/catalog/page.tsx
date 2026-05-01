import { CatalogGrid } from "@/components/CatalogGrid";
import { SectionHeading } from "@/components/SectionHeading";
import { getCatalogProducts } from "@/lib/products";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const products = await getCatalogProducts();

  return (
    <main className="bg-white">
      <section className="section-pad">
        <div className="container-page">
          <SectionHeading
            eyebrow="Catalog"
            title="Shop Apparel, Shoes, Watches & Bags"
            text="Browse selected factory-direct products for retail and wholesale orders. Search by product ID or title, then send the product ID for current price and delivery details."
          />
          <CatalogGrid initialCategory={params?.category || "All"} products={products} />
        </div>
      </section>
    </main>
  );
}
