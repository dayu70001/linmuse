import { siteConfig } from "@/config/site";
import type { Product } from "@/data/products";
import type { CatalogProduct } from "@/lib/products";

export function whatsappUrl(phone: string, message: string) {
  if (!phone) {
    return "/contact";
  }
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function productInquiryUrl(product: Product | CatalogProduct) {
  const productCode = "product_code" in product ? product.product_code : product.id;

  return whatsappUrl(
    siteConfig.whatsappWholesale,
    `Hello, I want to ask about this product: ${productCode}.`
  );
}
