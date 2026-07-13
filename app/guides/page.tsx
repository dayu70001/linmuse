import type { Metadata } from "next";
import Link from "next/link";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "Guides | LM Dkbrand";
const description =
  "Guides for retail and wholesale buyers sourcing apparel, shoes, watches, and bags from LM Dkbrand, covering ordering, categories, and delivery.";
const canonical = buildCanonical("/guides");

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: {
    title,
    description,
    url: canonical,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const guideLinks = [
  { title: "Retail & Wholesale Guide", href: "/wholesale-guide", text: "The core process for placing a retail or wholesale order, from product ID to delivery." },
  { title: "Wholesale Clothing Supplier", href: "/wholesale-clothing", text: "How wholesale clothing sourcing works, including sizing and order quantities." },
  { title: "Wholesale Shoes Supplier", href: "/wholesale-shoes", text: "Ordering shoes wholesale, from single pairs to full size runs." },
  { title: "Wholesale Bags Supplier", href: "/wholesale-bags", text: "Sourcing wholesale bags across totes, crossbody, and everyday styles." },
  { title: "Wholesale Watches Supplier", href: "/wholesale-watches", text: "What to confirm before ordering watches wholesale, from packaging to quantities." },
  { title: "Factory Direct Fashion Supply", href: "/factory-direct-fashion", text: "How factory-direct sourcing works across every product category." },
  { title: "Small Order Wholesale", href: "/small-order-wholesale", text: "Starting with a small order before scaling into a full wholesale quantity." },
  { title: "Boutique Fashion Supplier", href: "/boutique-fashion-supplier", text: "Building a curated boutique assortment across multiple categories." },
  { title: "Wholesale Fashion Supplier for Europe", href: "/wholesale-fashion-europe", text: "Shipping and delivery considerations for wholesale orders to Europe." },
];

export default function GuidesPage() {
  return (
    <main className="bg-white">
      <section className="section-pad">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Guides</p>
            <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl lg:text-5xl">
              Sourcing Guides
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted sm:text-base">
              Category and topic guides for retail and wholesale buyers working with LM Dkbrand.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guideLinks.map((guide) => (
              <Link className="card block p-6 transition hover:border-gold" href={guide.href} key={guide.href}>
                <h2 className="font-serif text-xl text-ink">{guide.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{guide.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
