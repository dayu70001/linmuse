import type { MetadataRoute } from "next";

const siteUrl = "https://linmuse.com";

const urls = [
  "/",
  "/catalog",
  "/new-arrivals",
  "/shipping-proof",
  "/wholesale-guide",
  "/contact",
  "/catalog?category=Apparel",
  "/catalog?category=Shoes",
  "/catalog?category=Watches",
  "/catalog?category=Bags",
  "/catalog?category=Accessories",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return urls.map((url) => ({
    url: `${siteUrl}${url}`,
  }));
}
