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
  "/catalog/wholesale-t-shirts",
  "/catalog/wholesale-jackets-coats",
  "/catalog/wholesale-sneakers",
  "/catalog/wholesale-handbags",
  "/catalog/wholesale-tote-bags",
  "/catalog/wholesale-crossbody-bags",
  "/guides",
  "/wholesale-clothing",
  "/wholesale-shoes",
  "/wholesale-bags",
  "/wholesale-watches",
  "/factory-direct-fashion",
  "/small-order-wholesale",
  "/boutique-fashion-supplier",
  "/wholesale-fashion-europe",
  "/how-to-choose-a-wholesale-supplier",
  "/how-to-start-a-boutique",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return urls.map((url) => ({
    url: `${siteUrl}${url}`,
  }));
}
