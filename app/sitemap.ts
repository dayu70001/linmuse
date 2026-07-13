import type { MetadataRoute } from "next";

const siteUrl = "https://linmuse.com";

const urls = [
  "/",
  "/catalog",
  "/new-arrivals",
  "/shipping-proof",
  "/wholesale-guide",
  "/contact",
  "/catalog/bags",
  "/catalog?category=Apparel",
  "/catalog?category=Shoes",
  "/catalog?category=Watches",
  "/catalog?category=Bags",
  "/catalog?category=Accessories",
  "/guides",
  "/wholesale-clothing",
  "/wholesale-shoes",
  "/wholesale-bags",
  "/wholesale-watches",
  "/factory-direct-fashion",
  "/small-order-wholesale",
  "/boutique-fashion-supplier",
  "/wholesale-fashion-europe",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return urls.map((url) => ({
    url: `${siteUrl}${url}`,
  }));
}
