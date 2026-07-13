import Link from "next/link";
import { SeoBreadcrumbs } from "@/components/seo/SeoBreadcrumbs";
import { SeoFaq } from "@/components/seo/SeoFaq";
import {
  buildBreadcrumbJsonLd,
  buildFaqJsonLd,
  jsonLdStringify,
  type BreadcrumbItem,
  type FaqItem,
} from "@/lib/seo";

export type SeoLandingSection = {
  heading: string;
  paragraphs: string[];
};

export type SeoLandingContent = {
  eyebrow: string;
  h1: string;
  intro: string;
  breadcrumbItems: BreadcrumbItem[];
  sections: SeoLandingSection[];
  faqs: FaqItem[];
};

const relatedLinks = [
  { label: "Browse the Catalog", href: "/catalog" },
  { label: "Shipping Proof", href: "/shipping-proof" },
  { label: "Track Your Order", href: "/track-order" },
  { label: "Retail & Wholesale Guide", href: "/wholesale-guide" },
];

export function SeoLandingLayout({ content }: { content: SeoLandingContent }) {
  const { eyebrow, h1, intro, breadcrumbItems, sections, faqs } = content;
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems);
  const faqJsonLd = buildFaqJsonLd(faqs);

  return (
    <main className="overflow-x-hidden bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdStringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdStringify(faqJsonLd) }}
      />

      <section className="section-pad">
        <div className="container-page max-w-3xl">
          <SeoBreadcrumbs items={breadcrumbItems} />

          <p className="eyebrow mt-6">{eyebrow}</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-5xl">{h1}</h1>
          <p className="mt-5 text-base leading-7 text-muted">{intro}</p>

          <div className="mt-8 grid gap-8">
            {sections.map((section) => (
              <article key={section.heading}>
                <h2 className="font-serif text-2xl text-ink">{section.heading}</h2>
                <div className="mt-3 grid gap-3">
                  {section.paragraphs.map((paragraph, index) => (
                    <p className="text-sm leading-7 text-muted sm:text-base" key={index}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 border-t border-line pt-8">
            <h2 className="font-serif text-2xl text-ink">Frequently Asked Questions</h2>
            <SeoFaq items={faqs} />
          </div>
        </div>
      </section>

      <section className="bg-paper py-10 sm:py-14">
        <div className="container-page text-center">
          <h2 className="font-serif text-3xl leading-tight text-ink sm:text-4xl">
            Ready to start an order?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-muted">
            Browse the catalog, save product IDs, and prepare quantity, size, color, and destination details before
            sending them to your assigned sales contact.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {relatedLinks.map((link, index) => (
              <Link
                className={index === 0 ? "btn-primary" : "btn-secondary"}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
