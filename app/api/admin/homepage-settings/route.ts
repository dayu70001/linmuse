// GET  — reads settings directly from R2 (signed GET, bypasses CDN cache)
// POST — merges keys into settings JSON and writes back to R2
// Auth: ADMIN_TOKEN only. No Supabase.

import { NextResponse } from "next/server";
import { HOME_ALLOWED_KEYS, SETTINGS_R2_KEY, settingsPublicUrl } from "@/lib/homepageSettings";
import { getR2Json, uploadJsonToR2 } from "@/lib/r2Upload";

function authorized(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN;
  if (!token) return false;
  const header = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return header === token;
}

// ---------------------------------------------------------------------------
// GET — always reads fresh from R2 (no CDN cache)
// ---------------------------------------------------------------------------

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "管理员 Token 错误或未设置" }, { status: 401 });
  }

  // getR2Json does a SigV4-signed GET directly to the R2 bucket endpoint
  const settings = await getR2Json<Record<string, string>>(SETTINGS_R2_KEY);

  // Return empty object (not an error) if JSON doesn't exist yet
  return NextResponse.json({ settings: settings ?? {} });
}

// ---------------------------------------------------------------------------
// POST — merge provided keys into existing JSON and write back to R2
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "管理员 Token 错误或未设置" }, { status: 401 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const filtered = Object.fromEntries(
    Object.entries(body as Record<string, unknown>)
      .filter(([k]) => HOME_ALLOWED_KEYS.has(k))
      .map(([k, v]) => [k, String(v ?? "")]),
  );

  if (Object.keys(filtered).length === 0) {
    return NextResponse.json({ error: "No valid homepage keys in body" }, { status: 400 });
  }

  // Read existing (direct from R2, not CDN)
  const existing = (await getR2Json<Record<string, string>>(SETTINGS_R2_KEY)) ?? {};
  const merged   = { ...existing, ...filtered };

  try {
    await uploadJsonToR2(SETTINGS_R2_KEY, merged);
  } catch (err) {
    return NextResponse.json({ error: `R2 write failed: ${String(err)}` }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    saved: Object.keys(filtered).length,
    publicUrl: settingsPublicUrl(),
  });
}
