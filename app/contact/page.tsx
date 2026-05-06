import { Mail, PackageSearch, Send, Share2, Users } from "lucide-react";
import Link from "next/link";
import { SafeEmailLink } from "@/components/SafeEmailLink";
import { SectionHeading } from "@/components/SectionHeading";
import { siteConfig } from "@/config/site";
import { getSetting, getSiteSettings } from "@/lib/siteData";

export default async function ContactPage() {
  const settings = await getSiteSettings();
  const telegram = getSetting(settings, "telegram_channel") || siteConfig.telegramChannel;
  const whatsappGroup = getSetting(settings, "whatsapp_group_url");
  const instagram = getSetting(settings, "instagram_url") || siteConfig.instagramUrl;
  const facebook = getSetting(settings, "facebook_url") || siteConfig.facebookUrl;
  const email = getSetting(settings, "email") || siteConfig.email;
  const [emailUser, ...emailDomainParts] = email.split("@");
  const emailDomain = emailDomainParts.join(".").replace(/^\./, "") || "gmail.com";
  const cards = [
    {
      title: "Telegram Group",
      text: "Join daily product updates, new arrivals, shipping proof, and buyer updates.",
      icon: Send,
      href: telegram || "/contact",
    },
    {
      title: "WhatsApp Group",
      text: "Use the group/community channel when available for product updates and announcements.",
      icon: Users,
      href: whatsappGroup || "/contact",
    },
    {
      title: "Instagram",
      text: "Follow selected product previews and visual updates.",
      icon: Share2,
      href: instagram || "/contact",
    },
    {
      title: "Facebook",
      text: "Follow brand and catalog updates.",
      icon: Share2,
      href: facebook || "/contact",
    },
  ];

  return (
    <main className="bg-white">
      <section className="section-pad">
        <div className="container-page">
          <SectionHeading
            eyebrow="Contact"
            title="Follow and Contact LM Dkbrand"
            text="Browse the catalog first, then save product IDs or screenshots before contacting our team through the available channels."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <Link className="card p-6 transition hover:border-gold/80" href={card.href} key={card.title}>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-paper">
                    <Icon className="text-gold" size={24} />
                  </div>
                  <h2 className="mt-5 font-serif text-2xl text-ink">{card.title}</h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted">{card.text}</p>
                </Link>
              );
            })}
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="card p-6">
              <h2 className="font-serif text-2xl text-ink">Customer Support</h2>
              <div className="mt-5 grid gap-3 text-sm font-semibold text-muted sm:grid-cols-2">
                <Link href={telegram || "/contact"}>Telegram Group</Link>
                <Link href={whatsappGroup || "/contact"}>WhatsApp Group</Link>
                <Link href={instagram || "/contact"}>Instagram</Link>
                <Link href={facebook || "/contact"}>Facebook</Link>
                <SafeEmailLink user={emailUser} domain={emailDomain}>
                  <Mail className="mr-2 inline text-gold" size={16} />
                  Email us
                </SafeEmailLink>
              </div>
              <Link
                className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-bold text-ink transition hover:border-gold"
                href="/track-order"
              >
                <PackageSearch size={17} />
                Already ordered? Track your shipment
              </Link>
            </div>
            <div className="card bg-paper p-6">
              <h2 className="font-serif text-2xl text-ink">Catalog notes</h2>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-muted">
                <p>For retail orders, save product ID, size, color, and destination details.</p>
                <p>For wholesale orders, prepare product IDs, quantity, size range, and destination country.</p>
                <p className="font-semibold text-ink">Typical response time: within 24 hours.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
