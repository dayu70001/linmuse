"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAdmin } from "@/lib/supabaseRest";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      await signInAdmin(email, password);
      router.replace("/admin");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <form className="w-full max-w-md rounded-xl bg-white p-7" onSubmit={handleSubmit}>
        <p className="eyebrow">Private admin</p>
        <h1 className="mt-3 font-serif text-4xl text-ink">LM Dkbrand Login</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Sign in with the admin email created in Supabase Auth.
        </p>
        <label className="mt-7 block text-sm font-bold text-ink">
          Email
          <input
            className="mt-2 min-h-11 w-full rounded border border-line px-3 text-sm outline-none focus:border-gold"
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label className="mt-4 block text-sm font-bold text-ink">
          Password
          <input
            className="mt-2 min-h-11 w-full rounded border border-line px-3 text-sm outline-none focus:border-gold"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        {message ? <p className="mt-4 text-sm font-semibold text-red-600">{message}</p> : null}
        <button className="btn-primary mt-6 w-full" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </main>
  );
}
