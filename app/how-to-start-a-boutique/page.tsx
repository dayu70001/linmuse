import type { Metadata } from "next";
import { SeoGuideLayout, type SeoGuideContent } from "@/components/seo/SeoGuideLayout";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "How to Start a Boutique: Inventory & Sourcing Guide | LM Dkbrand";
const description = "Learn how to define a boutique customer, choose initial categories, control opening inventory, test small orders, plan sizes and colors, and manage reordering risk.";
const canonical = buildCanonical("/how-to-start-a-boutique");

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical, siteName: SITE_NAME, type: "article" },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

const content: SeoGuideContent = {
  eyebrow: "Boutique planning guide",
  h1: "How to Start a Boutique",
  intro: "Starting a boutique requires more than finding attractive products. The opening assortment needs a defined customer, a limited category plan, controlled inventory, useful records, and a process for learning from sales before committing more cash. This guide focuses on merchandise and sourcing decisions; it does not provide legal, tax, accounting, or profit guarantees.",
  breadcrumbs: [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: "How to Start a Boutique", path: "/how-to-start-a-boutique" },
  ],
  sections: [
    {
      heading: "1. Define the Customer Before Choosing Products",
      paragraphs: [
        "A boutique assortment becomes easier to plan when it serves a recognizable customer rather than a vague idea of what is fashionable. Describe the customer's age range only if it is genuinely useful, but focus more on lifestyle, buying occasion, fit needs, preferred price position, climate, and the situations in which the products will be used.",
        "Write a short customer statement and use it to reject products as well as select them. A product can be appealing without belonging in the opening assortment. Consistency helps customers understand the boutique and prevents the first order from becoming a collection of unrelated personal preferences.",
      ],
    },
    {
      heading: "2. Choose a Focused Set of Initial Categories",
      paragraphs: [
        "Begin with categories that work together for the target customer. A clothing-led boutique might add a limited bag or shoe selection, while an accessories-led concept may not need a deep apparel size range immediately. Each added category increases the number of product codes, variants, questions, and replenishment decisions that must be managed.",
        "Use the catalog to compare actual products, then build a shortlist around a clear role for every item. Core products should support the boutique's main identity. Smaller test groups can explore a new shape, color direction, or secondary category without allowing experiments to dominate the opening inventory.",
      ],
    },
    {
      heading: "3. Control the First Inventory Commitment",
      paragraphs: [
        "Opening inventory should create enough choice to communicate the concept without requiring every possible style, size, and color. Too little variety can make the boutique feel unfinished, but too much depth in untested products can tie up cash and storage before real demand is known.",
        "Set a maximum quantity by product code and decide which products justify size or color depth. Keep a reserve for reorders, operating expenses, packaging, content production, or unexpected delays. The appropriate amount depends on the business and market, so this guide does not prescribe a universal startup budget or purchasing formula.",
      ],
    },
    {
      heading: "4. Use Small Orders to Test Demand",
      paragraphs: [
        "A small initial order can test product quality, fit, customer interest, photography needs, and the ordering process before a larger purchase. The goal is not simply to buy fewer items; it is to define what the test should teach and to preserve enough information to act on the result.",
        "Choose a manageable group of product codes, record why each was selected, and decide what would justify a reorder. A product may attract attention but sell slowly, while a quieter item may generate repeat demand. Use completed sales, returns, questions, and fit feedback together rather than relying on social engagement alone.",
      ],
    },
    {
      heading: "5. Plan Sizes and Colors Deliberately",
      paragraphs: [
        "Apparel and shoes require a size strategy. Use whatever reliable customer information is available, then prepare a size breakdown for each code instead of ordering the same mix automatically. Ask for style-specific sizing information because one product's measurements or fit notes should not be assumed to apply to another.",
        "Color planning also needs restraint. A broad color range can create choice but divide the quantity across variants that are difficult to evaluate. Select colors that support the boutique concept, local season, and existing assortment, then use sales evidence to decide whether a future order needs more depth or more variety.",
      ],
    },
    {
      heading: "6. Keep SKU and Reorder Records",
      paragraphs: [
        "Create a record for every product code that includes category, description, ordered sizes or dimensions, colors, quantities, order date, received quantity, and any confirmed product notes. Add the supplier reference and the location of supporting photographs or messages. Consistent records prevent similar-looking items from being confused.",
        "Track sales and remaining quantity against the same code. When a product approaches a reorder point, check whether demand is consistent or driven by a short event. A repeat inquiry should reference the original code while recognizing that current availability, product details, and delivery options still need confirmation.",
      ],
    },
    {
      heading: "7. Expand Only After Reviewing Evidence",
      paragraphs: [
        "Review the opening assortment by product, category, size, color, and selling period. Identify products that sold, products that generated questions but not purchases, variants that remained, and requests that the assortment could not meet. This review is more useful than a general impression that the launch was busy or quiet.",
        "Expansion can mean increasing a proven quantity, adding a related product, introducing another size or color, or testing a new category. Make one understandable change at a time where possible. If every part of the assortment changes together, it becomes difficult to know which decision improved or weakened the result.",
      ],
    },
    {
      heading: "8. Protect Cash Flow and Limit Inventory Risk",
      paragraphs: [
        "Inventory converts cash into products that may take time to sell. Include purchasing, shipping, import obligations, packaging, payment costs, returns, storage, markdowns, and operating expenses in the planning process. Seek qualified local advice for legal, tax, and accounting requirements because these vary by location and business structure.",
        "Avoid assuming that every product will sell at the planned price or within the planned period. Use conservative reorder decisions, keep clear records of money committed to stock, and review slow-moving items before adding more depth. No supplier, product mix, or planning method can guarantee boutique profitability.",
      ],
      bullets: [
        "Define the customer and boutique position",
        "Choose a limited opening category structure",
        "Shortlist exact product codes and intended roles",
        "Plan size, color, and quantity by product",
        "Set learning goals for small test orders",
        "Record receipts, sales, remaining stock, and feedback",
        "Reorder or expand only after reviewing evidence",
      ],
    },
  ],
  faqs: [
    { question: "How much money does it take to start a boutique?", answer: "There is no universal amount. Inventory, shipping, premises, technology, packaging, professional advice, and operating costs vary widely, so prepare a location-specific plan instead of relying on a generic startup figure." },
    { question: "Should a new boutique start with many product categories?", answer: "Usually it is easier to evaluate a focused group of categories that fit one target customer. Additional categories can be tested after the opening assortment produces useful sales and feedback." },
    { question: "What is the difference between this guide and the Boutique Fashion Supplier page?", answer: "This page is an educational framework for customer definition, assortment planning, inventory control, records, and testing. The Boutique Fashion Supplier page explains LM Dkbrand's commercial sourcing model." },
  ],
  relatedLinks: [
    { href: "/catalog", label: "Browse the Catalog" },
    { href: "/boutique-fashion-supplier", label: "Boutique Fashion Supplier" },
    { href: "/small-order-wholesale", label: "Small Order Wholesale" },
    { href: "/wholesale-clothing", label: "Wholesale Clothing" },
    { href: "/wholesale-shoes", label: "Wholesale Shoes" },
    { href: "/wholesale-bags", label: "Wholesale Bags" },
    { href: "/catalog/wholesale-t-shirts", label: "T-Shirts Collection" },
    { href: "/catalog/wholesale-sneakers", label: "Sneakers Collection" },
    { href: "/catalog/wholesale-handbags", label: "Handbags Collection" },
  ],
};

export default function Page() {
  return <SeoGuideLayout content={content} />;
}
