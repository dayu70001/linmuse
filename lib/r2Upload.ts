// Server-only: R2 read/write via AWS Signature V4 (S3-compatible)
// Never import this on the client side.

import { createHash, createHmac } from "crypto";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sha256Hex(data: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function getSigningKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate    = hmacSha256(`AWS4${secret}`, dateStamp);
  const kRegion  = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

function encodeSegment(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function r2Config() {
  return {
    accountId:       process.env.R2_ACCOUNT_ID        || "",
    accessKeyId:     process.env.R2_ACCESS_KEY_ID     || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket:          process.env.R2_BUCKET            || "",
    publicBase:      (process.env.R2_PUBLIC_BASE_URL  || "https://img.linmuse.com").replace(/\/$/, ""),
  };
}

function nowStamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const amzDate =
    `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}` +
    `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

const EMPTY_SHA256 = "e3b0c44298fc1c149afbf4c8996fb924" +
                     "27ae41e4649b934ca495991b7852b855";

// ---------------------------------------------------------------------------
// Public: PUT (upload)
// ---------------------------------------------------------------------------

/**
 * Upload binary data to R2 via SigV4.
 * key MUST start with "site/home/".
 * Returns the CDN public URL.
 */
export async function uploadToR2(
  key: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const { accountId, accessKeyId, secretAccessKey, bucket, publicBase } = r2Config();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 credentials missing. Check R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / " +
      "R2_SECRET_ACCESS_KEY / R2_BUCKET in .env.local",
    );
  }
  if (!key.startsWith("site/home/") && !key.startsWith("site/shipping-proof/")) {
    throw new Error(`R2 key must start with site/home/ or site/shipping-proof/ — rejected: ${key}`);
  }

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const { amzDate, dateStamp } = nowStamp();
  const bodyBuf  = Buffer.from(body);
  const bodyHash = sha256Hex(bodyBuf);

  const canonicalUri = `/${[bucket, ...key.split("/")].map(encodeSegment).join("/")}`;

  const headerMap: Record<string, string> = {
    "content-type":          contentType,
    host,
    "x-amz-content-sha256":  bodyHash,
    "x-amz-date":            amzDate,
  };
  const sortedKeys       = Object.keys(headerMap).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headerMap[k]}`).join("\n") + "\n";
  const signedHeaders    = sortedKeys.join(";");

  const canonicalRequest  = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, bodyHash].join("\n");
  const credentialScope   = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign      = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey        = getSigningKey(secretAccessKey, dateStamp, "auto", "s3");
  const signature         = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}/${bucket}/${key}`, {
    method: "PUT",
    headers: { ...headerMap, Authorization: authorization },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 PUT failed ${res.status}: ${text.slice(0, 300)}`);
  }

  return `${publicBase}/${key}`;
}

// ---------------------------------------------------------------------------
// Public: GET (direct from R2, bypasses CDN cache)
// ---------------------------------------------------------------------------

/**
 * Read a JSON file directly from R2 via signed GET.
 * Bypasses CDN — always returns the latest version.
 * Returns null if key does not exist or read fails.
 */
export async function getR2Json<T>(key: string): Promise<T | null> {
  const { accountId, accessKeyId, secretAccessKey, bucket } = r2Config();

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;

  const host = `${accountId}.r2.cloudflarestorage.com`;
  const { amzDate, dateStamp } = nowStamp();

  const canonicalUri = `/${[bucket, ...key.split("/")].map(encodeSegment).join("/")}`;

  const headerMap: Record<string, string> = {
    host,
    "x-amz-content-sha256": EMPTY_SHA256,
    "x-amz-date":           amzDate,
  };
  const sortedKeys       = Object.keys(headerMap).sort();
  const canonicalHeaders = sortedKeys.map((k) => `${k}:${headerMap[k]}`).join("\n") + "\n";
  const signedHeaders    = sortedKeys.join(";");

  const canonicalRequest = ["GET", canonicalUri, "", canonicalHeaders, signedHeaders, EMPTY_SHA256].join("\n");
  const credentialScope  = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign     = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");
  const signingKey       = getSigningKey(secretAccessKey, dateStamp, "auto", "s3");
  const signature        = createHmac("sha256", signingKey).update(stringToSign).digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(`https://${host}/${bucket}/${key}`, {
      method: "GET",
      headers: { ...headerMap, Authorization: authorization },
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public: upload JSON helper
// ---------------------------------------------------------------------------

/**
 * Serialize `data` as JSON and upload to R2.
 * Returns the CDN public URL.
 */
export async function uploadJsonToR2(key: string, data: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(data, null, 2));
  // TextEncoder always creates a Uint8Array backed by a fresh ArrayBuffer
  return uploadToR2(key, bytes.buffer as ArrayBuffer, "application/json");
}

// ---------------------------------------------------------------------------
// Public: read from CDN (for homepage Server Component — accepts 30s staleness)
// ---------------------------------------------------------------------------

/**
 * Read JSON from the public CDN URL.
 * Uses Next.js revalidate cache. OK for homepage reads.
 * For admin API routes, use getR2Json() instead (no CDN cache).
 */
export async function readCdnJson<T>(
  publicUrl: string,
  revalidate = 30,
): Promise<T | null> {
  try {
    const res = await fetch(publicUrl, { next: { revalidate } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
