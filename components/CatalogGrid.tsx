"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { categories } from "@/data/products";
import type { CatalogProduct } from "@/lib/products";

const pageSize = 24;
const filters = ["All", ...categories];

export function CatalogGrid({
  onlyNew = false,
  initialCategory = "All",
  products,
}: {
  onlyNew?: boolean;
  initialCategory?: string;
  products: CatalogProduct[];
}) {
  const [filter, setFilter] = useState(initialCategory);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const filteredProducts = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesNew = onlyNew ? product.badge === "New" || product.is_featured : true;
      const matchesFilter = filter === "All" ? true : product.category === filter;
      const matchesQuery = cleanQuery
        ? `${product.product_code} ${product.title_en}`.toLowerCase().includes(cleanQuery)
        : true;
      return matchesNew && matchesFilter && matchesQuery;
    });
  }, [filter, onlyNew, query]);

  const visibleProducts = filteredProducts.slice(0, visibleCount);

  return (
    <div className="mt-7">
      <div className="grid gap-3 rounded-lg border border-line bg-paper p-3 lg:grid-cols-[1fr_auto]">
        <label className="flex min-h-11 items-center gap-3 rounded border border-line bg-white px-4">
          <Search size={18} className="text-muted" />
          <input
            aria-label="Search product ID or title"
            className="w-full bg-transparent text-sm outline-none"
            onChange={(event) => {
              setQuery(event.target.value);
              setVisibleCount(pageSize);
            }}
            value={query}
          />
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <button
              aria-pressed={filter === item}
              className="min-h-10 shrink-0 rounded border border-line bg-white px-3 text-xs font-bold text-muted aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white sm:text-sm"
              key={item}
              onClick={() => {
                setFilter(item);
                setVisibleCount(pageSize);
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:gap-4 xl:grid-cols-5">
        {visibleProducts.map((product) => (
          <ProductCard
            product={product}
            key={product.product_code}
          />
        ))}
      </div>

      {visibleProducts.length < filteredProducts.length ? (
        <div className="mt-10 text-center">
          <button
            className="btn-secondary"
            onClick={() => setVisibleCount((count) => count + pageSize)}
            type="button"
          >
            Load more
          </button>
        </div>
      ) : null}
    </div>
  );
}
