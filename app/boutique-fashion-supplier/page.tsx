import type { Metadata } from "next";
import { SeoLandingLayout, type SeoLandingContent } from "@/components/seo/SeoLandingLayout";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "Boutique Fashion Supplier | LM Dkbrand";
const description =
  "LM Dkbrand supports boutique owners with factory-direct apparel, shoes, watches, and bags, flexible order quantities, and ongoing new arrivals.";
const canonical = buildCanonical("/boutique-fashion-supplier");

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
  eyebrow: "Boutique supply",
  h1: "Boutique Fashion Supplier",
  intro:
    "LM Dkbrand supplies boutique owners and small online sellers with apparel, shoes, watches, and bags, sourced factory-direct with flexible order quantities. This page covers how boutique buyers typically use the catalog, what to consider when building an assortment, and how orders are placed.",
  breadcrumbItems: [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: "Boutique Fashion Supplier", path: "/boutique-fashion-supplier" },
  ],
  sections: [
    {
      heading: "Sourcing for a Boutique Assortment",
      paragraphs: [
        "Boutique buyers often need a mix of products rather than a large quantity of a single item, since the goal is usually a curated selection that reflects a particular style or customer base. LM Dkbrand's catalog is organized by category and product code, which makes it easier to pull together a varied assortment from a single source.",
        "Because orders can start from 1 piece, boutique owners can bring in a small number of units across several product codes to test what resonates with their customers before committing to larger quantities on specific items.",
      ],
    },
    {
      heading: "Working Across Categories",
      paragraphs: [
        "Many boutique sellers source across more than one category, combining apparel with bags or watches to round out an offering. Since all categories are listed in the same catalog with consistent product codes, building a mixed order across categories works the same way as ordering within a single category.",
        "New arrivals are added on an ongoing basis, which gives boutique buyers a reason to check back periodically for newer product codes to refresh their assortment.",
      ],
    },
    {
      heading: "Planning and Placing an Order",
      paragraphs: [
        "A typical approach is to browse the catalog by category, shortlist product codes that fit the intended assortment, and send the list along with quantities and a destination country to an assigned sales contact. The contact confirms current availability before the order is finalized.",
        "Payment and shipping are reviewed once availability and destination are confirmed. Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
      ],
    },
    {
      heading: "Reordering Popular Items",
      paragraphs: [
        "Once a product code proves popular with customers, boutique owners can reorder it directly by referencing the code with their sales contact, who will confirm whether it is still currently available before processing the repeat order.",
        "This makes it practical to run a boutique catalog that rotates between newly tested items and a set of dependable, repeat-ordered product codes.",
      ],
    },
    {
      heading: "Communicating with Your Sales Contact",
      paragraphs: [
        "Boutique orders often involve more back-and-forth than a single-product order, since they cover multiple categories, sizes, and quantities at once. Sending a clear, organized shortlist of product codes with quantities alongside it helps your sales contact confirm availability faster and reduces the chance of items being left out of the final order.",
        "If a boutique assortment needs to be ready by a particular date, sharing that timeline early gives your sales contact the context needed to flag any product codes that may not be available in time, so alternatives can be considered before the order is finalized.",
      ],
    },
    {
      heading: "Building a Distinct Boutique Identity",
      paragraphs: [
        "Since the catalog is shared across many buyers, boutique owners often differentiate their offering through the specific combination of product codes they choose, rather than any single item being exclusive to them. A thoughtful, consistent selection across categories can still create a distinct identity for a boutique's customers.",
        "Reviewing which product codes have performed well over time, and comparing them against newer arrivals, helps refine that identity gradually rather than through one large, one-time order. This kind of ongoing curation tends to build a more consistent customer experience than restocking the same fixed selection indefinitely.",
      ],
    },
  ],
  faqs: [
    {
      question: "Can I order a small, mixed selection instead of one large quantity?",
      answer:
        "Yes, orders can start from 1 piece per product code, which suits a curated, mixed boutique assortment across multiple styles.",
    },
    {
      question: "Can I combine apparel, bags, and watches in one order?",
      answer:
        "Yes, all categories are listed in the same catalog with consistent product codes, so a single order can combine items across categories.",
    },
    {
      question: "How often are new products added?",
      answer:
        "New arrivals are added on an ongoing basis. Checking the catalog periodically is a good way to find newer product codes for a boutique assortment.",
    },
    {
      question: "How do I reorder an item that sold well?",
      answer:
        "Reference the original product code with your assigned sales contact, who will confirm current availability before processing a repeat order.",
    },
    {
      question: "What is the typical delivery time for a boutique order?",
      answer:
        "Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination.",
    },
  ],
};

export default function BoutiqueFashionSupplierPage() {
  return <SeoLandingLayout content={content} />;
}
