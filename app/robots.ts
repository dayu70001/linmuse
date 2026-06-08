import type { MetadataRoute } from "next";

const siteUrl = "https://linmuse.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/catalog*",
          "/new-arrivals*",
          "/shipping-proof*",
          "/wholesale-guide*",
          "/contact*",
          "/catalog/*",
          "/_next/*",
          "/favicon.ico",
        ],
        disallow: [
          "/admin*",
          "/homepage-admin*",
          "/api/admin*",
          "/api/upload*",
          "/api/update*",
          "/api/write*",
        ],
      },
    ],
    sitemap: [`${siteUrl}/sitemap.xml`, `${siteUrl}/sitemap-products.xml`],
  };
}
