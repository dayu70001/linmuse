import { cleanText, normalizeEvent, normalizeStatus, sortHistoryDesc, stripHtml } from "@/lib/tracking/formatTracking";
import type { TrackingEvent, TrackingSourceResult } from "@/lib/tracking/types";

const TIMEOUT_MS = 9000;

type ParsedHualeiPayload = {
  carrier: string;
  destination: string;
  status: string;
  history: TrackingEvent[];
};

function missingConfig() {
  return !process.env.HUALEI_BASE_URL
    || !process.env.HUALEI_USERNAME
    || !process.env.HUALEI_PASSWORD
    || !process.env.HUALEI_CUSTOMER_ID
    || !process.env.HUALEI_CUSTOMER_USER_ID;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonPayload(payload: unknown): ParsedHualeiPayload {
  const history: TrackingEvent[] = [];
  const stack = [payload];
  let carrier = "";
  let destination = "";
  let status = "";

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item || typeof item !== "object") continue;
    if (Array.isArray(item)) {
      stack.push(...item);
      continue;
    }

    const row = item as Record<string, unknown>;
    const date = row.date || row.time || row.trackTime || row.acceptTime || row.scanTime || row.created_at;
    const event = row.event || row.status || row.context || row.remark || row.trackContent || row.description || row.message;
    const location = row.location || row.place || row.city || row.country || row.scanLocation;

    if (event || date || location) {
      history.push(normalizeEvent({ date: String(date || ""), location: String(location || ""), event: String(event || "") }));
    }

    carrier ||= cleanText(row.carrier || row.channel || row.shippingMethod || row.logisticsName);
    destination ||= cleanText(row.destination || row.destinationCountry || row.country);
    status ||= cleanText(row.status || row.trackStatus || row.latestStatus);

    Object.values(row).forEach((value) => {
      if (value && typeof value === "object") stack.push(value);
    });
  }

  return { carrier, destination, status, history };
}

function parseTextPayload(text: string): ParsedHualeiPayload {
  const clean = stripHtml(text);
  if (!clean || /no record|not found|没有|暂无|查询不到|无轨迹/i.test(clean)) {
    return { carrier: "", destination: "", status: "", history: [] };
  }

  return {
    carrier: "",
    destination: "",
    status: clean,
    history: [
      normalizeEvent({
        date: "",
        location: "",
        event: clean,
      }),
    ],
  };
}

export async function queryHualei(trackingNumber: string): Promise<TrackingSourceResult> {
  if (missingConfig()) {
    return { tracking_number: trackingNumber, found: false, source: "hualei", error: "missing_config" };
  }

  try {
    const baseUrl = String(process.env.HUALEI_BASE_URL || "").replace(/\/+$/, "");
    const body = new URLSearchParams();
    body.set("customer_id", String(process.env.HUALEI_CUSTOMER_ID || ""));
    body.set("customer_userid", String(process.env.HUALEI_CUSTOMER_USER_ID || ""));
    body.set("tracking_number", trackingNumber);
    // TODO: Hualei credentials are kept in env. Add auth fields here only after confirming the official API contract.

    const response = await fetchWithTimeout(`${baseUrl}/selectTrack.htm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Accept: "application/json,text/plain,*/*",
      },
      body,
      cache: "no-store",
    }, TIMEOUT_MS);

    if (!response.ok) {
      return { tracking_number: trackingNumber, found: false, source: "hualei", error: `http_${response.status}` };
    }

    const text = await response.text();
    let parsed: ReturnType<typeof parseJsonPayload> | ReturnType<typeof parseTextPayload>;
    try {
      parsed = parseJsonPayload(JSON.parse(text));
    } catch {
      parsed = parseTextPayload(text);
    }

    const history = sortHistoryDesc(parsed.history);
    if (history.length === 0) {
      return { tracking_number: trackingNumber, found: false, source: "hualei", error: "not_found" };
    }

    const latest = history[0];
    const statusText = parsed.status || latest.event;
    return {
      tracking_number: trackingNumber,
      found: true,
      source: "hualei",
      carrier: parsed.carrier || "Hualei",
      status: normalizeStatus(statusText),
      destination: parsed.destination || "",
      latest_update: latest,
      history,
    };
  } catch (error) {
    return {
      tracking_number: trackingNumber,
      found: false,
      source: "hualei",
      error: error instanceof Error && error.name === "AbortError" ? "timeout" : "request_failed",
    };
  }
}
