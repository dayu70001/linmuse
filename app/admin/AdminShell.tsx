"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { isSupabaseConfigured, signOutAdmin } from "@/lib/supabaseRest";

export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(pathname === "/admin/login");

  useEffect(() => {
    if (pathname === "/admin/login") {
      setReady(true);
      return;
    }

    const token = localStorage.getItem("lm_admin_access_token");
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    setReady(true);
  }, [pathname, router]);

  if (!isSupabaseConfigured()) {
    return (
      <main className="min-h-screen bg-paper px-5 py-10">
        <div className="mx-auto max-w-2xl rounded-xl bg-white p-7">
          <p className="eyebrow">Admin setup</p>
          <h1 className="mt-3 font-serif text-4xl text-ink">Supabase is not connected yet</h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to
            your local environment, then restart the website.
          </p>
        </div>
      </main>
    );
  }

  if (!ready) {
    return <main className="min-h-screen bg-paper" />;
  }

  return (
    <main className="min-h-screen bg-paper">
      {pathname !== "/admin/login" ? (
        <header className="border-b border-line bg-white">
          <div className="container-page flex min-h-16 items-center justify-between gap-4">
            <Link className="font-serif text-2xl text-ink" href="/admin">
              LM Dkbrand Admin
            </Link>
            <nav className="flex gap-4 overflow-x-auto text-sm font-semibold text-muted">
              <Link href="/admin">Dashboard</Link>
              <Link href="/admin/images">Images</Link>
              <Link href="/admin/products">Products</Link>
              <Link href="/admin/settings">Settings</Link>
              <button
                className="text-left text-gold"
                onClick={() => {
                  signOutAdmin();
                  router.replace("/admin/login");
                }}
                type="button"
              >
                Sign out
              </button>
            </nav>
          </div>
        </header>
      ) : null}
      {children}
    </main>
  );
}
