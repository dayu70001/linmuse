import Link from "next/link";
import { siteConfig } from "@/config/site";
import { getHomepageSettings } from "@/lib/homepageSettings";

export async function Footer() {
  const settings = await getHomepageSettings();
  const { telegram, whatsapp, instagram, facebook, email } = settings.social;

  // Email click target uses R2 home_contact_email → siteConfig.email → support@linmuse.com.
  // We keep the visible label as "Email" (no raw address text) to preserve anti-scrape, but
  // the mailto: href reflects the current configured address.
  const resolvedEmail = email || siteConfig.email || "support@linmuse.com";
  const emailHref     = `mailto:${resolvedEmail}`;

  const contactLinks: [string, string][] = [
    ["Telegram",      telegram || siteConfig.telegramChannel || "/contact"],
    ["WhatsApp",      whatsapp || "/contact"],
    ["Instagram",      instagram || siteConfig.instagramUrl || "/contact"],
    ["Facebook",       facebook || siteConfig.facebookUrl || "/contact"],
    ["Email",          emailHref],
  ];

  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <div className="font-serif text-2xl">{siteConfig.brandName}</div>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
            Factory-direct fashion selections for retail and wholesale buyers. Orders start from 1 piece.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gold">Links</h3>
          <div className="mt-4 grid gap-3 text-sm text-white/70">
            {siteConfig.nav.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/track-order">Track Order</Link>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gold">Follow Official Channels</h3>
          <div className="mt-4 grid gap-3 text-sm text-white/70">
            {contactLinks.map(([label, href]) => (
              <Link href={href} key={label}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
