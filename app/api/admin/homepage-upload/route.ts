// Image upload to R2 site/home/* — after upload, updates homepage-settings.json.
// Auth: ADMIN_TOKEN only. No Supabase.

import { NextResponse } from "next/server";
import {
  ALLOWED_R2_KEYS,
  R2_KEY_TO_SETTINGS_KEY,
  SETTINGS_R2_KEY,
} from "@/lib/homepageSettings";
import { getR2Json, uploadJsonToR2, uploadToR2 } from "@/lib/r2Upload";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const header = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return header === token;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "管理员 Token 错误或未设置" }, { status: 401 });
  }

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid multipart form" }, { status: 400 }); }

  const r2Key      = (formData.get("r2key") as string | null)?.trim() ?? "";
  const file       = formData.get("file") as File | null;

  if (!r2Key)                      return NextResponse.json({ error: "Missing r2key" },              { status: 400 });
  if (!ALLOWED_R2_KEYS.has(r2Key)) return NextResponse.json({ error: `r2key not allowed: ${r2Key}` },{ status: 400 });
  if (!file || file.size === 0)    return NextResponse.json({ error: "Missing or empty file" },      { status: 400 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 400 });

  const contentType = file.type || "image/webp";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files accepted" }, { status: 400 });
  }

  let arrayBuffer: ArrayBuffer;
  try { arrayBuffer = await file.arrayBuffer(); }
  catch { return NextResponse.json({ error: "Failed to read file data" }, { status: 400 }); }

  // ── 1. Upload image ──────────────────────────────────────────────────────
  let imageUrl: string;
  try {
    imageUrl = await uploadToR2(r2Key, arrayBuffer, contentType);
  } catch (err) {
    return NextResponse.json({ error: `Image upload failed: ${String(err)}` }, { status: 502 });
  }

  // ── 2. Update settings JSON in R2 ────────────────────────────────────────
  const settingsKey = R2_KEY_TO_SETTINGS_KEY.get(r2Key);
  let settingsError: string | null = null;

  if (settingsKey) {
    try {
      // getR2Json reads directly from R2 — no CDN cache
      const existing = (await getR2Json<Record<string, string>>(SETTINGS_R2_KEY)) ?? {};
      await uploadJsonToR2(SETTINGS_R2_KEY, { ...existing, [settingsKey]: imageUrl });
    } catch (err) {
      // Settings update failed — report it but don't fail the whole response
      settingsError = String(err);
    }
  }

  return NextResponse.json({
    ok: true,
    url: imageUrl,
    r2Key,
    settingsKey: settingsKey ?? null,
    settingsUpdated: settingsKey ? settingsError === null : null,
    settingsError,
  });
}
