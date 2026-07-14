import type { Metadata } from "next";
import { SeoLandingLayout, type SeoLandingContent } from "@/components/seo/SeoLandingLayout";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "Wholesale Clothing Supplier | LM Dkbrand";
const description =
  "Source wholesale clothing from LM Dkbrand with factory-direct supply, orders from 1 piece, and 7-12 business day delivery for retail and wholesale buyers.";
const canonical = buildCanonical("/wholesale-clothing");

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
  eyebrow: "Wholesale clothing",
  h1: "Wholesale Clothing Supplier",
  intro:
    "LM Dkbrand supplies wholesale clothing directly from the factory, with orders starting from 1 piece and larger quantities available for resellers, boutiques, and online sellers. This page explains how clothing sourcing works, what to expect on sizing and delivery, and how to move from browsing to a confirmed order.",
  breadcrumbItems: [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: "Wholesale Clothing Supplier", path: "/wholesale-clothing" },
  ],
  sections: [
    {
      heading: "A Factory-Direct Source for Wholesale Clothing",
      paragraphs: [
        "Buying clothing wholesale usually means working through several layers of distributors before a product reaches a store or reseller. LM Dkbrand supplies apparel directly, which keeps the process shorter and gives buyers a clearer view of product codes, categories, and available quantities from the start.",
        "The catalog is organized so that retail buyers, small resellers, and larger wholesale accounts can all work from the same product listings. Each item has its own product code, which is the reference used for quotes, availability checks, and order confirmation.",
      ],
    },
    {
      heading: "Categories and Sizing",
      paragraphs: [
        "The clothing range covers everyday apparel across men's and women's categories, with new arrivals added on an ongoing basis. Product listings include general sizing notes where they are available, and specific measurements can be confirmed for any item before an order is finalized.",
        "Because clothing runs across multiple sizes and colorways, most wholesale buyers submit a shortlist of product codes along with a size and color breakdown, rather than ordering a single size in bulk. This makes it easier to plan an order that matches actual demand.",
      ],
    },
    {
      heading: "How Wholesale Clothing Orders Work",
      paragraphs: [
        "The process starts with browsing the catalog by category, brand, or search term, then saving the product ID or a screenshot for any items of interest. From there, quantities, sizes, colors, and a destination country are sent to an assigned sales contact, who confirms current availability and next steps.",
        "Payment and shipping details are reviewed once product availability and destination are confirmed, since these can vary by item and location. Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
      ],
    },
    {
      heading: "Who This Works Best For",
      paragraphs: [
        "This sourcing model suits individual buyers placing a first order, resellers testing a small batch before committing to a larger quantity, and boutique or online sellers building out a regular clothing assortment. Because orders can start from a single piece, it is also a practical way to check quality and fit before scaling up.",
        "For sellers with an established customer base, larger wholesale quantities are supported once product interest and sizing needs are clear. Working from product codes throughout keeps communication simple whether an order is for one piece or several dozen.",
      ],
    },
    {
      heading: "Preparing for Repeat Clothing Orders",
      paragraphs: [
        "Once a particular clothing item has been tested and sells well, reordering it is usually the simplest part of the process, since the product code already identifies the exact style, and only quantity, size breakdown, and destination need to be reconfirmed with your sales contact.",
        "Keeping a short record of the product codes, sizes, and quantities from past orders makes it easier to plan future ones, especially for sellers who rotate between a few dependable styles and newer arrivals from the catalog. Your sales contact can confirm current availability for any of these codes before a repeat order is placed.",
      ],
    },
    {
      heading: "Building an Ongoing Clothing Assortment",
      paragraphs: [
        "Sellers who order clothing on a regular basis often find it useful to separate their assortment into a core set of dependable, repeat-ordered styles and a smaller rotating selection of newer arrivals used to test what customers respond to next.",
        "This approach keeps a steady baseline of products moving while still leaving room to try new product codes as they are added to the catalog, without needing to overhaul an entire order every time.",
      ],
    },
  ],
  faqs: [
    {
      question: "What is the minimum order quantity for wholesale clothing?",
      answer:
        "Orders can start from 1 piece for retail buyers. As quantities increase, wholesale pricing becomes available. Send your product codes and target quantities to your assigned sales contact for a quote.",
    },
    {
      question: "How long does delivery take?",
      answer:
        "Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
    },
    {
      question: "Can I mix sizes and colors within one order?",
      answer:
        "Yes, most wholesale clothing orders can combine sizes and colors within the same product line. Confirm current availability with your sales contact before finalizing quantities.",
    },
    {
      question: "How do I check if a product is currently available?",
      answer:
        "Browse the catalog, save the product code or a screenshot, and send it to your assigned sales contact, who will confirm current stock and next steps.",
    },
    {
      question: "Is sizing information available before I order?",
      answer:
        "Product listings include general sizing notes where available. For precise measurements on a specific style, ask your sales contact before confirming quantities.",
    },
  ],
  relatedCollections: [
    { label: "Browse Wholesale T-Shirts", href: "/catalog/wholesale-t-shirts" },
    { label: "Explore Jackets & Coats", href: "/catalog/wholesale-jackets-coats" },
  ],
};

export default function WholesaleClothingPage() {
  return <SeoLandingLayout content={content} />;
}
