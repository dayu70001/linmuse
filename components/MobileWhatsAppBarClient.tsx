"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function MobileWhatsAppBarClient({ href }: { href: string }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-3 z-50 lg:hidden">
      <Link
        className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-gold bg-ink px-5 py-3 text-sm font-bold text-white shadow-[0_10px_24px_rgba(17,17,17,0.18)]"
        href={href}
      >
        <MessageCircle size={18} />
        Contact on WhatsApp
      </Link>
    </div>
  );
}
