import { detectCarrier } from "@/lib/tracking/detectCarrier";
import { cleanText, normalizeEvent, normalizeStatus, sortHistoryDesc } from "@/lib/tracking/formatTracking";
import type { TrackingEvent, TrackingSourceResult } from "@/lib/tracking/types";

const TIMEOUT_MS = 12000;
const DEFAULT_BASE_URL = "https://api.17track.net/track/v2.2";

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractTrack17Events(payload: unknown): { destination?: string; carrier?: string; status?: string; history: TrackingEvent[] } {
  const history: TrackingEvent[] = [];
  const stack = [payload];
  let destination = "";
  let carrier = "";
  let status = "";

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item || typeof item !== "object") continue;
    if (Array.isArray(item)) {
      stack.push(...item);
      continue;
    }

    const row = item as Record<string, unknown>;
    const date = row.time_iso || row.time_utc || row.time || row.date;
    const event = row.description || row.desc || row.event || row.status || row.status_text;
    const location = row.location || row.address || row.city || row.country;

    if (date || event || location) {
      history.push(normalizeEvent({ date: String(date || ""), location: String(location || ""), event: String(event || "") }));
    }

    destination ||= cleanText(row.destination || row.destination_country || row.country_destination);
    carrier ||= cleanText(row.carrier_name || row.provider || row.carrier);
    status ||= cleanText(row.status || row.status_text || row.delivery_status);

    Object.values(row).forEach((value) => {
      if (value && typeof value === "object") stack.push(value);
    });
  }

  return { destination, carrier, status, history: sortHistoryDesc(history) };
}

async function track17Post(path: string, body: unknown, token: string) {
  const baseUrl = DEFAULT_BASE_URL.replace(/\/+$/, "");
  return fetchWithTimeout(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "17token": token,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  }, TIMEOUT_MS);
}

export async function query17track(trackingNumber: string): Promise<TrackingSourceResult> {
  const token = process.env.TRACK17_API_KEY;
  if (!token) {
    return { tracking_number: trackingNumber, found: false, source: "17track", error: "missing_config" };
  }

  const carrier = detectCarrier(trackingNumber);
  if (!carrier) {
    return { tracking_number: trackingNumber, found: false, source: "17track", error: "no_carrier_detected" };
  }

  try {
    const registerPayload = [{ number: trackingNumber, carrier: Number(carrier.code) }];
    const register = await track17Post("/register", registerPayload, token);
    if (!register.ok && register.status !== 409) {
      const text = await register.text().catch(() => "");
      const hint = /ip|white/i.test(text) ? "ip_whitelist_required" : `register_http_${register.status}`;
      return { tracking_number: trackingNumber, found: false, source: "17track", error: hint };
    }

    const info = await track17Post("/gettrackinfo", registerPayload, token);
    if (!info.ok) {
      const text = await info.text().catch(() => "");
      const hint = /ip|white/i.test(text) ? "ip_whitelist_required" : `gettrackinfo_http_${info.status}`;
      return { tracking_number: trackingNumber, found: false, source: "17track", error: hint };
    }

    const payload = await info.json();
    const parsed = extractTrack17Events(payload);
    if (parsed.history.length === 0) {
      return { tracking_number: trackingNumber, found: false, source: "17track", error: "not_found" };
    }

    const latest = parsed.history[0];
    return {
      tracking_number: trackingNumber,
      found: true,
      source: "17track",
      carrier: parsed.carrier || carrier.name,
      status: normalizeStatus(parsed.status || latest.event),
      destination: parsed.destination || "",
      latest_update: latest,
      history: parsed.history,
    };
  } catch (error) {
    return {
      tracking_number: trackingNumber,
      found: false,
      source: "17track",
      error: error instanceof Error && error.name === "AbortError" ? "timeout" : "request_failed",
    };
  }
}
