import type { Metadata } from "next";
import { SeoLandingLayout, type SeoLandingContent } from "@/components/seo/SeoLandingLayout";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "Wholesale Watches Supplier | LM Dkbrand";
const description =
  "Source wholesale watches from LM Dkbrand with factory-direct supply, clear product codes, and orders from 1 piece for retail and wholesale buyers.";
const canonical = buildCanonical("/wholesale-watches");

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
  eyebrow: "Wholesale watches",
  h1: "Wholesale Watches Supplier",
  intro:
    "LM Dkbrand supplies wholesale watches directly from the factory, with orders starting from a single piece and larger quantities available once a style has proven popular. This page covers how the watch catalog is organized, what to check before ordering, and how the order process works.",
  breadcrumbItems: [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: "Wholesale Watches Supplier", path: "/wholesale-watches" },
  ],
  sections: [
    {
      heading: "A Factory-Direct Catalog of Watches",
      paragraphs: [
        "Watches are typically ordered by exact product code rather than a general description, since small differences in case size, dial, or strap can matter to a buyer's own customers. LM Dkbrand organizes the watch catalog this way, so each listing can be referenced precisely when requesting a quote.",
        "Sourcing directly from the factory keeps the information attached to each product code consistent from the first inquiry through to order confirmation, which is useful when a buyer needs to describe a specific piece accurately.",
      ],
    },
    {
      heading: "What to Confirm Before Ordering",
      paragraphs: [
        "Because watches are a higher-consideration purchase for most end customers, it is worth confirming packaging, strap options, and any available details for a specific product code before finalizing a wholesale quantity. Your assigned sales contact can confirm what is currently available for a given code.",
        "For buyers testing a new style, ordering a single piece first is a practical way to review the product in hand before committing to a larger batch, particularly when a customer base has specific expectations around finish and detail.",
      ],
    },
    {
      heading: "How to Place a Wholesale Watch Order",
      paragraphs: [
        "Browse the watch catalog by category or search by product code, then save the codes for any styles of interest. Send the codes, quantities, and destination country to your assigned sales contact, who will confirm current availability and next steps.",
        "Payment and shipping options are reviewed once product availability and destination are confirmed. Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
      ],
    },
    {
      heading: "Ordering for Resale",
      paragraphs: [
        "Resellers often start with a small number of product codes across a few styles, then reorder the codes that perform best once initial demand is clear. Working from the same product code for repeat orders keeps communication with your sales contact straightforward.",
        "Larger wholesale accounts placing bigger quantities can also confirm availability across several product codes at once, which helps with planning an order around multiple styles.",
      ],
    },
    {
      heading: "Packaging and Presentation",
      paragraphs: [
        "Presentation matters for watches more than for many other categories, since packaging is often part of what a reseller's own customer sees first. Where packaging details are available for a given product code, your sales contact can confirm them before you finalize an order, so there are no surprises when the shipment arrives.",
        "If presentation is a priority for your customers, it is worth raising this early in the conversation with your sales contact rather than after an order has already been placed, since options can vary between product codes.",
      ],
    },
    {
      heading: "Managing a Watch Product Line Over Time",
      paragraphs: [
        "Because watches are often reordered less frequently than apparel, keeping a clear record of which product codes have been ordered before, along with quantities and packaging preferences, makes future conversations with your sales contact more efficient.",
        "This is especially useful for wholesale accounts managing several watch styles at once, where confirming current availability across multiple product codes in a single inquiry saves time compared to checking each style separately. It also makes it easier to plan restocks around the styles that consistently sell through.",
      ],
    },
  ],
  faqs: [
    {
      question: "Can I order a single watch before placing a wholesale order?",
      answer:
        "Yes, orders can start from 1 piece, which is a useful way to review a specific product code before ordering in larger quantities.",
    },
    {
      question: "How do I confirm what is included with a watch order?",
      answer:
        "Send the product code to your assigned sales contact, who can confirm packaging and other details currently available for that item.",
    },
    {
      question: "What is the typical delivery time for watch orders?",
      answer:
        "Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
    },
    {
      question: "Can I order multiple watch styles together?",
      answer:
        "Yes, most wholesale orders combine several product codes. Share your shortlist with your sales contact to confirm availability across all styles.",
    },
    {
      question: "How do I reorder a watch I've purchased before?",
      answer:
        "Reference the original product code with your assigned sales contact, who will confirm current stock before processing a repeat order.",
    },
  ],
};

export default function WholesaleWatchesPage() {
  return <SeoLandingLayout content={content} />;
}
