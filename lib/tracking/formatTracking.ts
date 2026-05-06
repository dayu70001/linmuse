import type { TrackingEvent, TrackingFailure, TrackingResult, TrackingStatus } from "@/lib/tracking/types";

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
  if (/out for delivery|en reparto|派送|派件|投递|正在派送/.test(text)) return "out_for_delivery";
  if (/exception|异常|failed|失败|problem|退回/.test(text)) return "exception";
  if (/in transit|en transito|en tránsito|转运中|运输|transit|shipped|运输途中/.test(text)) return "in_transit";

  return "unknown";
}

export function formatTrackingStatus(status: TrackingStatus) {
  if (status === "delivered") return "Delivered";
  if (status === "in_transit") return "In transit";
  if (status === "out_for_delivery") return "Out for delivery";
  if (status === "exception") return "Exception";
  return "Unknown";
}

export function standardizeTrackingEventText(value: unknown) {
  const text = cleanText(value);
  if (!text) return "";
  const normalized = text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

  const rules: Array<[RegExp, string]> = [
    [/没有查询到记录|no tracking record/i, "No tracking record found"],
    [/未找到|not found/i, "Not found"],
    [/已签收|签收|妥投|\bentregado\b/i, "Delivered"],
    [/派送中|正在派送|派件|投递|out for delivery|\ben reparto\b/i, "Out for delivery"],
    [/正在准备交付|准备交付|preparing for delivery/i, "Preparing for delivery"],
    [/到达目的地|到达目的国|llegada al pais de destino|arrived in destination/i, "Arrived in destination country"],
    [/已到达|llegada a destino|arrived at destination/i, "Arrived at destination"],
    [/转运中|运输中|运输途中|in transit|en transito|en tránsito/i, "In transit"],
    [/处理中|processing/i, "Processing"],
    [/已揽收|揽收|\badmitido\b|accepted/i, "Accepted"],
    [/\bclasificado\b|sorted/i, "Sorted"],
    [/离开|departed/i, "Departed"],
    [/出库|departed facility/i, "Departed facility"],
    [/入库|arrived at facility/i, "Arrived at facility"],
    [/清关|海关|customs/i, "Customs clearance"],
    [/异常|incidencia|exception/i, "Exception"],
    [/\ben oficina\b|at delivery office/i, "At delivery office"],
  ];

  for (const [pattern, label] of rules) {
    if (pattern.test(text) || pattern.test(normalized)) return label;
  }

  return text;
}

export function normalizeTrackingResultToEnglish<T extends TrackingResult | TrackingFailure>(result: T): T {
  if (!result.found) return result;

  const latestUpdate = {
    ...result.latest_update,
    event: standardizeTrackingEventText(result.latest_update.event),
  };
  const history = result.history.map((event) => ({
    ...event,
    event: standardizeTrackingEventText(event.event),
  }));

  return {
    ...result,
    status: formatTrackingStatus(normalizeStatus(result.status)),
    latest_update: latestUpdate,
    history,
  } as T;
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
    event: standardizeTrackingEventText(event.event || ""),
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
