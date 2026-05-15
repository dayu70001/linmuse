import { Send } from "lucide-react";
import Link from "next/link";
import MobileMenu from "@/components/MobileMenu";
import { siteConfig } from "@/config/site";
import { getHomepageSettings } from "@/lib/homepageSettings";

export async function Header() {
  const settings = await getHomepageSettings();
  const telegram = settings.social.telegram || siteConfig.telegramChannel || "/contact";

  return (
    <header className="sticky top-0 z-[200] border-b border-[#E8E2D4] bg-white pointer-events-auto">
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
          <Link className="text-sm font-semibold text-muted transition hover:text-gold" href="/track-order">
            Track Order
          </Link>
        </nav>

        <Link className="btn-primary hidden md:inline-flex" href={telegram}>
          <Send size={16} />
          Telegram Updates
        </Link>

        <MobileMenu telegramHref={telegram} />
      </div>
    </header>
  );
}
