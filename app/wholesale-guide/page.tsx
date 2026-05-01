import { SectionHeading } from "@/components/SectionHeading";

const guideSections = [
  ["Retail Orders", "Choose a product and send the product ID, size, color, quantity, and destination on WhatsApp."],
  ["Wholesale Orders", "Send product IDs, quantities, size range, and destination country for quotation support."],
  ["Orders from 1 Piece", "Retail and small orders can start from 1 piece. Larger reseller and boutique orders are also supported."],
  ["Delivery Time", "Most orders are delivered within 7-12 business days after confirmation, depending on product type, quantity, and destination."],
  ["Payment & Shipping", "Payment and shipping options are confirmed after product availability and destination details are reviewed."],
  ["WhatsApp Inquiry Process", "Send clear product IDs and order details. Our team will reply with current availability and next steps."],
];

export default function WholesaleGuidePage() {
  return (
    <main className="bg-white">
      <section className="section-pad">
        <div className="container-page">
          <SectionHeading
            eyebrow="Retail & wholesale guide"
            title="Retail & Wholesale Guide"
            text="A concise process for individual buyers, resellers, boutiques, and online sellers."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guideSections.map(([title, text], index) => (
              <article className="card p-6" key={title}>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="mt-3 font-serif text-2xl text-ink">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
