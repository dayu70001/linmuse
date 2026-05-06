import type { TrackingEvent, TrackingStatus } from "@/lib/tracking/types";

export function normalizeTrackingNumber(value: string) {
  return String(value || "").trim().replace(/\s+/g, "").toUpperCase();
}

export function cleanText(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeStatus(value: unknown): TrackingStatus {
  const text = cleanText(value).toLowerCase();

  if (/delivered|entregado|已签收|签收|妥投/.test(text)) return "delivered";
  if (/out for delivery|en reparto|派送|派件|投递/.test(text)) return "out_for_delivery";
  if (/exception|异常|failed|失败|problem|退回/.test(text)) return "exception";
  if (/in transit|en transito|en tránsito|转运中|运输|transit|shipped|运输途中/.test(text)) return "in_transit";

  return "unknown";
}

export function normalizeDate(value: unknown) {
  const text = cleanText(value);
  if (!text) return "";

  const parsed = Date.parse(text.replace(/\./g, "-"));
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();

  return text;
}

export function normalizeEvent(event: Partial<TrackingEvent>): TrackingEvent {
  return {
    date: normalizeDate(event.date || ""),
    location: cleanText(event.location || ""),
    event: cleanText(event.event || ""),
  };
}

export function sortHistoryDesc(history: TrackingEvent[]) {
  return [...history]
    .filter((event) => event.date || event.location || event.event)
    .sort((a, b) => {
      const aTime = Date.parse(a.date);
      const bTime = Date.parse(b.date);
      if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
      return 0;
    });
}

