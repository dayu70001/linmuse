"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type AdminProductRow,
  fetchAdminProducts,
  updateAdminProduct,
} from "@/lib/supabaseRest";

export function ProductReview() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadProducts() {
    setLoading(true);
    setMessage("");
    try {
      setProducts(await fetchAdminProducts());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleProduct(product: AdminProductRow, field: "is_active" | "is_featured") {
    setMessage("");
    try {
      const nextValue = !product[field];
      await updateAdminProduct(product.product_code, { [field]: nextValue });
      setProducts((items) =>
        items.map((item) =>
          item.product_code === product.product_code ? { ...item, [field]: nextValue } : item
        )
      );
      setMessage(`${product.product_code} updated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product update failed.");
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <section className="container-page py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Product review</p>
          <h1 className="mt-3 font-serif text-4xl text-ink">Imported Products</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Review imported products before publishing them to the public catalog.
          </p>
        </div>
        <button className="btn-secondary" onClick={loadProducts} type="button">
          Refresh
        </button>
      </div>

      {message ? (
        <div className="mt-6 rounded-lg border border-line bg-white px-4 py-3 text-sm text-muted">
          {message}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 rounded-lg bg-white p-6 text-sm text-muted">Loading products...</div>
      ) : null}

      {!loading && products.length === 0 ? (
        <div className="mt-8 rounded-lg bg-white p-6 text-sm text-muted">
          No imported products found yet.
        </div>
      ) : null}

      <div className="mt-8 grid gap-4">
        {products.map((product) => (
          <article
            className="grid gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center"
            key={product.product_code}
          >
            <div className="overflow-hidden rounded-lg bg-paper">
              {product.main_thumbnail_url || product.main_image_url ? (
                <img
                  src={product.main_thumbnail_url || product.main_image_url || ""}
                  alt={product.title_en}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-square" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
                <span className="text-muted">{product.product_code}</span>
                <span className="text-gold">{product.category}</span>
                <span className="rounded bg-paper px-2 py-1 text-ink">{product.status || "draft"}</span>
                <span className={`rounded px-2 py-1 ${product.is_active ? "bg-ink text-white" : "bg-paper text-muted"}`}>
                  {product.is_active ? "Active" : "Hidden"}
                </span>
              </div>
              <h2 className="mt-2 font-serif text-2xl leading-tight text-ink">{product.title_en}</h2>
              <Link className="mt-2 inline-block text-sm font-bold text-gold" href={`/catalog/${product.slug}`}>
                View product page
              </Link>
            </div>

            <div className="flex flex-col gap-2 sm:min-w-44">
              <button
                className={product.is_active ? "btn-secondary" : "btn-primary"}
                onClick={() => toggleProduct(product, "is_active")}
                type="button"
              >
                {product.is_active ? "Deactivate" : "Activate"}
              </button>
              <button
                className="min-h-11 rounded border border-line bg-white px-4 text-sm font-bold text-ink transition hover:border-gold"
                onClick={() => toggleProduct(product, "is_featured")}
                type="button"
              >
                {product.is_featured ? "Unmark Featured" : "Mark Featured"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
