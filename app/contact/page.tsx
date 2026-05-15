import { Mail, PackageSearch } from "lucide-react";
import Link from "next/link";
import { SafeEmailLink } from "@/components/SafeEmailLink";
import { SectionHeading } from "@/components/SectionHeading";
import { siteConfig } from "@/config/site";
import { getHomepageSettings } from "@/lib/homepageSettings";

// Render on every request so admin email changes (R2 settings JSON) appear immediately.
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const settings = await getHomepageSettings();
  const { telegram, whatsapp, instagram, facebook, email: settingsEmail } = settings.social;

  const telegram_url    = telegram    || siteConfig.telegramChannel || "/contact";
  const whatsapp_url    = whatsapp    || "/contact";
  const instagram_url   = instagram   || siteConfig.instagramUrl    || "/contact";
  const facebook_url    = facebook    || siteConfig.facebookUrl     || "/contact";
  const email           = settingsEmail || siteConfig.email;

  const [emailUser, ...emailDomainParts] = email.split("@");
  const emailDomain = emailDomainParts.join(".").replace(/^\./, "") || "gmail.com";

  const cards = [
    {
      title: "Telegram",
      text: "New arrivals, shipping proof, buyer updates, and brand announcements.",
      iconLabel: "TG",
      href: telegram_url,
    },
    {
      title: "WhatsApp",
      text: "Product updates and announcements when available.",
      iconLabel: "WA",
      href: whatsapp_url,
    },
    {
      title: "Instagram",
      text: "Selected product previews and visual updates.",
      iconLabel: "IG",
      href: instagram_url,
    },
    {
      title: "Facebook",
      text: "Brand, catalog, and update posts.",
      iconLabel: "FB",
      href: facebook_url,
    },
  ];

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
                    <span className="text-sm font-black tracking-tight text-gold">{card.iconLabel}</span>
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
              <div className="mt-5 grid gap-3 text-sm font-semibold text-muted sm:grid-cols-2">
                <Link href={telegram_url}>Telegram</Link>
                <Link href={whatsapp_url}>WhatsApp</Link>
                <Link href={instagram_url}>Instagram</Link>
                <Link href={facebook_url}>Facebook</Link>
                <SafeEmailLink user={emailUser} domain={emailDomain}>
                  <Mail className="mr-2 inline text-gold" size={16} />
                  Email
                </SafeEmailLink>
              </div>
              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
