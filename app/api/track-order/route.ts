import { NextResponse } from "next/server";
import { getTrackingCache, setTrackingCache } from "@/lib/tracking/cache";
import { normalizeTrackingNumber, normalizeTrackingResultToEnglish } from "@/lib/tracking/formatTracking";
import { query17track } from "@/lib/tracking/query17track";
import { queryHualei } from "@/lib/tracking/queryHualei";
import { queryZxd } from "@/lib/tracking/queryZxd";
import type { TrackingFailure } from "@/lib/tracking/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { tracking_number?: unknown };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const trackingNumber = normalizeTrackingNumber(String(body.tracking_number || ""));
  if (trackingNumber.length < 5) {
    return NextResponse.json({ error: "tracking_number_required" }, { status: 400 });
  }

  const cached = getTrackingCache(trackingNumber);
  if (cached) {
    return NextResponse.json(normalizeTrackingResultToEnglish(cached), {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const errors: TrackingFailure["errors"] = {};

  const hualei = await queryHualei(trackingNumber);
  if (hualei.found) {
    const normalized = normalizeTrackingResultToEnglish(hualei);
    setTrackingCache(trackingNumber, normalized);
    return NextResponse.json(normalized, { headers: { "Cache-Control": "no-store" } });
  }
  errors.hualei = hualei.error;

  const zxd = await queryZxd(trackingNumber);
  if (zxd.found) {
    const normalized = normalizeTrackingResultToEnglish(zxd);
    setTrackingCache(trackingNumber, normalized);
    return NextResponse.json(normalized, { headers: { "Cache-Control": "no-store" } });
  }
  errors.zxd = zxd.error;

  const track17 = await query17track(trackingNumber);
  if (track17.found) {
    const normalized = normalizeTrackingResultToEnglish(track17);
    setTrackingCache(trackingNumber, normalized);
    return NextResponse.json(normalized, { headers: { "Cache-Control": "no-store" } });
  }
  errors.track17 = track17.error;

  const failure: TrackingFailure = {
    tracking_number: trackingNumber,
    found: false,
    source: "hualei,zxd,17track",
    errors,
  };

  setTrackingCache(trackingNumber, failure);
  return NextResponse.json(failure, { headers: { "Cache-Control": "no-store" } });
}
