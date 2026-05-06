import Link from 'next/link';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/catalog', label: 'Catalog' },
  { href: '/new-arrivals', label: 'New Arrivals' },
  { href: '/track-order', label: 'Track Order' },
  { href: '/shipping-proof', label: 'Shipping Proof' },
  { href: '/wholesale-guide', label: 'Retail & Wholesale Guide' },
  { href: '/contact', label: 'Contact' },
];

export default function MobileMenu({ telegramHref = '/contact' }: { telegramHref?: string }) {
  return (
    <details className="relative z-[100] md:hidden">
      <summary
        aria-label="Open navigation menu"
        className="flex h-12 w-12 cursor-pointer list-none items-center justify-center rounded-2xl border border-neutral-200 bg-white text-2xl font-semibold text-neutral-900 shadow-sm active:scale-[0.98] [&::-webkit-details-marker]:hidden"
      >
        <span aria-hidden="true">☰</span>
      </summary>

      <nav
        aria-label="Mobile navigation"
        className="absolute right-0 top-full z-[120] mt-3 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-neutral-200 bg-white p-2 shadow-2xl"
      >
        <div className="flex flex-col">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl px-4 py-4 text-base font-semibold text-neutral-900 hover:bg-neutral-100 active:bg-neutral-200"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href={telegramHref}
            className="mt-1 rounded-2xl bg-neutral-900 px-4 py-4 text-center text-base font-semibold text-white active:bg-neutral-800"
          >
            Join Telegram Group
          </Link>
        </div>
      </nav>
    </details>
  );
}
