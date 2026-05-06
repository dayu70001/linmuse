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
  const compact = text.replace(/\s+/g, "");

  if (/delivered|entregado|已签收|签收|妥投/.test(text)) return "delivered";
  if (/out for delivery|en reparto|派送|派件|投递|正在派送/.test(text)) return "out_for_delivery";
  if (/exception|异常|failed|失败|problem|退回/.test(text)) return "exception";
  if (/in transit|en transito|en tránsito|转运中|运输|transit|shipped|运输途中/.test(text) || /转运中|运输中/.test(compact)) return "in_transit";

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
  const compact = text.replace(/\s+/g, "");

  const exactEnglishStatus: Record<string, string> = {
    delivered: "Delivered",
    in_transit: "In transit",
    "in transit": "In transit",
    out_for_delivery: "Out for delivery",
    "out for delivery": "Out for delivery",
    exception: "Exception",
    unknown: "Unknown",
  };
  if (exactEnglishStatus[normalized]) return exactEnglishStatus[normalized];

  const nonEnglishRules: Array<[RegExp, string]> = [
    [/没有查询到记录|no tracking record/i, "No tracking record found"],
    [/未找到|not found/i, "Not found"],
    [/已签收|签收|妥投/i, "Delivered"],
    [/派送中|正在派送|派件|投递/i, "Out for delivery"],
    [/正在准备交付|准备交付|preparing for delivery/i, "Preparing for delivery"],
    [/到达目的地|到达目的国/i, "Arrived in destination country"],
    [/已到达/i, "Arrived"],
    [/转运中|运输中|运输途中/i, "In transit"],
    [/处理中|processing/i, "Processing"],
    [/已揽收|揽收/i, "Accepted"],
    [/离开/i, "Departed"],
    [/出库/i, "Departed facility"],
    [/入库/i, "Arrived at facility"],
    [/清关|海关/i, "Customs clearance"],
    [/异常/i, "Exception"],
    [/\bentregado\b/i, "Delivered"],
    [/\ben reparto\b/i, "Out for delivery"],
    [/\ben transito\b|\ben tránsito\b/i, "In transit"],
    [/\badmitido\b/i, "Accepted"],
    [/\bclasificado\b/i, "Sorted"],
    [/llegada al pais de destino|llegada al país de destino/i, "Arrived in destination country"],
    [/llegada a destino/i, "Arrived at destination"],
    [/\ben oficina\b/i, "At delivery office"],
    [/\bincidencia\b/i, "Exception"],
  ];

  for (const [pattern, label] of nonEnglishRules) {
    if (pattern.test(text) || pattern.test(normalized) || pattern.test(compact)) return label;
  }

  return text;
}

export function standardizeTrackingLocation(value: unknown) {
  const text = cleanText(value);
  if (!text) return "";
  const upper = text.toUpperCase();
  const compact = text.replace(/\s+/g, "");

  if (upper === "ES" || /SPAIN|西班牙/i.test(text)) return "Spain";
  if (upper === "NL" || /荷兰/i.test(text)) {
    if (/阿姆斯特丹|AMSTERDAM/i.test(text)) return "Amsterdam, Netherlands";
    return "Netherlands";
  }
  if (upper === "DE" || /德国/i.test(text)) return "Germany";
  if (upper === "CN" || /中国/i.test(text)) return "China";
  if (/香港|HONG\s*KONG/i.test(text) || compact === "HK") return "Hong Kong";
  if (/深圳|SHENZHEN/i.test(text)) return "Shenzhen";

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
    location: standardizeTrackingLocation(event.location || ""),
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
