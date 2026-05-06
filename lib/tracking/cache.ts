import type { TrackingFailure, TrackingResult } from "@/lib/tracking/types";

type CacheValue = {
  expiresAt: number;
  value: TrackingResult | TrackingFailure;
};

const cache = new Map<string, CacheValue>();

function positiveTtlMs() {
  return Math.max(1, Number(process.env.TRACKING_CACHE_TTL_SECONDS || 1800) || 1800) * 1000;
}

function negativeTtlMs() {
  return Math.max(1, Number(process.env.TRACKING_NEGATIVE_CACHE_TTL_SECONDS || 300) || 300) * 1000;
}

export function getTrackingCache(key: string) {
  const cached = cache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return cached.value;
}

export function setTrackingCache(key: string, value: TrackingResult | TrackingFailure) {
  cache.set(key, {
    expiresAt: Date.now() + (value.found ? positiveTtlMs() : negativeTtlMs()),
    value,
  });
}

