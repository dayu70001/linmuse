import type { Metadata } from "next";
import { SeoGuideLayout, type SeoGuideContent } from "@/components/seo/SeoGuideLayout";
import { buildCanonical, SITE_NAME } from "@/lib/seo";

const title = "How to Choose a Wholesale Supplier | LM Dkbrand";
const description = "Use a practical wholesale supplier checklist to assess business information, samples, communication, order details, shipping responsibility, records, and risk signals.";
const canonical = buildCanonical("/how-to-choose-a-wholesale-supplier");

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  openGraph: { title, description, url: canonical, siteName: SITE_NAME, type: "article" },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: true, follow: true },
};

const content: SeoGuideContent = {
  eyebrow: "Wholesale buying guide",
  h1: "How to Choose a Wholesale Supplier",
  intro: "Choosing a wholesale supplier is a verification process, not a decision based on the lowest quote or the largest catalog. A useful evaluation checks who the supplier is, whether product information can be confirmed, how clearly the team communicates, what each side is responsible for, and whether the order can be documented from the first inquiry through delivery.",
  breadcrumbs: [
    { name: "Home", path: "/" },
    { name: "Guides", path: "/guides" },
    { name: "How to Choose a Wholesale Supplier", path: "/how-to-choose-a-wholesale-supplier" },
  ],
  sections: [
    {
      heading: "1. Verify the Supplier's Business Information",
      paragraphs: [
        "Start with information that can be checked consistently: the supplier's trading name, official website, active contact channels, product categories, and stated order process. Look for the same identity across the places where the business communicates. Inconsistent names, unexplained payment recipients, copied contact details, or repeated pressure to leave an official channel deserve additional scrutiny.",
        "Verification does not mean that every legitimate supplier will publish the same documents or operate from the same type of facility. It means the supplier should be able to explain who receives the order, who confirms product details, how payment instructions are issued, and how the buyer can return to the same accountable contact if a question arises later.",
      ],
    },
    {
      heading: "2. Inspect Products and Use Samples Carefully",
      paragraphs: [
        "A catalog is useful for discovery, but a product should be discussed through an exact product code or another stable identifier. Save the listing, code, images, and the date of the inquiry. Ask which details are current, including materials, dimensions, sizes, colors, construction, packaging, and available quantities. Do not treat a general category description as confirmation for a specific item.",
        "When fit, finish, material, or construction is important, a limited test order can provide more useful evidence than a long conversation. Evaluate the item against the requirements you set before ordering, not only against first impressions. Record what was received and which code it relates to, because that information will matter if you later ask for a repeat quantity.",
      ],
    },
    {
      heading: "3. Evaluate Communication Quality",
      paragraphs: [
        "Good communication is specific. A reliable response should distinguish confirmed information from details that still need checking. Notice whether questions about a particular code receive product-specific answers, whether changes are documented, and whether the supplier flags uncertainty rather than filling gaps with assumptions.",
        "Response speed can matter, but speed alone is not proof of quality. A slower accurate confirmation may be more useful than an immediate promise that ignores sizes, colors, quantities, or destination. Use the early conversation to test whether the supplier can keep several product codes and requirements organized without losing or changing important details.",
      ],
    },
    {
      heading: "4. Confirm Codes, Sizes, Colors, and Quantities",
      paragraphs: [
        "Prepare a line-by-line order list before payment. Each line should contain the product code, requested size or dimensions, color, quantity, and any product detail that affects acceptance. If alternatives are allowed, state the exact conditions under which a substitution can be considered. Silence should not be interpreted as permission to replace an unavailable item.",
        "Ask the supplier to confirm the final list in a format that can be saved. Compare that confirmation with the invoice or payment request. If the order includes several categories, separate them clearly so that an apparel size is not confused with a shoe size or a bag color request is not applied to another product code.",
      ],
    },
    {
      heading: "5. Clarify Shipping and Import Responsibility",
      paragraphs: [
        "Shipping options depend on origin, destination, order size, product type, and the service selected. Ask what the quote includes, when dispatch is expected, which tracking information will be provided, and what events could change the estimate. Avoid treating an example delivery time as a guarantee for every order or destination.",
        "Buyers should also determine who is responsible for import requirements, duties, taxes, customs information, restricted goods checks, and delivery after arrival in the destination market. A supplier can explain the shipping option offered on its side, but the buyer should independently verify obligations that apply in the destination country.",
      ],
    },
    {
      heading: "6. Keep Complete Order Records",
      paragraphs: [
        "Store the product shortlist, confirmed order list, invoice, payment record, shipping confirmation, tracking reference, and important messages together. Add dates and identify the contact who supplied each confirmation. Clear records reduce confusion during the order and provide evidence for comparing future service.",
        "After delivery, record discrepancies, product feedback, sizes that performed well, and any codes you may reorder. A supplier relationship becomes easier to evaluate over several transactions when the buyer can compare what was promised, what was confirmed, and what was received rather than relying on memory.",
      ],
    },
    {
      heading: "7. Recognize Common Risk Signals",
      paragraphs: [
        "Risk signals include pressure to pay before product details are confirmed, sudden changes to payment instructions, refusal to use product codes, promises that ignore destination or quantity, inconsistent explanations, and unwillingness to document the final order. One signal may have an innocent explanation, but several together should pause the purchase.",
        "Be cautious when every item is described as permanently available, every destination is promised the same delivery time, or questions about materials and sizing receive only promotional answers. A credible supplier should be able to say when availability or a detail needs to be checked rather than presenting uncertainty as a guarantee.",
      ],
    },
    {
      heading: "8. Use a Final Pre-Order Checklist",
      paragraphs: [
        "Before paying, compare the confirmed order with your original requirements and resolve every material difference. Make sure the supplier, order, payment request, destination, and shipping discussion all refer to the same transaction. If a detail is important enough to affect acceptance, put it in the written confirmation.",
      ],
      bullets: [
        "Supplier identity and official contact channel checked",
        "Exact product codes and current availability reviewed",
        "Sizes, colors, quantities, materials, and essential details confirmed",
        "Substitution rules documented or substitutions prohibited",
        "Payment recipient and invoice details checked",
        "Shipping scope, tracking, and destination responsibilities clarified",
        "Order documents and messages saved in one record",
      ],
    },
  ],
  faqs: [
    { question: "Is the lowest wholesale price the best way to choose a supplier?", answer: "No. Price should be assessed together with product verification, communication, order accuracy, payment clarity, shipping responsibility, and the supplier's ability to document what has been confirmed." },
    { question: "Should I place a sample or test order first?", answer: "A limited test can be useful when fit, material, construction, or service quality matters, but the test should use exact product codes and a written list of what you plan to evaluate." },
    { question: "What should be documented before payment?", answer: "Document the supplier and payment details, product codes, sizes or dimensions, colors, quantities, essential product requirements, substitution rules, destination, and the agreed shipping scope." },
  ],
  relatedLinks: [
    { href: "/catalog", label: "Browse the Catalog" },
    { href: "/shipping-proof", label: "Review Shipping Proof" },
    { href: "/wholesale-guide", label: "Read the Order Guide" },
    { href: "/wholesale-clothing", label: "Wholesale Clothing" },
    { href: "/wholesale-shoes", label: "Wholesale Shoes" },
    { href: "/wholesale-bags", label: "Wholesale Bags" },
    { href: "/wholesale-watches", label: "Wholesale Watches" },
  ],
};

export default function Page() {
  return <SeoGuideLayout content={content} />;
}
