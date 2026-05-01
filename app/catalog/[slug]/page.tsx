import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/data/products";
import { ProductImageGallery } from "@/components/ProductImageGallery";
import { getCatalogProductBySlug } from "@/lib/products";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);

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

  return (
    <main className="bg-white">
      <section className="section-pad">
        <div className="container-page">
          <Link className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-gold" href="/catalog">
            <ArrowLeft size={16} />
            Back to catalog
          </Link>

          <div className="mt-6 grid gap-7 lg:grid-cols-[1fr_0.82fr] lg:gap-10">
            <ProductImageGallery images={galleryImages} thumbnailImages={galleryThumbnails} title={product.title_en} />

            <div className="lg:pt-4">
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
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
