import { cleanText, normalizeEvent, normalizeStatus, sortHistoryDesc, standardizeTrackingLocation, stripHtml } from "@/lib/tracking/formatTracking";
import type { TrackingEvent, TrackingSourceResult } from "@/lib/tracking/types";

const TIMEOUT_MS = 9000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function tableCells(rowHtml: string) {
  const cells = [...rowHtml.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
  return cells.map((cell) => stripHtml(cell[1]));
}

function looksLikeDate(value: string) {
  return /^\d{4}[-/.]\d{2}[-/.]\d{2}(?:\s+\d{2}:\d{2}(?::\d{2})?)?/.test(value.trim());
}

export function parseZxdHtml(html: string) {
  if (/没有查询到记录|暂无轨迹|not found|no record|查询不到/i.test(html)) {
    return { history: [] as TrackingEvent[], destination: "", summaryStatus: "" };
  }

  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const detailHistory: TrackingEvent[] = [];
  let destination = "";
  let summaryStatus = "";
  let summaryDate = "";
  let summaryLocation = "";

  rows.forEach((row) => {
    const cells = tableCells(row[1]).filter(Boolean);
    if (cells.length < 2) return;
    const joined = cells.join(" ").toLowerCase();
    if (/date|time|status|轨迹|时间|地点/.test(joined)) return;

    const dateIndex = cells.findIndex(looksLikeDate);
    if (dateIndex === 0 && cells.length >= 3) {
      const [date, location, ...eventParts] = cells;
      const event = eventParts.join(" ");
      if (event) detailHistory.push(normalizeEvent({ date, location, event }));
      return;
    }

    if (dateIndex >= 0) {
      const possibleDestination = cells.find((cell, index) => index !== dateIndex && /spain|西班牙|\bES\b|germany|德国|\bDE\b|netherlands|荷兰|\bNL\b/i.test(cell));
      destination ||= standardizeTrackingLocation(possibleDestination || "");
      summaryDate ||= cells[dateIndex];
      summaryLocation ||= possibleDestination || "";
      summaryStatus ||= cells.slice(dateIndex + 1).join(" ") || cells[cells.length - 1] || "";
    }
  });

  const history = sortHistoryDesc(detailHistory);
  if (history.length > 0) {
    destination ||= standardizeTrackingLocation(history[0].location);
    return { history, destination, summaryStatus };
  }

  if (summaryDate || summaryStatus) {
    return {
      history: sortHistoryDesc([normalizeEvent({ date: summaryDate, location: summaryLocation, event: summaryStatus })]),
      destination: destination || standardizeTrackingLocation(summaryLocation),
      summaryStatus,
    };
  }

  return { history: [] as TrackingEvent[], destination: "", summaryStatus: "" };
}

export async function queryZxd(trackingNumber: string): Promise<TrackingSourceResult> {
  try {
    const body = new URLSearchParams();
    body.set("numbers", trackingNumber);

    const response = await fetchWithTimeout("http://www.zxdexpress.com/logistic.html", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "LM-Dkbrand tracking lookup/1.0",
        Accept: "text/html,application/xhtml+xml,text/plain,*/*",
      },
      body,
      cache: "no-store",
    }, TIMEOUT_MS);

    if (!response.ok) {
      return { tracking_number: trackingNumber, found: false, source: "zxd", error: `http_${response.status}` };
    }

    const html = await response.text();
    const parsed = parseZxdHtml(html);
    const history = parsed.history;
    if (history.length === 0) {
      return { tracking_number: trackingNumber, found: false, source: "zxd", error: "not_found" };
    }

    const latest = history[0];
    const statusText = cleanText(parsed.summaryStatus) || latest.event;
    return {
      tracking_number: trackingNumber,
      found: true,
      source: "zxd",
      carrier: "ZXD Express",
      status: normalizeStatus(statusText),
      destination: parsed.destination || "",
      latest_update: latest,
      history,
    };
  } catch (error) {
    return {
      tracking_number: trackingNumber,
      found: false,
      source: "zxd",
      error: error instanceof Error && error.name === "AbortError" ? "timeout" : "request_failed",
    };
  }
}
