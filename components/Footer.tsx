import Link from "next/link";
import { siteConfig } from "@/config/site";
import { getSiteSettings, getSetting } from "@/lib/siteData";

export async function Footer() {
  const settings = await getSiteSettings();
  const whatsappWholesale = getSetting(settings, "whatsapp_wholesale") || siteConfig.whatsappWholesale;
  const telegram = getSetting(settings, "telegram_channel") || siteConfig.telegramChannel;
  const instagram = getSetting(settings, "instagram_url") || siteConfig.instagramUrl;
  const facebook = getSetting(settings, "facebook_url") || siteConfig.facebookUrl;
  const email = getSetting(settings, "email") || siteConfig.email;
  const contactLinks = [
    ["WhatsApp Sales", whatsappWholesale ? `https://wa.me/${whatsappWholesale}` : "/contact"],
    ["Retail & Wholesale", whatsappWholesale ? `https://wa.me/${whatsappWholesale}` : "/contact"],
    ["Telegram Channel", telegram || "/contact"],
    ["Instagram", instagram || "/contact"],
    ["Facebook", facebook || "/contact"],
    ["Email", `mailto:${email}`],
  ];

  return (
    <footer className="border-t border-line bg-ink pb-20 text-white lg:pb-0">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <div className="font-serif text-2xl">{siteConfig.brandName}</div>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
            {siteConfig.description}
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
          </div>
        </div>
        <div>
          <h3 className="text-sm font-bold text-gold">Contact</h3>
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
