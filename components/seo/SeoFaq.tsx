import type { FaqItem } from "@/lib/seo";

export function SeoFaq({ items }: { items: FaqItem[] }) {
  return (
    <div className="mt-6 grid gap-3">
      {items.map((item) => (
        <details className="card group p-5 open:bg-paper" key={item.question}>
          <summary className="cursor-pointer list-none font-serif text-lg text-ink marker:content-none">
            <span className="flex items-center justify-between gap-4">
              {item.question}
              <span aria-hidden="true" className="shrink-0 text-gold group-open:rotate-45">
                +
              </span>
            </span>
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
