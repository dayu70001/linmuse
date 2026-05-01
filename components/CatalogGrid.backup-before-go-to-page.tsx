"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { categories } from "@/data/products";
import type { CatalogProduct } from "@/lib/products";

const pageSize = 25;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gridTopRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState(initialCategory);
  const [query, setQuery] = useState("");
  const pageFromUrl = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const [currentPage, setCurrentPage] = useState(pageFromUrl);

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

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  function updateUrl(nextPage: number, nextCategory = filter) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    if (nextCategory && nextCategory !== "All") {
      params.set("category", nextCategory);
    } else {
      params.delete("category");
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function goToPage(nextPage: number) {
    const bounded = Math.min(Math.max(1, nextPage), totalPages);
    setCurrentPage(bounded);
    updateUrl(bounded);
    window.requestAnimationFrame(() => {
      gridTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const pageItems = useMemo(() => {
    const pages = new Set<number>([1, totalPages, safePage - 1, safePage, safePage + 1]);
    if (totalPages <= 5) {
      for (let page = 1; page <= totalPages; page += 1) pages.add(page);
    }
    const sorted = Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
    const items: Array<number | "..."> = [];
    sorted.forEach((page, index) => {
      const previous = sorted[index - 1];
      if (previous && page - previous > 1) items.push("...");
      items.push(page);
    });
    return items;
  }, [safePage, totalPages]);

  useEffect(() => {
    setCurrentPage(pageFromUrl);
  }, [pageFromUrl]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      updateUrl(totalPages);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages]);

  return (
    <div className="mt-7" ref={gridTopRef}>
      <div className="grid gap-3 rounded-lg border border-line bg-paper p-3 lg:grid-cols-[1fr_auto]">
        <label className="flex min-h-11 items-center gap-3 rounded border border-line bg-white px-4">
          <Search size={18} className="text-muted" />
          <input
            aria-label="Search product ID or title"
            className="w-full bg-transparent text-sm outline-none"
            onChange={(event) => {
              setQuery(event.target.value);
              setCurrentPage(1);
              updateUrl(1);
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
                setCurrentPage(1);
                updateUrl(1, item);
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

      {filteredProducts.length > pageSize ? (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <button
            className="min-h-10 rounded border border-line bg-white px-3 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
            disabled={safePage === 1}
            onClick={() => goToPage(safePage - 1)}
            type="button"
          >
            Previous
          </button>
          {pageItems.map((item, index) =>
            item === "..." ? (
              <span className="px-1 text-xs text-muted" key={`ellipsis-${index}`}>...</span>
            ) : (
              <button
                aria-current={safePage === item ? "page" : undefined}
                className="hidden min-h-10 min-w-10 rounded border border-line bg-white px-2 text-xs font-bold text-muted aria-current:border-ink aria-current:bg-ink aria-current:text-white sm:block sm:text-sm"
                key={item}
                onClick={() => goToPage(item)}
                type="button"
              >
                {item}
              </button>
            )
          )}
          {pageItems
            .filter((item): item is number => typeof item === "number" && Math.abs(item - safePage) <= 1)
            .map((item) => (
              <button
                aria-current={safePage === item ? "page" : undefined}
                className="min-h-10 min-w-9 rounded border border-line bg-white px-2 text-xs font-bold text-muted aria-current:border-ink aria-current:bg-ink aria-current:text-white sm:hidden"
                key={`mobile-${item}`}
                onClick={() => goToPage(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          <button
            className="min-h-10 rounded border border-line bg-white px-3 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:text-sm"
            disabled={safePage === totalPages}
            onClick={() => goToPage(safePage + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
