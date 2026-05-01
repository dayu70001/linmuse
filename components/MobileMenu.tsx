"use client";

import Link from "next/link";
import { useState } from "react";

export default function MobileMenu({ telegramHref = "/contact" }: { telegramHref?: string }) {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);
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
    <div className="relative z-[10000] md:hidden">
      <button
        type="button"
        aria-label="Toggle mobile menu"
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        onClick={() => setOpen((value) => !value)}
        className="relative z-[10002] flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl border border-[#E8E2D4] bg-white text-3xl leading-none text-[#111111] pointer-events-auto"
      >
        ☰
      </button>

      {open ? (
        <div
          id="mobile-menu-panel"
          className="fixed left-0 right-0 top-[72px] z-[10001] border-t border-[#E8E2D4] bg-white px-5 py-5 shadow-xl pointer-events-auto"
        >
          <nav className="flex flex-col gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-2 py-2 text-base font-medium text-[#111111]"
              >
                {link.label}
              </Link>
            ))}

            <Link
              href={telegramHref}
              onClick={closeMenu}
              className="mt-2 rounded-full bg-[#111111] px-5 py-3 text-center text-base font-semibold text-white"
            >
              Join Telegram Group
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
