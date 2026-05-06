"use client";

import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import {
  ALL_CATEGORY,
  MOBILE_PRIMARY_CATEGORIES,
  allStylesLabel,
  categoryLabel,
} from "@/lib/catalogTaxonomy";
import type { CatalogProduct, CatalogProductsResult } from "@/lib/products";

const MAX_VISIBLE_PAGES = 5;

function clean(value: string | null | undefined) {
  return String(value || "").trim();
}

function optionLabel(value: string, fallback: string) {
  return value || fallback;
}

export function CatalogGrid({
  onlyNew = false,
  catalog,
  products,
  initialCategory,
}: {
  onlyNew?: boolean;
  catalog?: CatalogProductsResult;
  products?: CatalogProduct[] | CatalogProductsResult;
  initialCategory?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const legacyProducts = Array.isArray(products) ? products : [];
  const activeCatalog = catalog || (products && !Array.isArray(products) ? products : {
    products: legacyProducts,
    total: legacyProducts.length,
    page: 1,
    pageSize: legacyProducts.length || 25,
    totalPages: 1,
    filters: { category: initialCategory || ALL_CATEGORY, subcategory: "", brand: "", model: "", search: "" },
    filterOptions: { categories: [ALL_CATEGORY, "Apparel", "Shoes", "Watches", "Bags"], subcategories: [], brands: [], models: [] },
  });

  const safePage = Math.min(Math.max(1, activeCatalog.page), activeCatalog.totalPages);
  const activeCategory = activeCatalog.filters.category || ALL_CATEGORY;
  const showModelFilter = activeCatalog.filterOptions.models.length > 0 || Boolean(activeCatalog.filters.model);
  const showBrandFilter = activeCatalog.filterOptions.brands.length > 0 || Boolean(activeCatalog.filters.brand);
  const showStyleFilter = !onlyNew && activeCategory !== ALL_CATEGORY && activeCatalog.filterOptions.subcategories.length > 0;
  const showMobileRefine = showStyleFilter || showBrandFilter || showModelFilter;

  const pageItems = useMemo(() => {
    const visibleCount = Math.min(MAX_VISIBLE_PAGES, activeCatalog.totalPages);
    const half = Math.floor(visibleCount / 2);
    let startPage = Math.max(1, safePage - half);
    let endPage = startPage + visibleCount - 1;

    if (endPage > activeCatalog.totalPages) {
      endPage = activeCatalog.totalPages;
      startPage = Math.max(1, endPage - visibleCount + 1);
    }

    const items: number[] = [];
    for (let page = startPage; page <= endPage; page += 1) items.push(page);
    return items;
  }, [safePage, activeCatalog.totalPages]);

  function buildHref(next: Record<string, string | number | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(next).forEach(([key, value]) => {
      const text = key === "page"
        ? String(Math.max(1, Number(value || 1) || 1))
        : clean(value == null ? "" : String(value));

      if (!text || text === ALL_CATEGORY) {
        params.delete(key);
      } else {
        params.set(key, text);
      }
    });

    if (!params.get("page")) params.set("page", "1");
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function categoryHref(category: string) {
    if (category === ALL_CATEGORY) return pathname;
    const params = new URLSearchParams();
    params.set("category", category);
    params.set("page", "1");
    return `${pathname}?${params.toString()}`;
  }

  function subcategoryHref(subcategory: string) {
    const params = new URLSearchParams();
    params.set("category", activeCategory);
    params.set("subcategory", subcategory);
    params.set("page", "1");
    return `${pathname}?${params.toString()}`;
  }

  function resetHref() {
    if (!activeCategory || activeCategory === ALL_CATEGORY) return pathname;
    const params = new URLSearchParams();
    params.set("category", activeCategory);
    params.set("page", "1");
    return `${pathname}?${params.toString()}`;
  }

  function pushFilter(key: string, value: string) {
    router.push(buildHref({ [key]: value, page: 1 }), { scroll: false });
  }

  function resetSecondaryFilters() {
    router.push(
      buildHref({
        brand: null,
        model: null,
        search: null,
        page: 1,
      }),
      { scroll: false },
    );
  }

  return (
    <div className="mt-6 max-w-full overflow-x-hidden lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8 lg:overflow-visible">
      <DesktopCategorySidebar
        categories={activeCatalog.filterOptions.categories}
        hrefForCategory={categoryHref}
        value={activeCategory}
      />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-bold uppercase tracking-wide text-muted lg:hidden">
          <span>{activeCatalog.total} products</span>
          <span aria-hidden="true">·</span>
          <span>Page {safePage} of {activeCatalog.totalPages}</span>
        </div>

        <MobileSearchForm action={pathname} filters={activeCatalog.filters} />

        <MobileCategoryGrid
          categories={activeCatalog.filterOptions.categories}
          hrefForCategory={categoryHref}
          value={activeCategory}
        />

        {!onlyNew && showMobileRefine ? (
          <div className="relative isolate z-20 mt-4 lg:hidden">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Filter by style / brand / model</p>
            <MobileRefineForm
              action={pathname}
              brands={activeCatalog.filterOptions.brands}
              filters={activeCatalog.filters}
              models={activeCatalog.filterOptions.models}
              resetHref={resetHref()}
              showModelFilter={showModelFilter}
              showStyleFilter={showStyleFilter}
              subcategories={activeCatalog.filterOptions.subcategories}
            />
          </div>
        ) : null}

        {!onlyNew ? (
        <DesktopRefineControls
          activeCategory={activeCategory}
          brands={activeCatalog.filterOptions.brands}
          filters={activeCatalog.filters}
          models={activeCatalog.filterOptions.models}
          resetHref={resetHref()}
          showBrandFilter={showBrandFilter}
          showModelFilter={showModelFilter}
          showStyleFilter={showStyleFilter}
          subcategories={activeCatalog.filterOptions.subcategories}
        />
        ) : null}

        <div className="mt-4 hidden flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wide text-muted lg:flex">
          <span>{activeCatalog.total} products</span>
          <span>{onlyNew ? "Latest arrivals" : `Page ${safePage} of ${activeCatalog.totalPages}`}</span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {activeCatalog.products.map((product) => (
            <ProductCard key={product.product_code} product={product} />
          ))}
        </div>

        {activeCatalog.products.length === 0 ? (
          <div className="mt-8 rounded-lg border border-line bg-white p-6 text-center text-sm font-semibold text-muted">
            No products match these filters.
          </div>
        ) : null}

        {activeCatalog.totalPages > 1 ? (
          <Pagination
            buildHref={buildHref}
            filters={activeCatalog.filters}
            pageItems={pageItems}
            pathname={pathname}
            safePage={safePage}
            totalPages={activeCatalog.totalPages}
          />
        ) : null}
      </div>
    </div>
  );
}

function MobileSearchForm({
  action,
  filters,
}: {
  action: string;
  filters: CatalogProductsResult["filters"];
}) {
  return (
    <form action={action} className="relative isolate z-10 mt-4 lg:hidden" method="get">
      <HiddenFilter name="category" value={filters.category !== ALL_CATEGORY ? filters.category : ""} />
      <HiddenFilter name="subcategory" value={filters.subcategory} />
      <HiddenFilter name="brand" value={filters.brand} />
      <HiddenFilter name="model" value={filters.model} />
      <input name="page" type="hidden" value="1" />

      <label className="flex h-11 items-center gap-2 rounded-full border border-line bg-white px-4">
        <Search size={17} className="shrink-0 text-muted" />
        <input
          aria-label="Search products"
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-ink outline-none"
          defaultValue={filters.search}
          name="search"
          placeholder="Search products..."
          type="search"
        />
      </label>
    </form>
  );
}

function MobileCategoryGrid({
  categories,
  hrefForCategory,
  value,
}: {
  categories: string[];
  hrefForCategory: (category: string) => string;
  value: string;
}) {
  const primaryCategories = MOBILE_PRIMARY_CATEGORIES.filter((category) => categories.includes(category));
  const moreCategories = categories.filter((category) => !primaryCategories.includes(category));

  return (
    <nav aria-label="Product categories" className="relative isolate z-10 mt-4 grid max-w-full grid-cols-3 gap-2 lg:hidden">
      {primaryCategories.map((category) => {
        const selected = (value || ALL_CATEGORY) === category;
        return (
          <a
            aria-current={selected ? "page" : undefined}
            className="inline-flex h-10 items-center justify-center rounded-full border border-line bg-white px-3 text-center text-sm font-semibold text-ink aria-current:border-ink aria-current:bg-ink aria-current:text-white"
            href={hrefForCategory(category)}
            key={category}
          >
            {categoryLabel(category)}
          </a>
        );
      })}

      {moreCategories.length > 0 ? (
        <details className="relative">
          <summary className="inline-flex h-10 w-full cursor-pointer list-none items-center justify-center rounded-full border border-line bg-white px-3 text-center text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            More
          </summary>
          <div className="absolute right-0 z-20 mt-2 grid w-[min(18rem,calc(100vw-2rem))] gap-2 rounded-2xl border border-line bg-white p-2 shadow-xl">
            {moreCategories.map((category) => {
              const selected = value === category;
              return (
                <a
                  aria-current={selected ? "page" : undefined}
                  className="rounded-full border border-line px-3 py-2 text-sm font-semibold text-ink aria-current:border-ink aria-current:bg-ink aria-current:text-white"
                  href={hrefForCategory(category)}
                  key={category}
                >
                  {categoryLabel(category)}
                </a>
              );
            })}
          </div>
        </details>
      ) : null}
    </nav>
  );
}

function DesktopCategorySidebar({
  categories,
  hrefForCategory,
  value,
}: {
  categories: string[];
  hrefForCategory: (category: string) => string;
  value: string;
}) {
  return (
    <aside className="sticky top-24 hidden max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 lg:block">
      <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">Category</p>
      <nav aria-label="Catalog categories" className="grid gap-1.5">
        {categories.map((category) => {
          const selected = (value || ALL_CATEGORY) === category;
          return (
            <a
              aria-current={selected ? "page" : undefined}
              className="rounded-full border border-transparent px-4 py-2 text-sm font-semibold text-ink transition hover:border-line aria-current:border-ink aria-current:bg-ink aria-current:text-white"
              href={hrefForCategory(category)}
              key={category}
            >
              {categoryLabel(category)}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

function MobileRefineForm({
  action,
  brands,
  filters,
  models,
  resetHref,
  showModelFilter,
  showStyleFilter,
  subcategories,
}: {
  action: string;
  brands: string[];
  filters: CatalogProductsResult["filters"];
  models: string[];
  resetHref: string;
  showModelFilter: boolean;
  showStyleFilter: boolean;
  subcategories: string[];
}) {
  const showBrandFilter = brands.length > 0 || Boolean(filters.brand);

  if (!showStyleFilter && !showBrandFilter && !showModelFilter) return null;

  return (
    <form action={action} className="mt-3 grid gap-3 rounded-lg border border-line bg-white p-3" method="get">
      <HiddenFilter name="category" value={filters.category !== ALL_CATEGORY ? filters.category : ""} />
      <HiddenFilter name="search" value={filters.search} />
      <input name="page" type="hidden" value="1" />

      {showStyleFilter ? (
        <NativeSelect
          emptyLabel={allStylesLabel(filters.category)}
          label="Style"
          name="subcategory"
          options={subcategories}
          value={filters.subcategory}
        />
      ) : null}
      {showBrandFilter ? <NativeSelect label="Brand" name="brand" options={brands} value={filters.brand} /> : null}
      {showModelFilter ? <NativeSelect label="Model" name="model" options={models} value={filters.model} /> : null}

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <button className="h-11 rounded-full bg-ink px-4 text-sm font-bold text-white" type="submit">
          Apply filters
        </button>
        <a className="inline-flex h-11 items-center justify-center rounded-full border border-line bg-white px-4 text-sm font-bold text-ink" href={resetHref}>
          Reset
        </a>
      </div>
    </form>
  );
}

function DesktopRefineControls({
  activeCategory,
  brands,
  filters,
  models,
  resetHref,
  showBrandFilter,
  showModelFilter,
  showStyleFilter,
  subcategories,
}: {
  activeCategory: string;
  brands: string[];
  filters: CatalogProductsResult["filters"];
  models: string[];
  resetHref: string;
  showBrandFilter: boolean;
  showModelFilter: boolean;
  showStyleFilter: boolean;
  subcategories: string[];
}) {
  return (
    <form method="get" className="relative isolate z-10 mt-7 hidden rounded-lg border border-line bg-paper p-3 lg:block">
      <HiddenFilter name="category" value={filters.category !== ALL_CATEGORY ? filters.category : ""} />
      <input name="page" type="hidden" value="1" />

      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(240px,1.25fr)_auto] gap-3 items-end">
        {showStyleFilter ? (
          <NativeSelect
            emptyLabel={allStylesLabel(activeCategory)}
            label="Style"
            name="subcategory"
            options={subcategories}
            value={filters.subcategory}
          />
        ) : null}

        {showBrandFilter ? (
          <NativeSelect
            label="Brand"
            name="brand"
            options={brands}
            value={filters.brand}
          />
        ) : null}

        {showModelFilter ? (
          <NativeSelect
            label="Model"
            name="model"
            options={models}
            value={filters.model}
          />
        ) : null}

        <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
          Search
          <span className="flex min-h-11 items-center gap-2 rounded border border-line bg-white px-3">
            <Search size={16} className="shrink-0 text-muted" />
            <input
              aria-label="Search product ID or title"
              className="min-h-10 min-w-0 flex-1 bg-transparent py-2 text-sm font-semibold normal-case text-ink outline-none"
              defaultValue={filters.search}
              name="search"
              placeholder="Product ID or title"
            />
          </span>
        </label>

        <div className="grid grid-cols-[auto_auto] gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded border border-ink bg-ink px-4 text-sm font-bold text-white hover:bg-black"
            type="submit"
          >
            Apply filters
          </button>

          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-line bg-white px-4 text-sm font-bold text-ink hover:border-gold"
            href={resetHref}
          >
            <RotateCcw size={16} />
            Reset
          </a>
        </div>
      </div>
    </form>
  );
}

function NativeSelect({
  emptyLabel,
  label,
  name,
  options,
  value,
}: {
  emptyLabel?: string;
  label: string;
  name: string;
  options: string[];
  value: string;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
      {label}
      <select
        className="h-11 w-full rounded border border-line bg-white px-3 text-sm font-semibold normal-case text-ink outline-none"
        defaultValue={value || ""}
        name={name}
      >
        <option value="">{emptyLabel || `All ${label.toLowerCase()}s`}</option>
        {options.map((option) => (
          <option key={`${name}-${option}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function Pagination({
  buildHref,
  filters,
  pageItems,
  pathname,
  safePage,
  totalPages,
}: {
  buildHref: (next: Record<string, string | number | null | undefined>) => string;
  filters: CatalogProductsResult["filters"];
  pageItems: number[];
  pathname: string;
  safePage: number;
  totalPages: number;
}) {
  return (
    <div className="mt-6 max-w-full sm:mt-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 lg:hidden">
        <a
          aria-disabled={safePage === 1}
          className="h-10 rounded-full border border-line bg-white px-3 py-2 text-center text-xs font-bold text-ink aria-disabled:pointer-events-none aria-disabled:opacity-40"
          href={buildHref({ page: safePage - 1 })}
        >
          Previous
        </a>

        <span className="whitespace-nowrap text-center text-xs font-bold text-muted">
          Page {safePage} of {totalPages}
        </span>

        <a
          aria-disabled={safePage === totalPages}
          className="h-10 rounded-full border border-line bg-white px-3 py-2 text-center text-xs font-bold text-ink aria-disabled:pointer-events-none aria-disabled:opacity-40"
          href={buildHref({ page: safePage + 1 })}
        >
          Next
        </a>
      </div>

      <div className="hidden flex-wrap items-center justify-center gap-2 lg:flex">
        <a
          aria-disabled={safePage === 1}
          className="min-h-10 rounded border border-line bg-white px-4 py-3 text-sm font-bold text-ink aria-disabled:pointer-events-none aria-disabled:opacity-40"
          href={buildHref({ page: safePage - 1 })}
        >
          Previous
        </a>

        {pageItems.map((item) => (
          <a
            aria-current={safePage === item ? "page" : undefined}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded border border-line bg-white px-2 text-sm font-bold text-muted aria-current:border-ink aria-current:bg-ink aria-current:text-white"
            href={buildHref({ page: item })}
            key={item}
          >
            {item}
          </a>
        ))}

        <a
          aria-disabled={safePage === totalPages}
          className="min-h-10 rounded border border-line bg-white px-4 py-3 text-sm font-bold text-ink aria-disabled:pointer-events-none aria-disabled:opacity-40"
          href={buildHref({ page: safePage + 1 })}
        >
          Next
        </a>
      </div>

      <form action={pathname} className="mt-3 flex w-full min-w-0 items-center justify-center gap-2" method="get">
        <HiddenFilters filters={filters} />

        <label className="whitespace-nowrap text-xs font-bold text-muted sm:text-sm" htmlFor="catalog-page-jump">
          Go to page
        </label>

        <input
          id="catalog-page-jump"
          aria-label="Go to page"
          className="h-10 w-20 rounded border border-line bg-white px-2 text-center text-sm font-bold text-ink outline-none"
          defaultValue={String(safePage)}
          inputMode="numeric"
          max={totalPages}
          min={1}
          name="page"
          type="number"
        />

        <button className="h-10 rounded-full border border-line bg-white px-4 text-sm font-bold text-ink" type="submit">
          Go
        </button>
      </form>
    </div>
  );
}

function SelectFilter({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const normalizedOptions = ["", ...options];

  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
      {label}
      <select
        aria-label={label}
        className="min-h-11 w-full rounded border border-line bg-white px-3 text-sm font-semibold normal-case text-ink outline-none"
        onChange={(event) => onChange(event.target.value)}
        value={value || ""}
      >
        {normalizedOptions.map((option) => (
          <option key={`${label}-${option || "all"}`} value={option}>
            {optionLabel(option, `All ${label.toLowerCase()}s`)}
          </option>
        ))}
      </select>
    </label>
  );
}

function HiddenFilter({ name, value }: { name: string; value: string }) {
  if (!value) return null;
  return <input name={name} type="hidden" value={value} />;
}

function HiddenFilters({ filters }: { filters: CatalogProductsResult["filters"] }) {
  return (
    <>
      {Object.entries(filters).map(([key, value]) => {
        if (!value || value === ALL_CATEGORY) return null;
        return <input key={key} name={key} type="hidden" value={value} />;
      })}
    </>
  );
}
