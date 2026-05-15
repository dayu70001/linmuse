"use client";

import { useEffect, useRef, useState } from "react";
import {
  HOME_FEATURED_SLOTS,
  HOME_IMAGE_SLOTS,
  HOME_SOCIAL_SLOTS,
  type HomeImageSlot,
  type ShippingProofFeedbackItem,
} from "@/lib/homepageSettings";

// ---------------------------------------------------------------------------
// Token helpers (sessionStorage — clears when browser tab closes)
// ---------------------------------------------------------------------------

const SESSION_KEY = "lm_hp_token";

function readToken() {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(SESSION_KEY) || "";
}
function storeToken(t: string) { sessionStorage.setItem(SESSION_KEY, t); }
function dropToken() { sessionStorage.removeItem(SESSION_KEY); }
function bearer(token: string) { return { Authorization: `Bearer ${token}` }; }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SlotState = {
  savedUrl: string;
  previewUrl: string;
  file: File | null;
  uploading: boolean;
  status: string;
  error: string;
};

type FeedbackDraft = ShippingProofFeedbackItem & {
  file?: File | null;
  previewUrl?: string;
  uploading?: boolean;
  status?: string;
  error?: string;
};

function emptySlot(url: string): SlotState {
  return { savedUrl: url, previewUrl: url, file: null, uploading: false, status: "", error: "" };
}

// ---------------------------------------------------------------------------
// Root page — shows token gate or editor
// ---------------------------------------------------------------------------

export default function HomepageAdminPage() {
  const [token, setToken] = useState("");
  const [input, setInput] = useState("");
  const [inputErr, setInputErr] = useState("");

  // Read token from sessionStorage on mount
  useEffect(() => {
    const t = readToken();
    if (t) setToken(t);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t) { setInputErr("请输入 Admin Token。"); return; }
    storeToken(t);
    setToken(t);
    setInputErr("");
  }

  function handleUnauthorized() {
    dropToken();
    setToken("");
    setInput("");
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-gold">首页后台</p>
          <h1 className="mt-3 font-serif text-3xl text-ink">Homepage Admin</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            输入 <code className="rounded bg-paper px-1">.env.local</code> 里设置的{" "}
            <code className="rounded bg-paper px-1">ADMIN_TOKEN</code> 值。
          </p>
          <form className="mt-6" onSubmit={handleSubmit}>
            <label className="block text-sm font-bold text-ink">
              Admin Token
              <input
                autoFocus
                className="mt-2 min-h-11 w-full rounded border border-line px-3 text-sm font-normal outline-none focus:border-gold"
                placeholder="粘贴你的 token"
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </label>
            {inputErr && <p className="mt-2 text-sm font-semibold text-red-600">{inputErr}</p>}
            <button className="btn-primary mt-4 w-full" type="submit">进入后台</button>
          </form>
        </div>
      </main>
    );
  }

  return <Editor token={token} onUnauthorized={handleUnauthorized} />;
}

// ---------------------------------------------------------------------------
// Editor — rendered after token is confirmed
// ---------------------------------------------------------------------------

function Editor({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState("");

  const [slots, setSlots] = useState<Record<string, SlotState>>(() =>
    Object.fromEntries(HOME_IMAGE_SLOTS.map((s) => [s.key, emptySlot(s.fallback)]))
  );
  const [social, setSocial] = useState<Record<string, string>>(() =>
    Object.fromEntries(HOME_SOCIAL_SLOTS.map((s) => [s.key, ""]))
  );
  const [socialMsg, setSocialMsg] = useState("");
  const [socialErr, setSocialErr] = useState("");

  const [featured, setFeatured] = useState<Record<string, string>>(() =>
    Object.fromEntries(HOME_FEATURED_SLOTS.map((s) => [s.key, s.fallback]))
  );
  const [featuredMsg, setFeaturedMsg] = useState("");
  const [featuredErr, setFeaturedErr] = useState("");
  const [gallery, setGallery] = useState<FeedbackDraft[]>([]);
  const [galleryMsg, setGalleryMsg] = useState("");
  const [galleryErr, setGalleryErr] = useState("");

  // Load current settings
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/homepage-settings", {
          headers: bearer(token),
          cache: "no-store",
        });
        if (res.status === 401) { setLoadErr("管理员 Token 错误或未设置"); onUnauthorized(); return; }
        if (!res.ok) { setLoadErr("加载设置失败，请刷新重试。"); return; }
        const data = (await res.json()) as { settings: Record<string, unknown> };
        const s = data.settings || {};

        setSlots((prev) => {
          const next = { ...prev };
          HOME_IMAGE_SLOTS.forEach((slot) => {
            const value = s[slot.key];
            const url = typeof value === "string" && value ? value : slot.fallback;
            next[slot.key] = emptySlot(url);
          });
          return next;
        });
        setSocial((prev) => {
          const next = { ...prev };
          HOME_SOCIAL_SLOTS.forEach((slot) => {
            const value = s[slot.key];
            next[slot.key] = typeof value === "string" ? value : "";
          });
          return next;
        });
        setFeatured((prev) => {
          const next = { ...prev };
          HOME_FEATURED_SLOTS.forEach((slot) => {
            const value = s[slot.key];
            next[slot.key] = typeof value === "string" && value ? value : slot.fallback;
          });
          return next;
        });
        setGallery(normalizeGallery(s.shippingProofFeedbackGallery));
        setLoaded(true);
      } catch (err) {
        setLoadErr(String(err));
      }
    }
    load();
  }, [token, onUnauthorized]);

  // Pick file for a slot
  function pickFile(slot: HomeImageSlot, file?: File) {
    if (!file) return;
    setSlots((prev) => ({
      ...prev,
      [slot.key]: { ...prev[slot.key], file, previewUrl: URL.createObjectURL(file), status: "已选择图片，点「上传到 R2」发布。", error: "" },
    }));
  }

  // Upload a slot's file to R2
  async function uploadSlot(slot: HomeImageSlot) {
    const item = slots[slot.key];
    if (!item.file) return;
    setSlots((prev) => ({ ...prev, [slot.key]: { ...prev[slot.key], uploading: true, status: "上传中…", error: "" } }));
    try {
      const form = new FormData();
      form.append("r2key", slot.r2Key);
      form.append("file", item.file);
      const res = await fetch("/api/admin/homepage-upload", { method: "POST", headers: bearer(token), body: form });
      if (res.status === 401) { onUnauthorized(); return; }
      const json = (await res.json()) as {
        ok?: boolean; url?: string; error?: string;
        settingsUpdated?: boolean | null; settingsError?: string | null;
      };
      if (!res.ok || !json.ok) throw new Error(json.error || "上传失败");
      const url = json.url || item.previewUrl;
      const statusMsg = json.settingsError
        ? `✓ 图片已上传到 R2，但设置 JSON 更新失败：${json.settingsError}`
        : "✓ 已上传并保存到首页设置";
      setSlots((prev) => ({
        ...prev,
        [slot.key]: { savedUrl: url, previewUrl: url, file: null, uploading: false, status: statusMsg, error: "" },
      }));
    } catch (err) {
      setSlots((prev) => ({ ...prev, [slot.key]: { ...prev[slot.key], uploading: false, status: "", error: String(err) } }));
    }
  }

  // Save social links
  async function saveSocial() {
    setSocialMsg("保存中…"); setSocialErr("");
    try {
      const res = await fetch("/api/admin/homepage-settings", {
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify(social),
      });
      if (res.status === 401) { onUnauthorized(); return; }
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "保存失败");
      setSocialMsg("✓ 已保存，首页将使用这些链接。");
    } catch (err) { setSocialErr(String(err)); setSocialMsg(""); }
  }

  // Save featured picks
  async function saveFeatured() {
    setFeaturedMsg("保存中…"); setFeaturedErr("");
    try {
      const res = await fetch("/api/admin/homepage-settings", {
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify(featured),
      });
      if (res.status === 401) { onUnauthorized(); return; }
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "保存失败");
      setFeaturedMsg("✓ 已保存，首页将显示这些商品。");
    } catch (err) { setFeaturedErr(String(err)); setFeaturedMsg(""); }
  }

  async function refreshLatestProducts() {
    setFeaturedMsg("读取最新产品中…"); setFeaturedErr("");
    try {
      const res = await fetch("/api/admin/homepage-latest-products", {
        headers: bearer(token),
        cache: "no-store",
      });
      if (res.status === 401) { onUnauthorized(); return; }
      const json = (await res.json()) as { ok?: boolean; latest?: Record<string, string>; error?: string };
      if (!res.ok || !json.ok || !json.latest) throw new Error(json.error || "读取最新产品失败");
      const nextFeatured = { ...featured, ...json.latest };
      setFeatured(nextFeatured);
      setFeaturedMsg("Latest products refreshed and saved.");
    } catch (err) { setFeaturedErr(String(err)); setFeaturedMsg(""); }
  }

  function addGalleryFile(file?: File) {
    if (!file) return;
    const id = `feedback-${Date.now()}`;
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "webp";
    const nextOrder = gallery.length > 0 ? Math.max(...gallery.map((item) => item.order)) + 1 : 1;
    setGallery((prev) => [
      ...prev,
      {
        id,
        url: "",
        r2Key: `site/shipping-proof/feedback-gallery/${id}.${ext}`,
        label: `Customer feedback ${nextOrder}`,
        order: nextOrder,
        visible: true,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "已选择图片，点「上传」后再保存图库。",
      },
    ]);
  }

  async function uploadGalleryItem(id: string) {
    const item = gallery.find((entry) => entry.id === id);
    if (!item?.file) return;
    setGallery((prev) => prev.map((entry) => entry.id === id ? { ...entry, uploading: true, status: "上传中…", error: "" } : entry));
    try {
      const form = new FormData();
      form.append("r2key", item.r2Key);
      form.append("file", item.file);
      const res = await fetch("/api/admin/homepage-upload", { method: "POST", headers: bearer(token), body: form });
      if (res.status === 401) { onUnauthorized(); return; }
      const json = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !json.ok || !json.url) throw new Error(json.error || "上传失败");
      setGallery((prev) => prev.map((entry) => entry.id === id
        ? { ...entry, url: json.url || "", previewUrl: json.url || entry.previewUrl, file: null, uploading: false, status: "✓ 已上传，请保存图库。", error: "" }
        : entry));
    } catch (err) {
      setGallery((prev) => prev.map((entry) => entry.id === id ? { ...entry, uploading: false, status: "", error: String(err) } : entry));
    }
  }

  async function saveGallery() {
    setGalleryMsg("保存中…"); setGalleryErr("");
    try {
      const cleanGallery = gallery
        .filter((item) => item.url)
        .map(({ id, url, r2Key, label, order, visible }) => ({ id, url, r2Key, label, order, visible }))
        .sort((a, b) => a.order - b.order);
      const res = await fetch("/api/admin/homepage-settings", {
        method: "POST",
        headers: { ...bearer(token), "Content-Type": "application/json" },
        body: JSON.stringify({ shippingProofFeedbackGallery: cleanGallery }),
      });
      if (res.status === 401) { onUnauthorized(); return; }
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error || "保存失败");
      setGallery(cleanGallery);
      setGalleryMsg("✓ Customer Feedback Gallery 已保存。");
    } catch (err) { setGalleryErr(String(err)); setGalleryMsg(""); }
  }

  function updateGalleryItem(id: string, patch: Partial<FeedbackDraft>) {
    setGallery((prev) => prev.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function moveGalleryItem(id: string, direction: -1 | 1) {
    setGallery((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const index = sorted.findIndex((item) => item.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sorted.length) return prev;
      [sorted[index], sorted[target]] = [sorted[target], sorted[index]];
      return sorted.map((item, orderIndex) => ({ ...item, order: orderIndex + 1 }));
    });
  }

  // Group image slots by section
  const groups = HOME_IMAGE_SLOTS.reduce<Record<string, HomeImageSlot[]>>((acc, s) => {
    acc[s.section] = [...(acc[s.section] || []), s];
    return acc;
  }, {});

  if (loadErr) {
    return (
      <main className="container-page py-10">
        <p className="text-sm font-semibold text-red-600">{loadErr}</p>
        <button className="btn-secondary mt-4" onClick={onUnauthorized} type="button">重新输入 Token</button>
      </main>
    );
  }

  if (!loaded) {
    return <main className="container-page py-10"><p className="text-sm text-muted">加载中…</p></main>;
  }

  return (
    <main className="min-h-screen bg-paper">
      {/* Header bar */}
      <header className="border-b border-line bg-white">
        <div className="container-page flex min-h-14 items-center justify-between gap-4">
          <span className="font-serif text-xl text-ink">Homepage Admin</span>
          <button className="text-sm font-semibold text-muted hover:text-ink" onClick={onUnauthorized} type="button">
            退出 / Change Token
          </button>
        </div>
      </header>

      <div className="container-page py-10">

        {/* ── IMAGES ─────────────────────────────────────────────── */}
        <section>
          <h2 className="font-serif text-3xl text-ink">图片上传</h2>
          <p className="mt-1 text-sm text-muted">选择图片后点「上传到 R2」，上传成功后首页自动更新（约 30 秒）。</p>

          {Object.entries(groups).map(([section, sectionSlots]) => (
            <div key={section} className="mt-8">
              <h3 className="mb-4 text-lg font-bold text-ink">{section}</h3>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sectionSlots.map((slot) => (
                  <ImageCard
                    key={slot.key}
                    slot={slot}
                    item={slots[slot.key]}
                    onPick={(f) => pickFile(slot, f)}
                    onUpload={() => uploadSlot(slot)}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ── SOCIAL LINKS ───────────────────────────────────────── */}
        <section className="mt-14">
          <h2 className="font-serif text-3xl text-ink">社交链接</h2>
          <p className="mt-1 text-sm text-muted">填写后点「保存链接」，首页按钮将更新。</p>
          <div className="mt-5 rounded-xl border border-line bg-white p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {HOME_SOCIAL_SLOTS.map((slot) => (
                <label key={slot.key} className="block text-sm font-bold text-ink">
                  {slot.label}
                  <input
                    className="mt-2 min-h-11 w-full rounded border border-line px-3 text-sm font-normal outline-none focus:border-gold"
                    placeholder={slot.placeholder}
                    type="url"
                    value={social[slot.key] || ""}
                    onChange={(e) => setSocial((p) => ({ ...p, [slot.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            {socialMsg && <p className="mt-4 text-sm font-semibold text-muted">{socialMsg}</p>}
            {socialErr && <p className="mt-4 text-sm font-semibold text-red-600">{socialErr}</p>}
            <button className="btn-primary mt-5" onClick={saveSocial} type="button">保存链接</button>
          </div>
        </section>

        {/* ── FEATURED PICKS ─────────────────────────────────────── */}
        <section className="mt-14">
          <h2 className="font-serif text-3xl text-ink">Featured Picks 商品码</h2>
          <p className="mt-1 text-sm text-muted">
            填写首页展示的商品编号（如 <code className="rounded bg-paper px-1">LM-APP-0158</code>），留空则使用默认值。
          </p>
          <div className="mt-5 rounded-xl border border-line bg-white p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {HOME_FEATURED_SLOTS.map((slot) => (
                <label key={slot.key} className="block text-sm font-bold text-ink">
                  {slot.label}
                  <span className="ml-2 text-xs font-normal text-muted">默认：{slot.fallback}</span>
                  <input
                    className="mt-2 min-h-11 w-full rounded border border-line px-3 text-sm font-normal outline-none focus:border-gold"
                    placeholder={slot.fallback}
                    type="text"
                    value={featured[slot.key] || ""}
                    onChange={(e) => setFeatured((p) => ({ ...p, [slot.key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>
            {featuredMsg && <p className="mt-4 text-sm font-semibold text-muted">{featuredMsg}</p>}
            {featuredErr && <p className="mt-4 text-sm font-semibold text-red-600">{featuredErr}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="btn-secondary" onClick={refreshLatestProducts} type="button">Refresh Latest Products</button>
              <button className="btn-primary" onClick={saveFeatured} type="button">Save Manual Codes</button>
            </div>
          </div>
        </section>

        {/* ── SHIPPING PROOF FEEDBACK GALLERY ───────────────────── */}
        <section className="mt-14">
          <h2 className="font-serif text-3xl text-ink">Customer Feedback Gallery</h2>
          <p className="mt-1 text-sm text-muted">管理 /shipping-proof 页面里的反馈图片，可新增、排序、隐藏或删除。</p>
          <div className="mt-5 rounded-xl border border-line bg-white p-6">
            <label className="btn-secondary inline-flex cursor-pointer text-sm">
              新增 feedback 图片
              <input
                accept="image/*"
                className="hidden"
                type="file"
                onChange={(e) => addGalleryFile(e.target.files?.[0])}
              />
            </label>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...gallery].sort((a, b) => a.order - b.order).map((item, index) => (
                <div className="overflow-hidden rounded-xl border border-line bg-paper" key={item.id}>
                  {(item.previewUrl || item.url) ? (
                    <img alt={item.label} className="aspect-[4/3] w-full object-cover" src={item.previewUrl || item.url} />
                  ) : (
                    <div className="flex aspect-[4/3] items-center justify-center bg-white text-sm font-semibold text-muted">No image</div>
                  )}
                  <div className="grid gap-3 p-4">
                    <label className="text-sm font-bold text-ink">
                      Label
                      <input
                        className="mt-2 min-h-10 w-full rounded border border-line px-3 text-sm font-normal outline-none focus:border-gold"
                        value={item.label}
                        onChange={(e) => updateGalleryItem(item.id, { label: e.target.value })}
                      />
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-ink">
                      <input
                        checked={item.visible}
                        type="checkbox"
                        onChange={(e) => updateGalleryItem(item.id, { visible: e.target.checked })}
                      />
                      Visible
                    </label>
                    <p className="truncate text-xs text-muted">R2: {item.r2Key}</p>
                    <div className="flex flex-wrap gap-2">
                      {item.file ? (
                        <button className="btn-primary text-sm" disabled={item.uploading} onClick={() => uploadGalleryItem(item.id)} type="button">
                          {item.uploading ? "上传中…" : "上传"}
                        </button>
                      ) : null}
                      <button className="btn-secondary text-sm" disabled={index === 0} onClick={() => moveGalleryItem(item.id, -1)} type="button">上移</button>
                      <button className="btn-secondary text-sm" disabled={index === gallery.length - 1} onClick={() => moveGalleryItem(item.id, 1)} type="button">下移</button>
                      <button className="btn-secondary text-sm" onClick={() => setGallery((prev) => prev.filter((entry) => entry.id !== item.id))} type="button">删除</button>
                    </div>
                    {item.status && <p className="text-xs font-semibold text-muted">{item.status}</p>}
                    {item.error && <p className="text-xs font-semibold text-red-600">{item.error}</p>}
                  </div>
                </div>
              ))}
            </div>
            {galleryMsg && <p className="mt-4 text-sm font-semibold text-muted">{galleryMsg}</p>}
            {galleryErr && <p className="mt-4 text-sm font-semibold text-red-600">{galleryErr}</p>}
            <button className="btn-primary mt-5" onClick={saveGallery} type="button">保存 Gallery</button>
          </div>
        </section>

      </div>
    </main>
  );
}

function normalizeGallery(value: unknown): FeedbackDraft[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index): FeedbackDraft | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const url = typeof row.url === "string" ? row.url : "";
      if (!url) return null;
      return {
        id: typeof row.id === "string" && row.id ? row.id : `feedback-${index + 1}`,
        url,
        r2Key: typeof row.r2Key === "string" ? row.r2Key : "",
        label: typeof row.label === "string" && row.label ? row.label : `Customer feedback ${index + 1}`,
        order: Number.isFinite(Number(row.order)) ? Number(row.order) : index + 1,
        visible: row.visible !== false,
      };
    })
    .filter((item): item is FeedbackDraft => Boolean(item))
    .sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// ImageCard sub-component
// ---------------------------------------------------------------------------

function ImageCard({
  slot, item, onPick, onUpload,
}: {
  slot: HomeImageSlot;
  item: SlotState;
  onPick: (f?: File) => void;
  onUpload: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      {/* Preview */}
      <img
        alt={slot.label}
        className="aspect-[4/3] w-full object-cover"
        src={item.previewUrl || slot.fallback}
      />
      <div className="p-4">
        <p className="font-bold text-ink">{slot.label}</p>
        <p className="mt-0.5 truncate text-xs text-muted">R2: {slot.r2Key}</p>

        {/* Current saved URL */}
        {item.savedUrl && !item.savedUrl.startsWith("/") && (
          <a
            className="mt-1 block truncate text-xs text-gold underline"
            href={item.savedUrl}
            rel="noreferrer"
            target="_blank"
          >
            {item.savedUrl}
          </a>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <label className="btn-secondary cursor-pointer text-sm">
            选择图片
            <input
              ref={ref}
              accept="image/*"
              className="hidden"
              type="file"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </label>
          {item.file && (
            <button
              className="btn-primary text-sm"
              disabled={item.uploading}
              onClick={onUpload}
              type="button"
            >
              {item.uploading ? "上传中…" : "上传到 R2"}
            </button>
          )}
        </div>

        {item.status && <p className="mt-2 text-xs font-semibold text-muted">{item.status}</p>}
        {item.error && <p className="mt-2 text-xs font-semibold text-red-600">{item.error}</p>}
      </div>
    </div>
  );
}
