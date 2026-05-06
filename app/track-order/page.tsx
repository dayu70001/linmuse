"use client";

import { FormEvent, useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import type { TrackingFailure, TrackingResult } from "@/lib/tracking/types";

type ApiState =
  | { status: "idle"; result: null; error: "" }
  | { status: "loading"; result: null; error: "" }
  | { status: "success"; result: TrackingResult | TrackingFailure; error: "" }
  | { status: "error"; result: null; error: string };

const statusLabels: Record<string, string> = {
  delivered: "Delivered",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  exception: "Exception",
  unknown: "Unknown",
};

const statusClasses: Record<string, string> = {
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  in_transit: "border-blue-200 bg-blue-50 text-blue-700",
  out_for_delivery: "border-gold/40 bg-gold/10 text-ink",
  exception: "border-red-200 bg-red-50 text-red-700",
  unknown: "border-line bg-paper text-muted",
};

function formatDate(value: string) {
  if (!value) return "Date pending";
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(parsed));
}

export default function TrackOrderPage() {
  const [trackingNumber, setTrackingNumber] = useState("");
  const [state, setState] = useState<ApiState>({ status: "idle", result: null, error: "" });

  const result = state.status === "success" ? state.result : null;
  const foundResult = result?.found ? result : null;
  const statusClass = foundResult ? statusClasses[foundResult.status] || statusClasses.unknown : statusClasses.unknown;
  const latest = foundResult?.latest_update;

  const history = useMemo(() => foundResult?.history || [], [foundResult]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const number = trackingNumber.trim();
    if (!number) {
      setState({ status: "error", result: null, error: "Please enter a tracking number." });
      return;
    }

    setState({ status: "loading", result: null, error: "" });

    try {
      const response = await fetch("/api/track-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracking_number: number }),
      });
      const payload = await response.json();

      if (!response.ok) {
        setState({ status: "error", result: null, error: payload.error || "Tracking lookup failed." });
        return;
      }

      setState({ status: "success", result: payload, error: "" });
    } catch {
      setState({ status: "error", result: null, error: "Tracking lookup failed. Please try again." });
    }
  }

  return (
    <main className="overflow-x-hidden bg-white">
      <section className="section-pad">
        <div className="container-page max-w-4xl">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Shipment tracking</p>
            <h1 className="mt-3 font-serif text-4xl text-ink sm:text-5xl">Track Your Order</h1>
            <p className="mt-4 text-base leading-7 text-muted">
              Enter your tracking number to check the latest shipment status.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-6">
            <label className="grid gap-2 text-sm font-bold text-ink">
              Tracking number
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  className="h-12 min-w-0 rounded-full border border-line bg-white px-4 text-base font-semibold text-ink outline-none transition focus:border-gold"
                  name="tracking_number"
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="Enter tracking number"
                  value={trackingNumber}
                />
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-bold text-white transition hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={state.status === "loading"}
                  type="submit"
                >
                  <PackageSearch size={18} />
                  {state.status === "loading" ? "Checking..." : "Track package"}
                </button>
              </div>
            </label>
          </form>

          {state.status === "error" ? (
            <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {state.error}
            </div>
          ) : null}

          {result && !result.found ? (
            <section className="mt-8 rounded-2xl border border-line bg-paper p-6">
              <h2 className="font-serif text-2xl text-ink">We could not find tracking details yet.</h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Please contact us on WhatsApp or Telegram for the latest status.
              </p>
              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">
                Tracking number: {result.tracking_number}
              </p>
            </section>
          ) : null}

          {foundResult ? (
            <section className="mt-8 grid gap-5">
              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">Tracking number</p>
                    <h2 className="mt-1 text-xl font-bold text-ink">{foundResult.tracking_number}</h2>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusClass}`}>
                    {statusLabels[foundResult.status] || "Unknown"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <InfoBlock label="Source" value={foundResult.source} />
                  <InfoBlock label="Carrier" value={foundResult.carrier || "Pending"} />
                  <InfoBlock label="Destination" value={foundResult.destination || "Pending"} />
                </div>

                {latest ? (
                  <div className="mt-6 rounded-xl border border-line bg-paper p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">Latest update</p>
                    <p className="mt-2 text-sm font-bold text-ink">{formatDate(latest.date)}</p>
                    <p className="mt-1 text-sm text-muted">{latest.location || "Location pending"}</p>
                    <p className="mt-2 text-base font-semibold text-ink">{latest.event || "Status pending"}</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-serif text-2xl text-ink">Shipment history</h2>
                <div className="mt-5 grid gap-4">
                  {history.map((event, index) => (
                    <div className="grid grid-cols-[auto_1fr] gap-3" key={`${event.date}-${event.event}-${index}`}>
                      <div className="flex flex-col items-center">
                        <span className="mt-1 h-3 w-3 rounded-full bg-gold" />
                        {index < history.length - 1 ? <span className="mt-2 h-full min-h-10 w-px bg-line" /> : null}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-bold text-ink">{formatDate(event.date)}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">
                          {event.location || "Location pending"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted">{event.event || "Status pending"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}

