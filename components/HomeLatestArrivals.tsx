import { HOME_FEATURED_CATEGORIES } from "@/lib/catalogTaxonomy";

type ProductRow = {
  product_code?: string;
  slug?: string;
  category?: string;
  title_en?: string;
  title_cn?: string;
  main_thumbnail_url?: string;
  main_image_url?: string;
  imported_at?: string | null;
  created_at?: string | null;
};

function imageFor(product: ProductRow): string {
  return product.main_thumbnail_url || product.main_image_url || "";
}

function titleFor(product: ProductRow): string {
  return product.title_en || product.title_cn || product.product_code || "Latest Product";
}

function hrefFor(product: ProductRow): string {
  const slug = product.slug || product.product_code?.toLowerCase();
  if (!slug) return "/catalog";
  if (slug.startsWith("catalog?")) return `/${slug}`;
  if (slug.startsWith("/")) return slug;
  return `/catalog/${slug}`;
}

async function fetchLatestByCategory(category: string): Promise<ProductRow | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  const select = [
    "product_code",
    "slug",
    "category",
    "title_en",
    "title_cn",
    "main_thumbnail_url",
    "main_image_url",
    "imported_at",
    "created_at",
  ].join(",");

  const params = new URLSearchParams({
    select,
    category: `eq.${category}`,
    is_active: "eq.true",
    status: "eq.published",
    order: "imported_at.desc.nullslast,created_at.desc.nullslast",
    limit: "1",
  });

  const res = await fetch(`${supabaseUrl}/rest/v1/products?${params.toString()}`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error(`Homepage latest ${category} fetch failed:`, await res.text());
    return null;
  }

  const rows = (await res.json()) as ProductRow[];
  return rows[0] || null;
}

export default async function HomeLatestArrivals() {
  const latest = await Promise.all(
    HOME_FEATURED_CATEGORIES.map(async (category) => {
      const product = await fetchLatestByCategory(category);
      return product;
    })
  );
  const products = latest.filter((product): product is ProductRow => Boolean(product));

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-600">
          New Arrivals
        </p>
        <h2 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl">
          Featured Picks
        </h2>
      </div>

      {products.length > 0 ? (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => {
          const img = imageFor(product);
          const title = titleFor(product);
          const category = product.category || "Product";

          return (
            <a
              key={`${category}-${product.product_code || title}`}
              href={hrefFor(product)}
              className="group overflow-hidden rounded-xl border border-neutral-200 bg-stone-50 shadow-sm transition hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg"
            >
              <div className="aspect-[4/4] overflow-hidden bg-neutral-100">
                {img ? (
                  <img
                    src={img}
                    alt={title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-sm font-semibold uppercase tracking-[0.25em] text-neutral-500">
                    {category}
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold uppercase tracking-wide">
                  <span className="text-neutral-500">{product.product_code || category}</span>
                  <span className="text-amber-600">{category}</span>
                </div>
                <h3 className="line-clamp-2 text-lg font-semibold text-neutral-950">
                  {title}
                </h3>
              </div>
            </a>
          );
        })}
      </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center text-sm font-semibold text-neutral-500">
          Products are being updated.
        </div>
      )}
    </section>
  );
}
