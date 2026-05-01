"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  type AdminProductRow,
  fetchAdminProducts,
  updateAdminProduct,
  updateAdminProductsByBatch,
  updateAdminProductsByCodes,
} from "@/lib/supabaseRest";

type ActiveFilter = "all" | "active" | "hidden";

function latestBatchId(products: AdminProductRow[]) {
  return products
    .filter((product) => product.import_batch_id)
    .sort((a, b) => {
      const left = new Date(a.imported_at || a.created_at || 0).getTime();
      const right = new Date(b.imported_at || b.created_at || 0).getTime();
      return right - left;
    })[0]?.import_batch_id || "";
}

function updateProductsLocally(
  products: AdminProductRow[],
  productCodes: string[],
  updates: Partial<AdminProductRow>
) {
  const selected = new Set(productCodes);
  return products.map((product) =>
    selected.has(product.product_code) ? { ...product, ...updates } : product
  );
}

export function ProductReview() {
  const [products, setProducts] = useState<AdminProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [batch, setBatch] = useState("all");

  async function loadProducts() {
    setLoading(true);
    setMessage("");
    try {
      const rows = await fetchAdminProducts();
      setProducts(rows);
      const latest = latestBatchId(rows);
      if (latest && batch === "all") {
        setBatch(latest);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  const batches = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.import_batch_id || "").filter(Boolean)));
  }, [products]);

  const latestBatch = useMemo(() => latestBatchId(products), [products]);

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      if (category !== "all" && product.category !== category) return false;
      if (status !== "all" && (product.status || "draft") !== status) return false;
      if (active === "active" && !product.is_active) return false;
      if (active === "hidden" && product.is_active) return false;
      if (batch !== "all" && product.import_batch_id !== batch) return false;
      return true;
    });
  }, [active, batch, category, products, status]);

  const visibleCodes = visibleProducts.map((product) => product.product_code);
  const selectedCodes = Array.from(selected);

  function toggleSelected(productCode: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(productCode)) next.delete(productCode);
      else next.add(productCode);
      return next;
    });
  }

  async function toggleProduct(product: AdminProductRow, field: "is_active" | "is_featured") {
    setMessage("");
    try {
      const nextValue = !product[field];
      await updateAdminProduct(product.product_code, { [field]: nextValue });
      setProducts((items) => updateProductsLocally(items, [product.product_code], { [field]: nextValue }));
      setMessage(`${product.product_code} updated.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product update failed.");
    }
  }

  async function applyToSelected(updates: Partial<AdminProductRow>, label: string) {
    if (selectedCodes.length === 0) {
      setMessage("Select products first.");
      return;
    }
    setMessage("");
    try {
      await updateAdminProductsByCodes(selectedCodes, updates);
      setProducts((items) => updateProductsLocally(items, selectedCodes, updates));
      setMessage(`${label}: ${selectedCodes.length} products updated.`);
      setSelected(new Set());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Batch update failed.");
    }
  }

  async function applyToBatch(importBatchId: string, updates: Partial<AdminProductRow>, label: string) {
    if (!importBatchId) {
      setMessage("No import batch found.");
      return;
    }
    setMessage("");
    try {
      const batchCodes = products
        .filter((product) => product.import_batch_id === importBatchId)
        .map((product) => product.product_code);
      await updateAdminProductsByBatch(importBatchId, updates);
      setProducts((items) => updateProductsLocally(items, batchCodes, updates));
      setMessage(`${label}: ${batchCodes.length} products updated.`);
      setSelected(new Set());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Batch update failed.");
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="container-page py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Product review</p>
          <h1 className="mt-3 font-serif text-4xl text-ink">Imported Products</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Review imported batches, then publish selected products when they are ready.
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

      <div className="mt-6 grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-5">
        <select className="rounded border border-line bg-white px-3 py-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="all">All categories</option>
          {Array.from(new Set(products.map((product) => product.category))).map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <select className="rounded border border-line bg-white px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="needs_review">Needs review</option>
        </select>
        <select className="rounded border border-line bg-white px-3 py-2 text-sm" value={active} onChange={(event) => setActive(event.target.value as ActiveFilter)}>
          <option value="all">Active + hidden</option>
          <option value="active">Active only</option>
          <option value="hidden">Hidden only</option>
        </select>
        <select className="rounded border border-line bg-white px-3 py-2 text-sm" value={batch} onChange={(event) => setBatch(event.target.value)}>
          <option value="all">All batches</option>
          {batches.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <button className="btn-secondary" type="button" onClick={() => latestBatch && setBatch(latestBatch)}>
          Show latest import batch
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-secondary" type="button" onClick={() => setSelected(new Set(visibleCodes))}>
          Select visible
        </button>
        <button
          className="btn-secondary"
          type="button"
          onClick={() => setSelected(new Set(products.filter((product) => product.import_batch_id === (batch === "all" ? latestBatch : batch)).map((product) => product.product_code)))}
        >
          Select current batch
        </button>
        <button className="btn-primary" type="button" onClick={() => applyToSelected({ is_active: true, status: "published" }, "Activated selected")}>
          Activate selected
        </button>
        <button className="btn-secondary" type="button" onClick={() => applyToSelected({ is_active: false, status: "draft" }, "Hidden selected")}>
          Hide selected
        </button>
        <button className="btn-secondary" type="button" onClick={() => applyToSelected({ is_featured: true }, "Featured selected")}>
          Mark selected featured
        </button>
        <button className="btn-primary" type="button" onClick={() => applyToBatch(latestBatch, { is_active: true, status: "published" }, "Activated latest batch")}>
          Activate latest batch
        </button>
        <button className="btn-secondary" type="button" onClick={() => applyToBatch(latestBatch, { is_active: false, status: "draft" }, "Hidden latest batch")}>
          Hide latest batch
        </button>
        <span className="px-2 py-3 text-xs font-bold uppercase tracking-wide text-muted">
          Selected {selected.size} / Visible {visibleProducts.length}
        </span>
      </div>

      {loading ? (
        <div className="mt-8 rounded-lg bg-white p-6 text-sm text-muted">Loading products...</div>
      ) : null}

      {!loading && visibleProducts.length === 0 ? (
        <div className="mt-8 rounded-lg bg-white p-6 text-sm text-muted">
          No products match the current filters.
        </div>
      ) : null}

      <div className="mt-8 grid gap-4">
        {visibleProducts.map((product) => (
          <article
            className="grid gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-[auto_96px_1fr_auto] sm:items-center"
            key={product.product_code}
          >
            <label className="flex h-11 w-11 items-center justify-center">
              <input
                checked={selected.has(product.product_code)}
                className="h-5 w-5 accent-gold"
                onChange={() => toggleSelected(product.product_code)}
                type="checkbox"
              />
            </label>

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
                {product.import_batch_id ? (
                  <span className="rounded bg-paper px-2 py-1 text-muted">{product.import_batch_id}</span>
                ) : null}
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
