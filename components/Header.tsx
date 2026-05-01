import { MessageCircle } from "lucide-react";
import Link from "next/link";
import MobileMenu from "@/components/MobileMenu";
import { siteConfig } from "@/config/site";
import { getSiteSettings, getSetting } from "@/lib/siteData";
import { whatsappUrl } from "@/lib/whatsapp";

export async function Header() {
  const settings = await getSiteSettings();
  const whatsappWholesale = getSetting(settings, "whatsapp_wholesale") || siteConfig.whatsappWholesale;
  const whatsappHref = whatsappUrl(
    whatsappWholesale,
    "Hi, I want to ask about LM Dkbrand products."
  );

  return (
    <header className="sticky top-0 z-[9000] border-b border-[#E8E2D4] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
        <Link href="/" className="font-serif text-2xl font-semibold text-ink">
          {siteConfig.brandName}
        </Link>

        <nav className="hidden items-center gap-5 md:flex" aria-label="Desktop navigation">
          {siteConfig.nav.map((item) => (
            <Link
              className="text-sm font-semibold text-muted transition hover:text-gold"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link className="btn-primary hidden md:inline-flex" href={whatsappHref}>
          <MessageCircle size={17} />
          Contact on WhatsApp
        </Link>

        <MobileMenu />
      </div>
    </header>
  );
}
