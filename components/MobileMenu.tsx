"use client";

import Link from "next/link";

export default function MobileMenu({ telegramHref = "/contact" }: { telegramHref?: string }) {
  const closeMenu = () => {
    const toggle = document.getElementById("lm-mobile-menu-toggle") as HTMLInputElement | null;
    if (toggle) toggle.checked = false;
  };

  const links = [
    { label: "Home", href: "/" },
    { label: "Catalog", href: "/catalog" },
    { label: "New Arrivals", href: "/new-arrivals" },
    { label: "Factory Direct", href: "/#factory-direct" },
    { label: "Shipping Proof", href: "/shipping-proof" },
    { label: "Retail & Wholesale Guide", href: "/wholesale-guide" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <div className="relative md:hidden">
      <input id="lm-mobile-menu-toggle" type="checkbox" className="peer sr-only" />

      <label
        htmlFor="lm-mobile-menu-toggle"
        aria-label="Toggle mobile menu"
        className="flex h-12 w-12 cursor-pointer select-none items-center justify-center rounded-xl border border-[#E8E2D4] bg-white text-3xl leading-none text-[#111111] shadow-sm"
      >
        ☰
      </label>

      <div
        id="mobile-menu-panel"
        className="fixed left-0 right-0 top-[73px] z-[9999] hidden border-t border-[#E8E2D4] bg-white px-8 py-7 shadow-xl peer-checked:block"
      >
        <nav className="mx-auto flex max-w-md flex-col gap-7">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMenu}
              className="text-[22px] font-medium leading-none text-[#111111]"
            >
              {link.label}
            </Link>
          ))}

          <Link
            href={telegramHref}
            onClick={closeMenu}
            className="mt-2 rounded-full bg-[#111111] px-5 py-4 text-center text-[20px] font-semibold text-white"
          >
            Join Telegram Group
          </Link>
        </nav>
      </div>
    </div>
  );
}
