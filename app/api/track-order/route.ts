import { NextResponse } from "next/server";
import { getTrackingCache, setTrackingCache } from "@/lib/tracking/cache";
import { normalizeTrackingNumber } from "@/lib/tracking/formatTracking";
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
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const errors: TrackingFailure["errors"] = {};

  const hualei = await queryHualei(trackingNumber);
  if (hualei.found) {
    setTrackingCache(trackingNumber, hualei);
    return NextResponse.json(hualei, { headers: { "Cache-Control": "no-store" } });
  }
  errors.hualei = hualei.error;

  const zxd = await queryZxd(trackingNumber);
  if (zxd.found) {
    setTrackingCache(trackingNumber, zxd);
    return NextResponse.json(zxd, { headers: { "Cache-Control": "no-store" } });
  }
  errors.zxd = zxd.error;

  const track17 = await query17track(trackingNumber);
  if (track17.found) {
    setTrackingCache(trackingNumber, track17);
    return NextResponse.json(track17, { headers: { "Cache-Control": "no-store" } });
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

