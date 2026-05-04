import Link from "next/link";
import { siteConfig } from "@/config/site";
import { getSiteSettings, getSetting } from "@/lib/siteData";

export async function Footer() {
  const settings = await getSiteSettings();
  const telegram = getSetting(settings, "telegram_channel") || siteConfig.telegramChannel;
  const whatsappGroup = getSetting(settings, "whatsapp_group_url");
  const instagram = getSetting(settings, "instagram_url") || siteConfig.instagramUrl;
  const facebook = getSetting(settings, "facebook_url") || siteConfig.facebookUrl;
  const email = getSetting(settings, "email") || siteConfig.email;
  const contactLinks = [
    ["Telegram Group", telegram || "/contact"],
    ["WhatsApp Group", whatsappGroup || "/contact"],
    ["Instagram", instagram || "/contact"],
    ["Facebook", facebook || "/contact"],
    ["Email", `mailto:${email}`],
  ];

  return (
    <footer className="border-t border-line bg-ink text-white">
      <div className="container-page grid gap-8 py-10 md:grid-cols-[1.2fr_0.8fr_0.8fr]">
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
          <h3 className="text-sm font-bold text-gold">Follow Daily Updates</h3>
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
