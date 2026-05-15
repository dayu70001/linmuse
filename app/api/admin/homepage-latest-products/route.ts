import { NextResponse } from "next/server";
import { HOME_FEATURED_SLOTS } from "@/lib/homepageSettings";
import { getCatalogProducts } from "@/lib/products";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const header = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return header === token;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "管理员 Token 错误或未设置" }, { status: 401 });
  }

  const latest: Record<string, string> = {};
  const products: Record<string, { product_code: string; title_en: string; imported_at?: string | null; created_at?: string | null } | null> = {};

  await Promise.all(
    HOME_FEATURED_SLOTS.map(async (slot) => {
      const catalog = await getCatalogProducts({
        category: slot.category,
        page: 1,
        pageSize: 1,
        onlyNew: true,
      });
      const product = catalog.products[0] || null;
      if (product?.product_code) {
        latest[slot.key] = product.product_code;
        products[slot.key] = {
          product_code: product.product_code,
          title_en: product.title_en,
          imported_at: product.imported_at,
          created_at: product.created_at,
        };
      } else {
        products[slot.key] = null;
      }
    }),
  );

  return NextResponse.json({ ok: true, latest, products });
}
