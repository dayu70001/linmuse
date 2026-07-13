import type { Metadata } from "next";
import { SeoLandingLayout, type SeoLandingContent } from "@/components/seo/SeoLandingLayout";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "Factory Direct Fashion Supplier | LM Dkbrand";
const description =
  "LM Dkbrand connects retail and wholesale buyers to factory-direct fashion across apparel, shoes, watches, and bags, with orders from 1 piece.";
const canonical = buildCanonical("/factory-direct-fashion");

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
  eyebrow: "Factory direct",
  h1: "Factory Direct Fashion Supply",
  intro:
    "LM Dkbrand works as a factory-direct supplier across apparel, shoes, watches, and bags, connecting production directly to retail and wholesale buyers. This page explains what factory-direct sourcing means in practice, how it differs from working through multiple distributors, and how to start an order.",
  breadcrumbItems: [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: "Factory Direct Fashion Supply", path: "/factory-direct-fashion" },
  ],
  sections: [
    {
      heading: "What Factory-Direct Sourcing Means",
      paragraphs: [
        "In a typical supply chain, a product can pass through several distributors before reaching a retail buyer, with each step adding time and reducing the buyer's visibility into product details. Factory-direct sourcing shortens that chain by connecting buyers to product information and availability closer to the source.",
        "For LM Dkbrand, this shows up as a catalog organized by product code across apparel, shoes, watches, and bags, with quantities available from a single piece up to larger wholesale orders. The same product code is used from the first inquiry through to order confirmation, which keeps communication consistent.",
      ],
    },
    {
      heading: "Why This Matters for Retail and Wholesale Buyers",
      paragraphs: [
        "Buyers ordering a single piece for personal use benefit from the same product information as a wholesale account ordering a larger batch, since both work from the same catalog and product codes. This makes it straightforward to test a product before deciding whether to order more.",
        "For resellers and boutique sellers, factory-direct sourcing also means that reordering a popular product code is simple, since availability can be confirmed against the same reference used in the original order.",
      ],
    },
    {
      heading: "How the Catalog Is Organized",
      paragraphs: [
        "Products are grouped into apparel, shoes, watches, bags, and accessories, with category and, where relevant, brand filters to help narrow down a search. Each item has its own product code, which is the reference point for availability checks, quotes, and order confirmation.",
        "New arrivals are added on an ongoing basis, so buyers building a regular assortment can check back for newer product codes across any category they source from.",
      ],
    },
    {
      heading: "Starting an Order",
      paragraphs: [
        "The process is the same regardless of category: browse the catalog, save product codes for items of interest, and send them along with quantities and a destination country to your assigned sales contact. From there, availability, payment, and shipping are confirmed before the order is finalized.",
        "Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination. Buyers placing a first order are welcome to start from a single piece before scaling up to a wholesale quantity.",
      ],
    },
    {
      heading: "Keeping Up with New Arrivals",
      paragraphs: [
        "Because sourcing happens close to production, new product codes are added to the catalog on an ongoing basis rather than in occasional large batches. This gives buyers a reason to check the catalog regularly rather than relying on a single order to cover an entire season.",
        "For buyers who prefer not to check manually, following the same product code system used throughout the site makes it easy to compare newer listings against past orders and decide whether they fit an existing assortment.",
      ],
    },
    {
      heading: "Working with Your Sales Contact",
      paragraphs: [
        "Regardless of category or order size, every order is confirmed through an assigned sales contact rather than an automated checkout, which allows availability, sizing, and shipping details to be reviewed before anything is finalized.",
        "Buyers who are new to factory-direct sourcing sometimes find this extra confirmation step unfamiliar compared to a standard online store, but it is what allows quantities to range from a single piece to a full wholesale order using the same process.",
      ],
    },
  ],
  faqs: [
    {
      question: "What does factory-direct actually change for a buyer?",
      answer:
        "It shortens the path between production and the buyer, keeping product information and availability consistent from the first inquiry through to order confirmation.",
    },
    {
      question: "Does factory-direct sourcing apply to all product categories?",
      answer:
        "Yes, apparel, shoes, watches, bags, and accessories are all sourced through the same factory-direct catalog and product code system.",
    },
    {
      question: "Can I order a single item to test before a wholesale order?",
      answer:
        "Yes, orders can start from 1 piece across any category, which is a common way to check a product before ordering in larger quantities.",
    },
    {
      question: "How is pricing handled for larger wholesale quantities?",
      answer:
        "Send your product codes and target quantities to your assigned sales contact, who will confirm pricing based on current availability.",
    },
    {
      question: "What is the typical delivery time?",
      answer:
        "Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
    },
  ],
};

export default function FactoryDirectFashionPage() {
  return <SeoLandingLayout content={content} />;
}
