import { normalizeEvent, normalizeStatus, sortHistoryDesc, stripHtml } from "@/lib/tracking/formatTracking";
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

function parseZxdHtml(html: string) {
  if (/没有查询到记录|暂无轨迹|not found|no record|查询不到/i.test(html)) {
    return [] as TrackingEvent[];
  }

  const relevant = html.match(/class=["'][^"']*out_order[^"']*["'][\s\S]*?<\/table>/i)?.[0] || html;
  const rows = [...relevant.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const history: TrackingEvent[] = [];

  rows.forEach((row) => {
    const cells = tableCells(row[1]).filter(Boolean);
    if (cells.length < 2) return;
    const joined = cells.join(" ").toLowerCase();
    if (/date|time|status|轨迹|时间|地点/.test(joined)) return;

    const [date, location, ...eventParts] = cells.length >= 3 ? cells : [cells[0], "", cells.slice(1).join(" ")];
    const event = eventParts.join(" ") || cells[cells.length - 1];
    history.push(normalizeEvent({ date, location, event }));
  });

  return sortHistoryDesc(history);
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
    const history = parseZxdHtml(html);
    if (history.length === 0) {
      return { tracking_number: trackingNumber, found: false, source: "zxd", error: "not_found" };
    }

    const latest = history[0];
    return {
      tracking_number: trackingNumber,
      found: true,
      source: "zxd",
      carrier: "ZXD Express",
      status: normalizeStatus(latest.event),
      destination: "",
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

