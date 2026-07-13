import type { Metadata } from "next";
import { SeoLandingLayout, type SeoLandingContent } from "@/components/seo/SeoLandingLayout";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "Small Order Wholesale | LM Dkbrand";
const description =
  "Start with small order wholesale at LM Dkbrand, with orders from 1 piece across apparel, shoes, watches, and bags before scaling to larger quantities.";
const canonical = buildCanonical("/small-order-wholesale");

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
  eyebrow: "Small order wholesale",
  h1: "Small Order Wholesale",
  intro:
    "LM Dkbrand supports small order wholesale, with quantities starting from 1 piece across apparel, shoes, watches, and bags. This page covers why a low starting quantity is useful for new sellers, how to move from a small test order to a larger wholesale quantity, and what to prepare before ordering.",
  breadcrumbItems: [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: "Small Order Wholesale", path: "/small-order-wholesale" },
  ],
  sections: [
    {
      heading: "Why Start with a Small Order",
      paragraphs: [
        "Many wholesale suppliers require a large minimum order before a buyer can see a product in hand, which makes it hard to judge fit, materials, or finish ahead of time. LM Dkbrand allows orders from a single piece, so a buyer can review a specific product code before committing to a larger quantity.",
        "This is particularly useful for new sellers who are still working out which categories or styles suit their customers, since a small order limits risk while still providing a real sample to evaluate.",
      ],
    },
    {
      heading: "Testing Products Before Scaling Up",
      paragraphs: [
        "A common approach is to order a handful of product codes across a few categories, review them, and then place a larger wholesale order for the codes that perform best. Because the same product code is used throughout, moving from a test order to a bigger order is straightforward.",
        "Buyers who already know their customer base can skip straight to a larger quantity, but the option to start small remains useful whenever a new product code or category is being tried for the first time.",
      ],
    },
    {
      heading: "What to Prepare Before Ordering",
      paragraphs: [
        "Before contacting a sales representative, it helps to have a shortlist of product codes, along with sizes, colors, and quantities where relevant. Having a destination country ready also speeds up the availability and shipping confirmation.",
        "For buyers unsure where to start, browsing by category and saving a few product codes that stand out is a reasonable first step before reaching out for a quote.",
      ],
    },
    {
      heading: "Moving from Small Orders to Wholesale Quantities",
      paragraphs: [
        "Once a product code has been tested and performs well, reordering in a larger quantity uses the same reference, so your sales contact can confirm current availability without starting the process from scratch.",
        "Most orders, whether a single piece or a larger wholesale batch, are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
      ],
    },
    {
      heading: "Common Small-Order Use Cases",
      paragraphs: [
        "Small orders are used for a range of purposes beyond simple product testing, including checking a style ahead of a photoshoot, confirming fit before offering a product to customers, or trying a new category for the first time without a large upfront commitment.",
        "Whatever the reason, the same process applies: shortlist product codes, confirm availability and destination with your sales contact, and place the order. Moving to a wholesale quantity later follows the same steps, just with larger numbers attached to the same product codes.",
      ],
    },
    {
      heading: "Keeping Small Orders Simple",
      paragraphs: [
        "Even a single-piece order benefits from the same preparation as a larger one: a clear product code, a confirmed destination, and any size or color preference noted upfront. This avoids back-and-forth that can slow down what should be a quick, low-commitment purchase.",
        "Sellers who place small orders regularly, such as testing a new product code each month, often find it useful to keep a simple log of what has been tried, so results can be compared over time before deciding what to scale into a wholesale order.",
      ],
    },
  ],
  faqs: [
    {
      question: "Is there a minimum order quantity?",
      answer:
        "No, orders can start from 1 piece. Wholesale pricing becomes available as quantities increase.",
    },
    {
      question: "Can I order a few different products to compare before choosing one?",
      answer:
        "Yes, many buyers order a small shortlist of product codes to review before scaling up an order for the best-performing items.",
    },
    {
      question: "How do I move from a small test order to a wholesale quantity?",
      answer:
        "Reference the product code from your original order with your assigned sales contact, who will confirm current availability for a larger quantity.",
    },
    {
      question: "Does a small order take longer to deliver than a larger one?",
      answer:
        "Delivery time depends mainly on product type, quantity, and destination. Most orders, small or large, are delivered within 7-12 business days after confirmation.",
    },
    {
      question: "What information should I prepare before reaching out?",
      answer:
        "A shortlist of product codes, quantities, sizes or colors where relevant, and your destination country will help your sales contact confirm availability quickly.",
    },
  ],
};

export default function SmallOrderWholesalePage() {
  return <SeoLandingLayout content={content} />;
}
