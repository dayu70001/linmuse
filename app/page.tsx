import {
  ArrowRight,
  CheckCircle2,
  Factory,
  MessageCircle,
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
import { products } from "@/data/products";
import { getImage, getSetting, getSiteImages, getSiteSettings } from "@/lib/siteData";
import { whatsappUrl } from "@/lib/whatsapp";

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
  { label: "Factory Direct Supply", icon: Factory },
  { label: "Orders from 1 Piece", icon: PackageCheck },
  { label: "Fast Delivery in 7-12 Business Days", icon: Truck },
  { label: "Retail & Wholesale Friendly", icon: Users },
];

const steps = [
  "Browse selected products",
  "Send product ID on WhatsApp",
  "Confirm quantity, size, and destination",
  "Receive price, delivery, and order support",
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

const newArrivalSlots = [
  ["LM-APP-0001", "new_arrival_apparel"],
  ["LM-SHO-0001", "new_arrival_shoes"],
  ["LM-WAT-0001", "new_arrival_watches"],
  ["LM-BAG-0001", "new_arrival_bags"],
] as const;

const feedbackPreviewKeys = [
  "customer_feedback_01",
  "customer_feedback_02",
  "customer_feedback_03",
  "customer_feedback_04",
] as const;

export default async function Home() {
  const [siteImages, settings] = await Promise.all([getSiteImages(), getSiteSettings()]);
  const whatsappWholesale = getSetting(settings, "whatsapp_wholesale") || siteConfig.whatsappWholesale;
  const telegram = getSetting(settings, "telegram_channel") || siteConfig.telegramChannel;
  const instagram = getSetting(settings, "instagram_url") || siteConfig.instagramUrl;
  const facebook = getSetting(settings, "facebook_url") || siteConfig.facebookUrl;
  const socialLinks = [
    ["WhatsApp Channel", whatsappWholesale ? `https://wa.me/${whatsappWholesale}` : "/contact"],
    ["Telegram Channel", telegram || "/contact"],
    ["Instagram", instagram || "/contact"],
    ["Facebook", facebook || "/contact"],
  ];
  const newProducts = newArrivalSlots
    .map(([id, imageKey]) => ({
      product: products.find((item) => item.id === id),
      imageKey,
    }))
    .filter((item): item is { product: (typeof products)[number]; imageKey: (typeof newArrivalSlots)[number][1] } =>
      Boolean(item.product)
    );

  return (
    <main>
      <div className="bg-ink px-4 py-2.5 text-center text-xs font-semibold text-white">
        Factory Direct · Retail & Wholesale · Order from 1 piece · 7-12 business days
      </div>

      <section className="bg-white">
        <div className="container-page grid items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:py-16">
          <div>
            <p className="eyebrow">LM Dkbrand · Factory Direct</p>
            <h1 className="mt-4 max-w-4xl font-serif text-4xl leading-[1.02] text-ink min-[390px]:text-5xl sm:text-6xl lg:text-7xl lg:leading-[0.96]">
              Factory Direct Retail & Wholesale
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
              Order from just 1 piece. Explore apparel, shoes, watches, and
              bags with fast delivery in 7-12 business days.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-primary w-full sm:w-auto" href="/catalog">
                Shop Catalog
                <ArrowRight size={18} />
              </Link>
              <Link
                className="btn-secondary w-full sm:w-auto"
                href={whatsappUrl(
                  whatsappWholesale,
                  "Hi, I want to ask about LM Dkbrand products."
                )}
              >
                <MessageCircle size={18} />
                Contact on WhatsApp
              </Link>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {trustPoints.map((point) => (
                <div className="flex items-center gap-2 text-xs font-semibold text-muted sm:text-sm" key={point}>
                  <CheckCircle2 size={16} className="text-gold" />
                  {point}
                </div>
              ))}
            </div>
          </div>
          <div>
            <img
              src={getImage(siteImages, "hero_main_image").url}
              alt={getImage(siteImages, "hero_main_image").alt}
              className="aspect-[4/3] w-full rounded-xl object-cover"
              loading="eager"
              decoding="async"
            />
            <p className="mt-3 text-center text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Apparel · Shoes · Watches · Bags
            </p>
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-page">
          <SectionHeading eyebrow="Catalog" title="Shop by Category" />
          <div className="mt-7 grid gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
            {categoryCards.map((category) => (
              <article className="group overflow-hidden rounded-xl bg-white p-2" key={category.name}>
                <img
                  src={getImage(siteImages, category.imageKey).url || category.image}
                  alt={getImage(siteImages, category.imageKey).alt || category.alt}
                  className="aspect-[4/5] w-full rounded-lg object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="px-3 pb-4 pt-4">
                  <h3 className="font-serif text-xl text-ink sm:text-2xl">{category.name}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{category.text}</p>
                  <Link className="mt-4 inline-flex text-sm font-bold text-gold transition group-hover:text-ink" href={`/catalog?category=${category.name}`}>
                    View Category
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page">
          <SectionHeading eyebrow="New arrivals" title="Selected New Arrivals" />
          <div className="mt-7 grid gap-3 min-[390px]:grid-cols-2 sm:grid-cols-4 lg:gap-4">
            {newProducts.map(({ product, imageKey }) => (
              <ProductCard
                product={product}
                imageOverride={getImage(siteImages, imageKey).url}
                inquiryHref={whatsappUrl(
                  whatsappWholesale,
                  `Hi, I want to ask about ${product.id} - ${product.title}. Please send price, delivery, and order details.`
                )}
                key={product.id}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-page">
          <SectionHeading title="Why Choose LM Dkbrand" />
          <div className="mt-7 grid gap-3 min-[430px]:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
              <div className="card p-5 sm:p-6" key={feature.label}>
                <Icon className="text-gold" size={24} />
                <h3 className="mt-4 text-base font-bold text-ink">{feature.label}</h3>
              </div>
            );
            })}
          </div>
        </div>
      </section>

      <section className="section-pad bg-white" id="factory-direct">
        <div className="container-page grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="eyebrow">Factory direct</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Factory Direct Production
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted">
              We work closely with production resources and provide
              factory-direct selections with a cleaner and more reliable buying
              experience.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {productionCards.map((item, index) => (
              <div className="overflow-hidden rounded-xl bg-paper" key={item.title}>
                <img
                  src={getImage(siteImages, item.imageKey).url || item.image}
                  alt={getImage(siteImages, item.imageKey).alt || item.alt}
                  className="aspect-[4/5] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                <div className="p-5">
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-serif text-xl text-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-page grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="eyebrow">Delivery support</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Fast Delivery
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-muted">
              Most orders are delivered within 7-12 business days after
              confirmation, depending on product type, quantity, and destination.
            </p>
          </div>
          <div className="grid gap-4">
            {[
              "Retail and small orders accepted",
              "Tracked shipment updates",
              "WhatsApp support during the order process",
            ].map((item) => (
              <div className="flex items-center gap-4 rounded-xl bg-white p-5" key={item}>
                <CheckCircle2 className="shrink-0 text-gold" size={22} />
                <p className="font-bold text-ink">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page">
          <div>
            <p className="eyebrow">Proof & buyer updates</p>
            <h2 className="mt-3 font-serif text-4xl leading-tight text-ink">
              Proof & Buyer Updates
            </h2>
            <p className="mt-4 max-w-2xl text-muted">
              Packing records, dispatch updates, and buyer feedback help
              customers review our process before ordering.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link className="btn-primary w-full sm:w-auto" href="/shipping-proof">
                View Shipping Proof
              </Link>
              <Link
                className="btn-secondary w-full sm:w-auto"
                href={whatsappUrl(
                  whatsappWholesale,
                  "Hi, I want to ask about LM Dkbrand products."
                )}
              >
                Contact on WhatsApp
              </Link>
            </div>
          </div>
          <div className="mt-7 grid gap-3 md:grid-cols-3">
            <article className="card bg-paper p-5 sm:p-6">
              <PackageCheck className="text-gold" size={28} />
              <h3 className="mt-5 font-serif text-2xl text-ink">Packing & Shipping</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Selected packing records and dispatch updates from the order process.
              </p>
            </article>
            <article className="card bg-paper p-5 sm:p-6">
              <ShieldCheck className="text-gold" size={28} />
              <h3 className="mt-5 font-serif text-2xl text-ink">Customer Feedback</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Buyer feedback is displayed with private details hidden.
              </p>
            </article>
            <article className="card bg-paper p-5 sm:p-6">
              <Factory className="text-gold" size={28} />
              <h3 className="mt-5 font-serif text-2xl text-ink">Warehouse / Factory Updates</h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Daily preparation, checking, and dispatch updates for buyer review.
              </p>
            </article>
          </div>
          <div className="mt-7 rounded-xl bg-paper p-3 sm:p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
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
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {feedbackPreviewKeys.map((key) => (
                <Link
                  className="rounded-xl border border-line/70 bg-white p-1.5 transition hover:border-gold"
                  href="/shipping-proof"
                  key={key}
                >
                  <span className="block rounded-lg bg-paper p-1">
                    <img
                      alt={getImage(siteImages, key).alt}
                      className="h-auto w-full rounded-md object-contain"
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
          <div className="mt-7 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => (
              <div className="card p-5 sm:p-6" key={step}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-sm font-bold text-white">
                  {index + 1}
                </div>
                <p className="mt-5 font-bold text-ink">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="btn-secondary w-full sm:w-auto" href="/wholesale-guide">
              Read Retail & Wholesale Guide
            </Link>
            <Link className="btn-primary w-full sm:w-auto" href="/contact">
              Contact on WhatsApp
            </Link>
          </div>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page text-center">
          <SectionHeading
            title="Follow Daily Updates"
            text="Follow our channels for daily new arrivals, packing videos, shipping proof, and buyer updates."
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

      <section className="bg-ink py-12 text-white sm:py-16">
        <div className="container-page text-center">
          <h2 className="font-serif text-3xl leading-tight sm:text-6xl">
            Ready to shop with LM Dkbrand?
          </h2>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded border border-gold bg-gold px-5 py-3 text-sm font-bold text-ink sm:w-auto" href="/contact">
              <Send size={18} />
              Start Retail or Wholesale Inquiry
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
