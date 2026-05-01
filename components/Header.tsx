import { Send } from "lucide-react";
import Link from "next/link";
import MobileMenu from "@/components/MobileMenu";
import { siteConfig } from "@/config/site";
import { getSiteSettings, getSetting } from "@/lib/siteData";

export async function Header() {
  const settings = await getSiteSettings();
  const telegram = getSetting(settings, "telegram_channel") || siteConfig.telegramChannel || "/contact";

  return (
    <header className="sticky top-0 z-[9000] border-b border-[#E8E2D4] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-8 lg:px-10">
        <Link href="/" className="font-serif text-xl font-semibold text-ink sm:text-2xl">
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

        <Link className="btn-primary hidden md:inline-flex" href={telegram}>
          <Send size={16} />
          Join Telegram Group
        </Link>

        <MobileMenu telegramHref={telegram} />
      </div>
    </header>
  );
}
