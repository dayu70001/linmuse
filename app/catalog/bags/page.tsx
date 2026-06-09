import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getCatalogProducts } from "@/lib/products";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "Bags Catalog for Retail & Wholesale Buyers | LM Dkbrand";
const description =
  "Browse selected bags for retail and wholesale buyers. Save product codes, check order details, and review shipping proof before purchase.";
const canonical = buildCanonical("/catalog/bags");

const buyingNotes = [
  "Save the product code before contacting our team.",
  "Confirm color, size, quantity, and delivery details before payment.",
  "Ask for current product photos or order checks when needed.",
  "Review shipping proof before placing larger orders.",
  "For wholesale inquiries, prepare a short list of product codes.",
];

const faqs = [
  {
    question: "How do I ask about a bag?",
    answer:
      "Open the product page, save the product code or screenshot, then send it through the official channels so the team can check current details for you.",
  },
  {
    question: "Can I order one piece?",
    answer:
      "Yes. The catalog supports retail buyers starting from one piece, while wholesale buyers can prepare a product code list for a larger inquiry.",
  },
  {
    question: "Do you support wholesale bag orders?",
    answer:
      "Yes. For wholesale bag orders, share product codes, quantities, color preferences, and destination details before the order check.",
  },
  {
    question: "Can I check details before shipping?",
    answer:
      "Yes. You can ask for order checks and review available shipping proof before confirming a purchase or a larger order.",
  },
  {
    question: "How long does delivery usually take?",
    answer:
      "Delivery usually takes 7-12 business days, depending on destination, order details, and the final shipping method confirmed with the team.",
  },
];

const internalLinks = [
  { href: "/new-arrivals", label: "New Arrivals" },
  { href: "/shipping-proof", label: "Shipping Proof" },
  { href: "/wholesale-guide", label: "Wholesale Guide" },
  { href: "/contact", label: "Contact" },
  { href: "/catalog", label: "Full Catalog" },
];

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical,
  },
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

export default async function BagsCatalogPage() {
  const catalog = await getCatalogProducts({
    category: "Bags",
    page: "1",
    pageSize: 25,
  });

  return (
    <main className="overflow-x-hidden bg-white">
      <section className="section-pad">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Catalog</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Bags Catalog
            </h1>
            <div className="mt-5 space-y-4 text-sm leading-6 text-muted sm:text-base sm:leading-7">
              <p>
                LM Dkbrand bags catalog is curated for retail and wholesale buyers who want a clear way to browse selected carry options before making a product code inquiry. This page focuses on structured daily bags, travel-ready styles, compact pieces, and selected bag options that can fit everyday use, gifting, display, or buyer sourcing plans.
              </p>
              <p>
                Each product card links to a detail page with images and a product code. Save the code or screenshot before contacting the official channels, then confirm color, quantity, delivery details, and any order check before shipping. For larger inquiries, a short product code list helps the team review options more efficiently. You can also review shipping proof and new arrivals to understand current updates before purchase.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-lg border border-line bg-paper p-5">
              <h2 className="font-serif text-2xl text-ink">Buying Notes</h2>
              <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted">
                {buyingNotes.map((note) => (
                  <li className="flex gap-3" key={note}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-line bg-white p-5">
              <h2 className="font-serif text-2xl text-ink">Helpful Links</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {internalLinks.map((item) => (
                  <Link
                    className="inline-flex min-h-10 items-center rounded border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-gold hover:text-gold"
                    href={item.href}
                    key={item.href}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="section-pad bg-paper">
        <div className="container-page">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Selected Bags</p>
              <h2 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
                Browse Bags by Product Code
              </h2>
            </div>
            <p className="text-sm font-semibold text-muted">{catalog.total} products</p>
          </div>

          {catalog.products.length > 0 ? (
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {catalog.products.map((product) => (
                <ProductCard key={product.product_code} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-line bg-white p-6 text-center text-sm font-semibold text-muted">
              Bags are being updated.
            </div>
          )}
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="container-page">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-4xl">
              Bags Catalog Questions
            </h2>
          </div>

          <div className="mx-auto mt-7 grid max-w-4xl gap-3">
            {faqs.map((item) => (
              <section className="rounded-lg border border-line bg-paper p-5" key={item.question}>
                <h3 className="text-sm font-bold text-ink sm:text-base">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.answer}</p>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
