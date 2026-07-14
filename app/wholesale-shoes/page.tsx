import type { Metadata } from "next";
import { SeoLandingLayout, type SeoLandingContent } from "@/components/seo/SeoLandingLayout";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "Wholesale Shoes Supplier | LM Dkbrand";
const description =
  "Order wholesale shoes from LM Dkbrand with factory-direct sourcing, orders from 1 pair, and clear product codes for retail and wholesale buyers.";
const canonical = buildCanonical("/wholesale-shoes");

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

const content: SeoLandingContent = {
  eyebrow: "Wholesale shoes",
  h1: "Wholesale Shoes Supplier",
  intro:
    "LM Dkbrand supplies wholesale shoes directly from the factory, covering everyday and seasonal styles with orders starting from a single pair. This page covers how the shoe catalog is organized, what to check before ordering, and how the order process works from browsing to delivery.",
  breadcrumbItems: [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: "Wholesale Shoes Supplier", path: "/wholesale-shoes" },
  ],
  sections: [
    {
      heading: "Sourcing Shoes Directly from the Factory",
      paragraphs: [
        "Shoes are one of the more detail-sensitive categories to source wholesale, since sizing, materials, and construction vary widely between styles. LM Dkbrand lists shoes by product code with category tags, which makes it possible to compare styles quickly before requesting a quote.",
        "Working factory-direct removes some of the layers that typically sit between a manufacturer and a reseller, which helps keep product information consistent from the first inquiry through to order confirmation.",
      ],
    },
    {
      heading: "Sizing and Quality Checks",
      paragraphs: [
        "Shoe listings include general details where available, but sizing can differ between styles, so it is worth confirming the size range for a specific product code before placing a larger order. This is especially useful for buyers ordering across multiple sizes for a single style.",
        "For first-time buyers, ordering a single pair before committing to a wholesale quantity is a practical way to check fit, materials, and finish against expectations before scaling up an order.",
      ],
    },
    {
      heading: "How the Order Process Works",
      paragraphs: [
        "Start by browsing the shoe catalog by category or searching by product code, then save the codes for any styles of interest. Send the product codes, sizes, and quantities to your assigned sales contact, who will confirm current availability and any details specific to that batch.",
        "Once availability and destination are confirmed, payment and shipping options are reviewed together. Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
      ],
    },
    {
      heading: "Ordering for Resale or Wholesale Accounts",
      paragraphs: [
        "Resellers and boutique sellers often build an order around a handful of core styles across a size run, rather than a single size in bulk. Sharing a target size breakdown with your sales contact upfront makes it easier to confirm what is currently available in each size before finalizing quantities.",
        "Wholesale accounts placing repeat orders can also work from previously ordered product codes, which simplifies re-ordering popular styles once initial sizing and demand are known.",
      ],
    },
    {
      heading: "Comparing Styles Before Committing",
      paragraphs: [
        "With a large catalog, it helps to narrow down options before requesting a quote. Filtering by category and saving a shortlist of product codes gives your sales contact a clear list to check against current stock, rather than working from general descriptions that can be harder to match to a specific item.",
        "Some buyers request a single pair across two or three candidate styles at once, compare them side by side, and then decide which style to reorder in a larger wholesale quantity. This approach keeps the initial cost low while still providing a direct comparison before scaling up.",
      ],
    },
    {
      heading: "Keeping a Shoe Assortment Current",
      paragraphs: [
        "Shoe trends shift by season, and the catalog is updated with new arrivals on an ongoing basis to reflect that. Reviewing newer product codes periodically, alongside the styles already performing well in an existing order, helps keep an assortment from becoming outdated.",
        "For sellers managing multiple styles at once, keeping a simple record of which product codes have already been ordered, along with their sizes and quantities, makes it easier to plan the next order without starting the research from scratch.",
      ],
    },
  ],
  faqs: [
    {
      question: "Can I order just one pair to start?",
      answer:
        "Yes, orders can start from a single pair. This is a common way to check sizing and quality before placing a larger wholesale order.",
    },
    {
      question: "How do I confirm sizing before ordering in bulk?",
      answer:
        "Send the product code to your assigned sales contact, who can confirm the available size range and any sizing notes for that specific style.",
    },
    {
      question: "What is the typical delivery time for shoe orders?",
      answer:
        "Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
    },
    {
      question: "Can I combine multiple styles in one wholesale order?",
      answer:
        "Yes, most buyers combine several product codes and sizes in a single order. Share your shortlist with your sales contact to confirm availability across all styles.",
    },
    {
      question: "How do I place a repeat order for a style I've bought before?",
      answer:
        "Reference the original product code with your assigned sales contact, who can confirm current stock and any changes before processing a repeat order.",
    },
  ],
  relatedCollections: [
    { label: "Browse Current Sneakers", href: "/catalog/wholesale-sneakers" },
  ],
};

export default function WholesaleShoesPage() {
  return <SeoLandingLayout content={content} />;
}
