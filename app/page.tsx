import {
  ArrowRight,
  CheckCircle2,
  Factory,
  PackageCheck,
  Send,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeading } from "@/components/SectionHeading";
import { siteConfig } from "@/config/site";
import type { ProductCategory } from "@/data/products";
import type { CatalogProduct } from "@/lib/products";
import { getImage, getSetting, getSiteImages, getSiteSettings } from "@/lib/siteData";

const trustPoints = [
  "Orders from 1 piece",
  "Factory Direct",
  "7-12 business days",
  "Retail & Wholesale",
];

const categoryCards = [
  {
    name: "Apparel",
    imageKey: "category_apparel",
    image: "/images/mock/category-apparel.jpg",
    alt: "Neutral apparel selection for LM Dkbrand",
    text: "Everyday fashion selections for retail and sourcing.",
  },
  {
    name: "Shoes",
    imageKey: "category_shoes",
    image: "/images/mock/category-shoes.jpg",
    alt: "Curated lifestyle shoes for retail and wholesale",
    text: "Clean footwear options for single or bulk orders.",
  },
  {
    name: "Watches",
    imageKey: "category_watches",
    image: "/images/mock/category-watches.jpg",
    alt: "Minimal fashion watches selection",
    text: "Minimal watch styles for gifting and catalogs.",
  },
  {
    name: "Bags",
    imageKey: "category_bags",
    image: "/images/mock/category-bags.jpg",
    alt: "Fashion bags selection for retail buyers",
    text: "Structured daily bags for buyers and boutiques.",
  },
];

const features = [
  { label: "Factory Direct", icon: Factory },
  { label: "Orders from 1 Piece", icon: PackageCheck },
  { label: "Fast Delivery 7-12 Days", icon: Truck },
  { label: "Retail & Wholesale Friendly", icon: Users },
  { label: "Quality Checked", icon: ShieldCheck },
  { label: "Daily Updates", icon: Send },
];

const steps = [
  "Browse selected products",
  "Send product ID on WhatsApp",
  "Confirm quantity, size, and destination",
  "Get price, delivery, and order support",
];

const productionCards = [
  {
    title: "Material Checking",
    imageKey: "factory_01",
    image: "/images/mock/factory-production-001.jpg",
    alt: "Factory preparation update",
    caption: "Selected materials and product details are reviewed before preparation.",
  },
  {
    title: "Production Updates",
    imageKey: "factory_02",
    image: "/images/mock/factory-production-002.jpg",
    alt: "Factory production update",
    caption: "Factory production and preparation updates are organized for buyer review.",
  },
  {
    title: "Packing Preparation",
    imageKey: "factory_03",
    image: "/images/mock/factory-production-003.jpg",
    alt: "Factory packing preparation",
    caption: "Orders are checked and packed carefully before dispatch.",
  },
];

const newArrivalSlots: Array<{ category: ProductCategory; productCode: string }> = [
  { category: "Apparel", productCode: "LM-APP-0158" },
  { category: "Shoes", productCode: "LM-SHO-0175" },
  { category: "Watches", productCode: "LM-WAT-0181" },
  { category: "Bags", productCode: "LM-BAG-0195" },
] as const;

type HomeProductRow = {
  product_code?: string | null;
  slug?: string | null;
  category?: string | null;
  subcategory?: string | null;
  title_en?: string | null;
  title_cn?: string | null;
  description_en?: string | null;
  sizes_display?: string | null;
  colors_display?: string | null;
  moq?: string | null;
  delivery_time?: string | null;
  main_image_url?: string | null;
  main_thumbnail_url?: string | null;
  gallery_image_urls?: unknown;
  gallery_thumbnail_urls?: unknown;
  image_count?: number | null;
  status?: string | null;
  is_active?: boolean | null;
  is_featured?: boolean | null;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function normalizeGallery(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }
  return [];
}

function mapHomeProductRow(row: HomeProductRow): CatalogProduct {
  const galleryImages = normalizeGallery(row.gallery_image_urls);
  const galleryThumbnails = normalizeGallery(row.gallery_thumbnail_urls);
  const image =
    row.main_thumbnail_url ||
    row.main_image_url ||
    galleryThumbnails[0] ||
    galleryImages[0] ||
    "";
  const productCode = row.product_code || "";

  if (!productCode || !row.slug || !image) {
    throw new Error(`Selected New Arrivals product is missing required data: ${productCode || "unknown"}`);
  }

  return {
    product_code: productCode,
    slug: row.slug,
    category: row.category as ProductCategory,
    subcategory: row.subcategory || null,
    title_en: row.title_en || row.title_cn || productCode,
    title_cn: row.title_cn || null,
    description_en: row.description_en || null,
    sizes_display: row.sizes_display || null,
    colors_display: row.colors_display || null,
    moq: row.moq || null,
    delivery_time: row.delivery_time || null,
    main_image_url: row.main_image_url || galleryImages[0] || image,
    main_thumbnail_url: image,
    gallery_image_urls: galleryImages.length > 0 ? galleryImages : [image],
    gallery_thumbnail_urls: galleryThumbnails.length > 0 ? galleryThumbnails : [image],
    image_count: row.image_count || null,
    status: row.status || null,
    is_active: row.is_active ?? null,
    is_featured: row.is_featured ?? null,
    badge: row.is_featured ? "Popular" : "New",
  };
}

async function getHomeNewArrivals() {
  if (!supabaseUrl || !anonKey) {
    throw new Error("Selected New Arrivals requires Supabase environment variables.");
  }

  const productCodes = newArrivalSlots.map((slot) => slot.productCode);
  const select = [
    "product_code",
    "slug",
    "category",
    "subcategory",
    "title_en",
    "description_en",
    "sizes_display",
    "colors_display",
    "moq",
    "delivery_time",
    "main_image_url",
    "main_thumbnail_url",
    "gallery_image_urls",
    "gallery_thumbnail_urls",
    "image_count",
    "status",
    "is_active",
    "is_featured",
  ].join(",");
  const response = await fetch(
    `${supabaseUrl}/rest/v1/products?select=${select}&product_code=in.(${productCodes.join(",")})&is_active=eq.true`,
    {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      next: { revalidate: 30 },
    }
  );

  if (!response.ok) {
    throw new Error(`Selected New Arrivals products could not be loaded: HTTP ${response.status}`);
  }

  const rows = (await response.json()) as HomeProductRow[];
  const productsByCode = new Map(rows.map((row) => [row.product_code, mapHomeProductRow(row)]));

  return newArrivalSlots.map((slot) => {
    const product = productsByCode.get(slot.productCode);
    if (!product) {
      throw new Error(`Selected New Arrivals product not found or inactive: ${slot.productCode}`);
    }
    return { product };
  });
}

const feedbackPreviewKeys = [
  "customer_feedback_01",
  "customer_feedback_02",
  "customer_feedback_03",
  "customer_feedback_04",
] as const;

export default async function Home() {
  const [siteImages, settings, newProducts] = await Promise.all([
    getSiteImages(),
    getSiteSettings(),
    getHomeNewArrivals(),
  ]);
  const telegram = getSetting(settings, "telegram_channel") || siteConfig.telegramChannel;
  const instagram = getSetting(settings, "instagram_url") || siteConfig.instagramUrl;
  const facebook = getSetting(settings, "facebook_url") || siteConfig.facebookUrl;
  const socialLinks = [
    ["Telegram Group", telegram || "/contact"],
    ["WhatsApp Group", "/contact"],
    ["Instagram", instagram || "/contact"],
    ["Facebook", facebook || "/contact"],
  ];
  return (
    <main>
      <div className="bg-ink px-4 py-2.5 text-center text-xs font-semibold text-white">
        Factory Direct · Retail & Wholesale · Order from 1 piece · 7-12 business days
      </div>

      <section className="section-pad bg-white">
        <div className="container-page">
          <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div>
              <p className="eyebrow">New Arrivals</p>
              <h2 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
                Selected New Arrivals
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                Fresh selections from Apparel, Shoes, Watches, and Bags.
              </p>
            </div>
            <Link className="btn-outline mx-auto sm:mx-0" href="/new-arrivals">
              View All <ArrowRight size={16} />
            </Link>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {newProducts.map(({ product }) => {
              const key = product.product_code;

              return <ProductCard key={key} product={product} />;
            })}
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-page">
          <SectionHeading title="Why Choose LM Dkbrand" />
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
              <div className="card p-4 text-center sm:p-5" key={feature.label}>
                <Icon className="mx-auto text-gold" size={22} />
                <h3 className="mt-3 text-xs font-bold text-ink sm:text-sm">{feature.label}</h3>
              </div>
            );
            })}
          </div>
        </div>
      </section>

      <section className="section-pad bg-white" id="factory-direct">
        <div className="container-page grid gap-7 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="text-center lg:text-left">
            <p className="eyebrow">Factory direct</p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
              Factory Direct Production
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted lg:mx-0">
              We work closely with production resources and provide
              factory-direct selections with a cleaner and more reliable buying
              experience.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {productionCards.map((item, index) => (
              <div className="overflow-hidden rounded-xl bg-paper" key={item.title}>
                <img
                  src={getImage(siteImages, item.imageKey).url || item.image}
                  alt={getImage(siteImages, item.imageKey).alt || item.alt}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="p-4">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-serif text-lg text-ink">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted sm:text-sm sm:leading-6">
                    {item.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-page grid gap-7 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="text-center lg:text-left">
            <p className="eyebrow">Delivery support</p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
              Fast Delivery
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted lg:mx-0">
              Most orders are delivered within 7-12 business days after
              confirmation, depending on product type, quantity, and destination.
            </p>
          </div>
          <div className="grid gap-4">
            {[
              "Retail and small orders accepted",
              "Tracked shipment updates",
              "Support during the order process",
            ].map((item) => (
              <div className="flex items-center gap-3 rounded-xl bg-white p-4" key={item}>
                <CheckCircle2 className="shrink-0 text-gold" size={22} />
                <p className="font-bold text-ink">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page">
          <div className="text-center">
            <p className="eyebrow">Proof & buyer updates</p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
              Proof & Buyer Updates
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted">
              Packing records, dispatch updates, and buyer feedback help
              customers review our process before ordering.
            </p>
            <div className="mt-5 flex justify-center">
              <Link className="btn-primary w-full sm:w-auto" href="/shipping-proof">
                View Shipping Proof
              </Link>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 md:gap-3">
            <article className="card bg-paper p-2.5 text-center sm:p-5">
              <PackageCheck className="mx-auto text-gold" size={18} />
              <h3 className="mt-2 font-serif text-sm leading-tight text-ink sm:text-xl">Packing & Shipping</h3>
              <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-muted sm:line-clamp-none sm:text-sm sm:leading-6">
                Packing records and dispatch updates.
              </p>
            </article>
            <article className="card bg-paper p-2.5 text-center sm:p-5">
              <ShieldCheck className="mx-auto text-gold" size={18} />
              <h3 className="mt-2 font-serif text-sm leading-tight text-ink sm:text-xl">Customer Feedback</h3>
              <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-muted sm:line-clamp-none sm:text-sm sm:leading-6">
                Buyer feedback with private details hidden.
              </p>
            </article>
            <article className="card bg-paper p-2.5 text-center sm:p-5">
              <Factory className="mx-auto text-gold" size={18} />
              <h3 className="mt-2 font-serif text-sm leading-tight text-ink sm:text-xl">Warehouse Updates</h3>
              <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-muted sm:line-clamp-none sm:text-sm sm:leading-6">
                Factory preparation and dispatch updates.
              </p>
            </article>
          </div>
          <div className="mt-6 rounded-xl bg-paper p-3 sm:p-5">
            <div className="flex flex-col justify-between gap-4 text-center sm:flex-row sm:items-end sm:text-left">
              <div className="mx-auto sm:mx-0">
                <p className="eyebrow">Buyer updates</p>
                <h3 className="mt-2 font-serif text-3xl text-ink">Customer Feedback</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  Real buyer feedback is displayed with private information hidden.
                </p>
              </div>
              <Link className="btn-secondary w-full sm:w-auto" href="/shipping-proof">
                View More Feedback
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
              {feedbackPreviewKeys.map((key) => (
                <Link
                  className="rounded-xl border border-line/70 bg-white p-1.5 transition hover:border-gold"
                  href="/shipping-proof"
                  key={key}
                >
                  <span className="block rounded-lg bg-paper p-1">
                    <img
                      alt={getImage(siteImages, key).alt}
                      className="h-44 w-full rounded-md object-contain sm:h-72 lg:h-80"
                      decoding="async"
                      loading="lazy"
                      src={getImage(siteImages, key).url}
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-page">
          <SectionHeading
            title="Retail & Wholesale Ordering Made Simple"
            text="We support both retail orders from 1 piece and wholesale inquiries for resellers, boutiques, and online sellers."
          />
          <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4">
            {steps.map((step, index) => (
              <div className="card p-4 text-center" key={step}>
                <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
                  {index + 1}
                </div>
                <p className="mt-3 text-xs font-bold text-ink sm:text-sm">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <Link className="btn-secondary w-full sm:w-auto" href="/wholesale-guide">
              Read Retail & Wholesale Guide
            </Link>
          </div>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page text-center">
          <SectionHeading
            title="Follow Daily Updates"
            text="Join our groups for daily new arrivals, shipping proof, and buyer updates."
          />
          <div className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {socialLinks.map(([label, href]) => (
              <Link className="btn-secondary" href={href} key={label}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-10 text-white sm:py-14">
        <div className="container-page text-center">
          <h2 className="font-serif text-3xl leading-tight sm:text-5xl">
            Ready to shop with LM Dkbrand?
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded border border-gold bg-gold px-5 py-3 text-sm font-bold text-ink sm:w-auto" href={telegram || "/contact"}>
              <Send size={18} />
              Join Telegram Group
            </Link>
            <Link className="inline-flex min-h-11 w-full items-center justify-center rounded border border-white/25 px-5 py-3 text-sm font-bold text-white sm:w-auto" href="/catalog">
              Shop Catalog
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
