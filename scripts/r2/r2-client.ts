import { createHash, createHmac } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

export type R2UploadResult = {
  key: string;
  publicUrl: string;
  fileSize: number;
  contentType: string;
};

const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

export function contentTypeForFile(filePath: string) {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".webp") return "image/webp";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  return "application/octet-stream";
}

export function contentTypeForUrl(url: string) {
  const pathname = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();
  const extension = path.extname(pathname).toLowerCase();
  if (extension === ".webp") return "image/webp";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  return "application/octet-stream";
}

export function loadEnvLocal(envPath = path.resolve(process.cwd(), ".env.local")) {
  try {
    const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const rawValue = trimmed.slice(index + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // The caller validates required env vars and reports missing names only.
  }
}

export function readR2Config(): R2Config {
  const config = {
    accountId: process.env.R2_ACCOUNT_ID || "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    bucket: process.env.R2_BUCKET || "",
    publicBaseUrl: process.env.R2_PUBLIC_BASE_URL || "",
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(`Missing R2 env vars: ${missing.join(", ")}`);
  }
  return config;
}

function sha256Hex(input: string | Buffer) {
  return createHash("sha256").update(input).digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value).digest();
}

function awsDateParts(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function encodeKeyPath(key: string) {
  return key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function publicUrlFor(baseUrl: string, key: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${encodeKeyPath(key)}`;
}

function signingKey(secretAccessKey: string, dateStamp: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");
  return hmac(serviceKey, "aws4_request");
}

export async function uploadFileToR2(filePath: string, key: string): Promise<R2UploadResult> {
  const config = readR2Config();
  const body = readFileSync(filePath);
  const fileSize = statSync(filePath).size;
  const contentType = contentTypeForFile(filePath);
  return uploadBufferToR2(body, key, contentType, fileSize, config);
}

export async function uploadBufferToR2(
  body: Buffer,
  key: string,
  contentType: string,
  fileSize = body.length,
  config = readR2Config()
): Promise<R2UploadResult> {
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const endpoint = `https://${host}/${config.bucket}/${encodeKeyPath(key)}`;
  const payloadHash = "UNSIGNED-PAYLOAD";
  const { amzDate, dateStamp } = awsDateParts();
  const canonicalUri = `/${config.bucket}/${encodeKeyPath(key)}`;
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    "",
  ].join("\n");
  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(config.secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest("hex");
  const authorization = [
    `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`,
  ].join(", ");

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`R2 upload failed: HTTP ${response.status}${text ? ` ${text.slice(0, 300)}` : ""}`);
  }

  return {
    key,
    publicUrl: publicUrlFor(config.publicBaseUrl, key),
    fileSize,
    contentType,
  };
}
