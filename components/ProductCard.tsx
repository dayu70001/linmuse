import Link from "next/link";
import type { Product } from "@/data/products";
import type { CatalogProduct } from "@/lib/products";

export function ProductCard({
  product,
  imageOverride,
}: {
  product: Product | CatalogProduct;
  imageOverride?: string;
}) {
  const productCode = "product_code" in product ? product.product_code : product.id;
  const title = "title_en" in product ? product.title_en : product.title;
  const mainImage = imageOverride || ("main_thumbnail_url" in product ? product.main_thumbnail_url || product.main_image_url || "" : product.mainImage);

  return (
    <article className="overflow-hidden rounded-lg border border-line/60 bg-white transition duration-200 hover:border-gold/70">
      <Link href={`/catalog/${product.slug}`} className="block bg-paper">
        <img
          src={mainImage}
          alt={title}
          className="aspect-square w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <div className="grid gap-1 px-2.5 py-2.5 sm:px-3">
          <div className="grid gap-0.5 text-[10px] font-bold uppercase tracking-wide sm:flex sm:items-center sm:justify-between sm:gap-2 sm:text-[11px]">
            <span className="truncate text-muted">{productCode}</span>
            <span className="text-gold">{product.category}</span>
          </div>
          <h3 className="line-clamp-2 min-h-8 text-xs font-semibold leading-snug text-ink sm:text-sm">
            {title}
          </h3>
        </div>
      </Link>
    </article>
  );
}
