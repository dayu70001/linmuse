import Link from "next/link";

export default function MobileMenu() {
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
    <details className="relative z-[9999] md:hidden">
      <summary
        className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-xl border border-[#E8E2D4] bg-white text-3xl leading-none text-[#111111] [&::-webkit-details-marker]:hidden"
        aria-label="Open menu"
      >
        ☰
      </summary>

      <div className="fixed left-0 right-0 top-[72px] z-[9998] border-t border-[#E8E2D4] bg-white px-5 py-5 shadow-xl">
        <nav className="flex flex-col gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-2 py-2 text-base font-medium text-[#111111]"
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/contact"
            className="mt-2 rounded-full bg-[#111111] px-5 py-3 text-center text-base font-semibold text-white"
          >
            Contact on WhatsApp
          </Link>
        </nav>
      </div>
    </details>
  );
}
