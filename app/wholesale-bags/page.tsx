import type { Metadata } from "next";
import { SeoLandingLayout, type SeoLandingContent } from "@/components/seo/SeoLandingLayout";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "Wholesale Bags Supplier | LM Dkbrand";
const description =
  "Source wholesale bags from LM Dkbrand, including totes, crossbody, and everyday styles, with factory-direct supply and orders from 1 piece.";
const canonical = buildCanonical("/wholesale-bags");

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
  eyebrow: "Wholesale bags",
  h1: "Wholesale Bags Supplier",
  intro:
    "LM Dkbrand supplies wholesale bags directly from the factory, covering everyday totes, crossbody styles, and other bag categories with orders starting from a single piece. This page explains how the bag catalog works, what to check before ordering, and how sellers typically build out a bag assortment.",
  breadcrumbItems: [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: "Wholesale Bags Supplier", path: "/wholesale-bags" },
  ],
  sections: [
    {
      heading: "Wholesale Bags from a Factory-Direct Catalog",
      paragraphs: [
        "Bags cover a wide range of materials, shapes, and finishes, which makes it useful to have a catalog organized by product code and category rather than loose descriptions. LM Dkbrand lists bags this way, so buyers can compare styles and save specific items before requesting a quote.",
        "Sourcing directly from the factory keeps product information consistent between the first inquiry and the final order, which matters for buyers who need to describe a specific bag accurately to their own customers.",
      ],
    },
    {
      heading: "Materials and Everyday Use",
      paragraphs: [
        "Bag listings include material and category details where available, covering options suited to daily use, travel, and gifting. Since finish and hardware can vary between similar-looking styles, it is worth confirming details for a specific product code before ordering a larger quantity.",
        "Many buyers start with a small selection across a few categories, such as totes and crossbody bags, before narrowing down to the styles that perform best with their own customers.",
      ],
    },
    {
      heading: "How to Place a Wholesale Bag Order",
      paragraphs: [
        "Browse the bag catalog by category or search by product code, then save the codes for any styles of interest. Send the codes, quantities, and destination country to your assigned sales contact, who will confirm current availability before you finalize the order.",
        "Payment and shipping are confirmed once availability and destination are reviewed. Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
      ],
    },
    {
      heading: "Building a Bag Assortment for Resale",
      paragraphs: [
        "Boutique and online sellers often mix a few core everyday styles with a smaller number of statement pieces, which spreads risk across an order while still testing what resonates with customers. Ordering from 1 piece makes this kind of mixed assortment easier to plan.",
        "Once a style proves popular, reordering by product code keeps the process quick, since your sales contact can confirm current stock against a code you have already ordered before.",
      ],
    },
    {
      heading: "Seasonal and Gift-Ready Options",
      paragraphs: [
        "Bag demand often shifts with seasons and gifting periods, and the catalog is updated with new arrivals on an ongoing basis to reflect that. Checking back periodically for newer product codes is a practical way to keep a bag assortment current without reordering the same styles indefinitely.",
        "For sellers planning around a specific season or gifting period, sharing an approximate timeline with your sales contact alongside your shortlisted product codes can help confirm whether current stock and delivery timing will fit that window.",
      ],
    },
    {
      heading: "Keeping Track of a Growing Bag Assortment",
      paragraphs: [
        "As a bag assortment grows across categories, keeping a simple record of product codes, materials, and quantities already ordered helps avoid duplicating similar styles and makes it easier to spot gaps in the current selection.",
        "This record also speeds up conversations with your sales contact when planning a new order, since you can reference exactly which product codes have worked well before and which categories may be worth expanding into next. Over time, this makes it easier to plan a balanced order rather than reacting to whatever is newest in the catalog.",
      ],
    },
  ],
  faqs: [
    {
      question: "Can I order a single bag before committing to a wholesale quantity?",
      answer:
        "Yes, orders can start from 1 piece, which is a common way to check materials and finish before ordering a larger batch.",
    },
    {
      question: "How do I know what materials a bag is made from?",
      answer:
        "Product listings include material details where available. For a specific product code, your assigned sales contact can confirm additional details before you order.",
    },
    {
      question: "What is the typical delivery time for bag orders?",
      answer:
        "Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
    },
    {
      question: "Can I mix different bag styles in one wholesale order?",
      answer:
        "Yes, most wholesale bag orders combine several product codes rather than a single style in bulk. Share your shortlist with your sales contact to confirm availability.",
    },
    {
      question: "How do I check current stock for a bag I've seen before?",
      answer:
        "Send the product code to your assigned sales contact, who will confirm current availability before you place the order.",
    },
  ],
};

export default function WholesaleBagsPage() {
  return <SeoLandingLayout content={content} />;
}
