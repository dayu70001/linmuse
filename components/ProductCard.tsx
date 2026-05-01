import { MessageCircle } from "lucide-react";
import Link from "next/link";
import type { Product } from "@/data/products";
import type { CatalogProduct } from "@/lib/products";
import { productInquiryUrl } from "@/lib/whatsapp";

export function ProductCard({
  product,
  imageOverride,
  inquiryHref,
}: {
  product: Product | CatalogProduct;
  imageOverride?: string;
  inquiryHref?: string;
}) {
  const productCode = "product_code" in product ? product.product_code : product.id;
  const title = "title_en" in product ? product.title_en : product.title;
  const mainImage = imageOverride || ("main_thumbnail_url" in product ? product.main_thumbnail_url || product.main_image_url || "" : product.mainImage);
  const badge = product.badge || "New";
  const moq = product.moq || "From 1 piece";

  return (
    <article className="card overflow-hidden transition duration-200 hover:border-gold/70">
      <Link href={`/catalog/${product.slug}`} className="relative block bg-paper">
        <div className="absolute m-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-ink">
          {badge}
        </div>
        <img
          src={mainImage}
          alt={title}
          className="aspect-square w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      </Link>
      <div className="grid gap-3 p-3 sm:p-4">
        <div className="grid gap-1 text-xs font-bold uppercase tracking-wide min-[430px]:flex min-[430px]:items-center min-[430px]:justify-between min-[430px]:gap-3">
          <span className="text-muted">{productCode}</span>
          <span className="text-gold">{product.category}</span>
        </div>
        <Link href={`/catalog/${product.slug}`}>
          <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug text-ink sm:text-base">
            {title}
          </h3>
        </Link>
        <div className="flex flex-col gap-3 border-t border-line/70 pt-3 min-[430px]:flex-row min-[430px]:items-center min-[430px]:justify-between">
          <span className="text-xs font-bold text-muted">Order: {moq}</span>
          <Link className="inline-flex min-h-10 items-center justify-center gap-1 rounded bg-ink px-3 py-2 text-xs font-bold text-white transition hover:bg-gold hover:text-ink" href={inquiryHref || productInquiryUrl(product)}>
            <MessageCircle size={15} />
            Ask Price
          </Link>
        </div>
      </div>
    </article>
  );
}
