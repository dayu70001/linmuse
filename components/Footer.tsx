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

  const exploreLinks: [string, string][] = [
    ["Home", "/"],
    ["Catalog", "/catalog"],
    ["New Arrivals", "/new-arrivals"],
    ["Shipping Proof", "/shipping-proof"],
    ["Retail & Wholesale Guide", "/wholesale-guide"],
  ];

  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <div className="font-serif text-2xl">{siteConfig.brandName}</div>
          <ul className="mt-4 grid max-w-md gap-1.5 text-sm leading-6 text-white/65">
            <li>• Apparel, shoes, watches &amp; bags</li>
            <li>• Selected lifestyle accessories</li>
            <li>• Retail first · Wholesale available</li>
            <li>• Flexible orders from single pieces</li>
            <li>• Save product IDs before asking details</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gold">Explore</h3>
          <div className="mt-4 grid gap-3 text-sm text-white/70">
            {exploreLinks.map(([label, href]) => (
              <Link href={href} key={href}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gold">Official Channels</h3>
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
