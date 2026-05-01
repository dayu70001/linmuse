import { SectionHeading } from "@/components/SectionHeading";

export default function AboutPage() {
  return (
    <main className="bg-white">
      <section className="section-pad">
        <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="eyebrow">About</p>
            <h1 className="mt-3 font-serif text-5xl leading-tight text-ink">
              LM Dkbrand is a factory-direct retail and wholesale catalog.
            </h1>
          </div>
          <div className="text-base leading-8 text-muted">
            <p>
              LM Dkbrand offers apparel, shoes, watches, and bags for both
              retail and wholesale buyers. LM represents personal product
              selection and customer service, while Dkbrand represents the
              supply resource background.
            </p>
            <p className="mt-5">
              The goal is to make product browsing cleaner, faster, and more
              useful for individual buyers, resellers, boutiques, and online
              sellers, with orders from 1 piece and delivery support in
              7-12 business days.
            </p>
          </div>
        </div>
      </section>
      <section className="section-pad bg-paper">
        <div className="container-page">
          <SectionHeading title="Clean sourcing, selected presentation" />
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {["Factory direct supply", "Orders from 1 piece", "Retail & wholesale support"].map((item) => (
              <div className="card p-6" key={item}>
                <h2 className="font-serif text-2xl text-ink">{item}</h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Built to help buyers review products without the clutter of a large supplier portal.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
