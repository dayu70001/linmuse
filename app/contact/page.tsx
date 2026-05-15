import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { siteConfig } from "@/config/site";
import { getHomepageSettings } from "@/lib/homepageSettings";

// Render on every request so admin email changes (R2 settings JSON) appear immediately.
export const dynamic = "force-dynamic";

function ChannelIcon({ name }: { name: "Telegram" | "WhatsApp" | "Instagram" | "Facebook" }) {
  if (name === "Telegram") {
    return (
      <svg aria-hidden="true" className="h-6 w-6 text-gold" fill="none" viewBox="0 0 24 24">
        <path d="M20.5 4.5 3.8 11.2c-.9.4-.8 1.6.1 1.8l4.1 1.1 1.6 4.7c.3.8 1.3 1 1.9.3l2.4-2.8 4.4 3.2c.7.5 1.7.1 1.8-.8l2.1-13c.1-.8-.8-1.4-1.7-1.1Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="m8.2 14 8.2-5.4-6.3 7.6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
      </svg>
    );
  }
  if (name === "WhatsApp") {
    return (
      <svg aria-hidden="true" className="h-6 w-6 text-gold" fill="none" viewBox="0 0 24 24">
        <path d="M5.4 18.6 6.3 15A7.4 7.4 0 1 1 9 17.8l-3.6.8Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
        <path d="M9.4 8.9c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.5c.1.3 0 .5-.2.7l-.4.5c.6 1.1 1.5 1.9 2.6 2.5l.5-.5c.2-.2.5-.3.7-.2l1.5.7c.3.1.4.3.4.6v.5c0 .4-.2.6-.5.8-.5.3-1.2.4-2 .2-2.7-.6-5.2-3-5.8-5.7-.2-.7-.1-1.2.2-1.7Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
      </svg>
    );
  }
  if (name === "Instagram") {
    return (
      <svg aria-hidden="true" className="h-6 w-6 text-gold" fill="none" viewBox="0 0 24 24">
        <rect height="15" rx="4" stroke="currentColor" strokeWidth="1.7" width="15" x="4.5" y="4.5" />
        <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="16.4" cy="7.7" fill="currentColor" r="1" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" className="h-6 w-6 text-gold" fill="none" viewBox="0 0 24 24">
      <path d="M14 8.2h2.2V4.8h-2.8c-3 0-4.5 1.8-4.5 4.7v2H6.6v3.6h2.3v5.1h3.8v-5.1h2.9l.5-3.6h-3.4V9.8c0-1 .4-1.6 1.3-1.6Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
    </svg>
  );
}

export default async function ContactPage() {
  const settings = await getHomepageSettings();
  const { telegram, whatsapp, instagram, facebook } = settings.social;

  const telegram_url    = telegram    || siteConfig.telegramChannel || "/contact";
  const whatsapp_url    = whatsapp    || "/contact";
  const instagram_url   = instagram   || siteConfig.instagramUrl    || "/contact";
  const facebook_url    = facebook    || siteConfig.facebookUrl     || "/contact";

  const cards = [
    {
      title: "Telegram",
      text: "New arrivals, shipping proof, buyer updates, and brand announcements.",
      href: telegram_url,
    },
    {
      title: "WhatsApp",
      text: "Product updates and announcements when available.",
      href: whatsapp_url,
    },
    {
      title: "Instagram",
      text: "Selected product previews and visual updates.",
      href: instagram_url,
    },
    {
      title: "Facebook",
      text: "Brand, catalog, and update posts.",
      href: facebook_url,
    },
  ] as const;

  return (
    <main className="bg-white">
      <section className="section-pad">
        <div className="container-page">
          <SectionHeading
            eyebrow="Contact"
            title="Official LM Dkbrand Channels"
            text="Browse the catalog, save the product ID or screenshot, and send the details to your assigned sales contact. The channels below are used for official product updates, brand announcements, and buyer information."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {cards.map((card) => {
              return (
                <Link className="card p-6 transition hover:border-gold/80" href={card.href} key={card.title}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-paper">
                    <ChannelIcon name={card.title} />
                  </div>
                  <h2 className="mt-5 font-serif text-2xl text-ink">{card.title}</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted">{card.text}</p>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="card p-6">
              <h2 className="font-serif text-2xl text-ink">Buyer Notes</h2>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-bold text-ink transition hover:border-gold"
                  href="/track-order"
                >
                  <PackageSearch size={17} />
                  Order Tracking
                </Link>
                <Link
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-white px-5 text-sm font-bold text-ink transition hover:border-gold"
                  href="/catalog"
                >
                  Browse Catalog
                </Link>
              </div>
            </div>
            <div className="card bg-paper p-6">
              <h2 className="font-serif text-2xl text-ink">Order details</h2>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-muted">
                <p>For retail orders, save the product ID, size, color, and destination details.</p>
                <p>For wholesale orders, prepare product IDs, quantities, size range, and destination country.</p>
                <p>For placed orders, use the tracking page or send the tracking number to your assigned sales contact.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
