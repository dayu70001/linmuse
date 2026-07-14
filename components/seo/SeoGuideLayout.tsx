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

export type SeoGuideContent = {
  eyebrow: string;
  h1: string;
  intro: string;
  breadcrumbs: BreadcrumbItem[];
  sections: Array<{ heading: string; paragraphs: string[]; bullets?: string[] }>;
  faqs: FaqItem[];
  relatedLinks: Array<{ href: string; label: string }>;
};

export function SeoGuideLayout({ content }: { content: SeoGuideContent }) {
  return (
    <main className="overflow-x-hidden bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(buildBreadcrumbJsonLd(content.breadcrumbs)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdStringify(buildFaqJsonLd(content.faqs)) }} />

      <section className="section-pad">
        <article className="container-page max-w-3xl">
          <SeoBreadcrumbs items={content.breadcrumbs} />
          <p className="eyebrow mt-7">{content.eyebrow}</p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-ink sm:text-5xl">{content.h1}</h1>
          <p className="mt-5 text-base leading-7 text-muted sm:text-lg sm:leading-8">{content.intro}</p>

          <div className="mt-10 grid gap-10">
            {content.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-serif text-2xl text-ink sm:text-3xl">{section.heading}</h2>
                <div className="mt-4 grid gap-4">
                  {section.paragraphs.map((paragraph) => (
                    <p className="text-sm leading-7 text-muted sm:text-base" key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets ? (
                  <ul className="mt-5 grid gap-3 rounded-lg border border-line bg-paper p-5 text-sm leading-6 text-muted">
                    {section.bullets.map((item) => (
                      <li className="flex gap-3" key={item}>
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>

          <section className="mt-12 border-t border-line pt-9">
            <h2 className="font-serif text-3xl text-ink">Frequently Asked Questions</h2>
            <SeoFaq items={content.faqs} />
          </section>
        </article>
      </section>

      <section className="bg-paper py-10 sm:py-14">
        <div className="container-page max-w-4xl text-center">
          <h2 className="font-serif text-3xl text-ink">Continue Your Research</h2>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {content.relatedLinks.map((link, index) => (
              <Link className={index === 0 ? "btn-primary" : "btn-secondary"} href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
