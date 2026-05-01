"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { categories } from "@/data/products";
import type { CatalogProduct } from "@/lib/products";

const DESKTOP_PAGE_SIZE = 25;
const MOBILE_PAGE_SIZE = 21;
const MAX_VISIBLE_PAGES = 5;
const filters = ["All", ...categories];

function getInitialPageSize() {
  if (typeof window === "undefined") return MOBILE_PAGE_SIZE;
  return window.matchMedia("(min-width: 640px)").matches ? DESKTOP_PAGE_SIZE : MOBILE_PAGE_SIZE;
}

export function CatalogGrid({
  onlyNew = false,
  initialCategory = "All",
  products,
}: {
  onlyNew?: boolean;
  initialCategory?: string;
  products: CatalogProduct[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gridTopRef = useRef<HTMLDivElement>(null);

  const pageFromUrl = Math.max(1, Number(searchParams.get("page") || 1) || 1);
  const categoryFromUrl = searchParams.get("category") || initialCategory;

  const [filter, setFilter] = useState(categoryFromUrl);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(pageFromUrl);
  const [jumpPage, setJumpPage] = useState(String(pageFromUrl));
  const [pageSize, setPageSize] = useState(getInitialPageSize);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");

    const updatePageSize = () => {
      setPageSize(media.matches ? DESKTOP_PAGE_SIZE : MOBILE_PAGE_SIZE);
    };

    updatePageSize();

    if (media.addEventListener) {
      media.addEventListener("change", updatePageSize);
      return () => media.removeEventListener("change", updatePageSize);
    }

    media.addListener(updatePageSize);
    return () => media.removeListener(updatePageSize);
  }, []);

  useEffect(() => {
    setCurrentPage(pageFromUrl);
    setJumpPage(String(pageFromUrl));
  }, [pageFromUrl]);

  useEffect(() => {
    setFilter(categoryFromUrl);
  }, [categoryFromUrl]);

  const filteredProducts = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesNew = onlyNew ? product.badge === "New" || product.is_featured : true;
      const matchesFilter = filter === "All" ? true : product.category === filter;
      const matchesQuery = cleanQuery
        ? `${product.product_code} ${product.title_en} ${product.category}`.toLowerCase().includes(cleanQuery)
        : true;

      return matchesNew && matchesFilter && matchesQuery;
    });
  }, [filter, onlyNew, products, query]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleProducts = filteredProducts.slice(startIndex, startIndex + pageSize);

  const pageItems = useMemo(() => {
    const visibleCount = Math.min(MAX_VISIBLE_PAGES, totalPages);
    const half = Math.floor(visibleCount / 2);

    let startPage = Math.max(1, safePage - half);
    let endPage = startPage + visibleCount - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - visibleCount + 1);
    }

    const items: number[] = [];
    for (let page = startPage; page <= endPage; page += 1) {
      items.push(page);
    }

    return items;
  }, [safePage, totalPages]);

  function buildPageHref(nextPage: number, nextCategory = filter) {
    const bounded = Math.min(Math.max(1, nextPage), totalPages);
    const params = new URLSearchParams(searchParams.toString());

    params.set("page", String(bounded));

    if (nextCategory && nextCategory !== "All") {
      params.set("category", nextCategory);
    } else {
      params.delete("category");
    }

    return `${pathname}?${params.toString()}`;
  }

  function updateUrl(nextPage: number, nextCategory = filter) {
    const href = buildPageHref(nextPage, nextCategory);
    router.push(href, { scroll: false });
  }

  function handleFilter(nextFilter: string) {
    setFilter(nextFilter);
    setCurrentPage(1);
    setJumpPage("1");
    updateUrl(1, nextFilter);
  }

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
      setJumpPage(String(totalPages));
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
              setJumpPage("1");
              updateUrl(1);
            }}
            placeholder="Search product ID or title"
            value={query}
          />
        </label>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <button
              aria-pressed={filter === item}
              className="min-h-10 shrink-0 rounded border border-line bg-white px-3 text-xs font-bold text-muted aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-white sm:text-sm"
              key={item}
              onClick={() => handleFilter(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4 lg:grid-cols-5">
        {visibleProducts.map((product) => (
          <ProductCard
            key={product.product_code}
            product={product}
          />
        ))}
      </div>

      {filteredProducts.length > pageSize ? (
        <div className="mt-5 flex max-w-full flex-wrap items-center justify-center gap-1 px-2 sm:mt-8 sm:gap-2 sm:px-0">
          <a
            aria-disabled={safePage === 1}
            className="min-h-8 rounded border border-line bg-white px-1.5 py-2 text-[10px] font-bold text-ink aria-disabled:pointer-events-none aria-disabled:opacity-40 sm:min-h-10 sm:px-4 sm:py-3 sm:text-sm"
            href={buildPageHref(safePage - 1)}
          >
            Previous
          </a>

          {pageItems.map((item) => (
            <a
              aria-current={safePage === item ? "page" : undefined}
              className="min-h-8 min-w-7 rounded border border-line bg-white px-1 py-2 text-center text-[10px] font-bold text-muted aria-current:border-ink aria-current:bg-ink aria-current:text-white sm:min-h-10 sm:min-w-10 sm:px-2 sm:py-3 sm:text-sm"
              href={buildPageHref(item)}
              key={item}
            >
              {item}
            </a>
          ))}

          <a
            aria-disabled={safePage === totalPages}
            className="min-h-8 rounded border border-line bg-white px-1.5 py-2 text-[10px] font-bold text-ink aria-disabled:pointer-events-none aria-disabled:opacity-40 sm:min-h-10 sm:px-4 sm:py-3 sm:text-sm"
            href={buildPageHref(safePage + 1)}
          >
            Next
          </a>

          <form
            action={pathname}
            className="contents sm:flex sm:w-auto sm:items-center sm:justify-center sm:gap-2"
            method="get"
          >
            {filter !== "All" ? (
              <input name="category" type="hidden" value={filter} />
            ) : null}

            <label className="hidden whitespace-nowrap text-xs font-bold text-muted sm:block sm:text-sm" htmlFor="catalog-page-jump">
              Go to page
            </label>

            <input
              id="catalog-page-jump"
              aria-label="Go to page"
              className="h-8 w-10 rounded border border-line bg-white px-1 text-center text-[10px] font-bold text-ink outline-none sm:h-10 sm:w-16 sm:px-2 sm:text-sm"
              inputMode="numeric"
              min={1}
              max={totalPages}
              name="page"
              onChange={(event) => setJumpPage(event.target.value)}
              type="number"
              value={jumpPage}
            />

            <button
              className="h-8 rounded border border-line bg-white px-1.5 text-[10px] font-bold text-ink sm:h-10 sm:px-3 sm:text-sm"
              type="submit"
            >
              Go
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
