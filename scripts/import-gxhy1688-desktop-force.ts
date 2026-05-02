// @ts-nocheck
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";
import sharp from "sharp";

type Product = {
  product_code: string;
  category: string;
  title_cn: string;
  source_title_cn: string;
  description_cn: string;
  source_description_cn: string;
  image_count: number;
  source_album_url: string;
  source_product_url: string;
  source_fingerprint: string;
  source_tab: string;
  source_page: number;
  imported_at: string;
};

const args = process.argv.slice(2);
const getArg = (name: string, fallback = "") => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] || fallback : fallback;
};
const hasArg = (name: string) => args.includes(name);

const sourceUrl = getArg("--url");
const category = getArg("--category", "Watches");
const tabName = getArg("--tab", getArg("--category-tab", ""));
const pageNo = Number(getArg("--page", getArg("--page-number", "1"))) || 1;
const limitNew = Number(getArg("--limit-new", "5")) || 5;
const maxScan = Number(getArg("--max-scan", "120")) || 120;
const minImages = Number(getArg("--min-images", "9")) || 9;
const timeoutMs = Number(getArg("--product-timeout-ms", "45000")) || 45000;
const debug = hasArg("--debug");
const headed = hasArg("--headed");

if (!sourceUrl) {
  console.error("Missing --url");
  process.exit(1);
}

const prefixMap: Record<string, string> = {
  Apparel: "LM-APP",
  Shoes: "LM-SHO",
  Watches: "LM-WAT",
  Bags: "LM-BAG",
};
const prefix = prefixMap[category] || "LM-PRD";

function stamp() {
  const d = new Date();
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}-${z(d.getHours())}-${z(d.getMinutes())}-${z(d.getSeconds())}`;
}

const outDir = path.join(process.cwd(), "imports", "gxhy1688", `gxhy-desktop-force-${stamp()}`);
const imagesDir = path.join(outDir, "images");
const debugDir = path.join(outDir, "debug");

function sha(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

function cleanText(s: string) {
  return s
    .replace(/\s+/g, " ")
    .replace(/下载/g, " ")
    .replace(/一键转发/g, " ")
    .replace(/扫码下单/g, " ")
    .replace(/长按识别/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productCode(n: number) {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

async function ensureDirs() {
  await fsp.mkdir(outDir, { recursive: true });
  await fsp.mkdir(imagesDir, { recursive: true });
  await fsp.mkdir(debugDir, { recursive: true });
}

async function writeJson(file: string, data: unknown) {
  await fsp.writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

async function saveProgress(stage: string, extra: Record<string, unknown> = {}) {
  await writeJson(path.join(outDir, "import-progress.json"), {
    source_url: sourceUrl,
    category,
    selected_tab: tabName,
    selected_page: pageNo,
    requested_limit_new: limitNew,
    stage,
    updated_at: new Date().toISOString(),
    ...extra,
  });
}

function normalizeUrl(u: string) {
  if (!u) return "";
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("/")) return `https://gxhy1688.com${u}`;
  return u;
}

function isGoodImageUrl(u: string) {
  if (!u) return false;
  const lower = u.toLowerCase();
  if (!/^https?:\/\//.test(lower)) return false;
  if (lower.includes("captcha")) return false;
  if (lower.includes("qrcode")) return false;
  if (lower.includes("logo")) return false;
  if (lower.includes("avatar")) return false;
  if (lower.includes("favicon")) return false;
  return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(lower);
}

function expandSeries(seed: string) {
  const clean = seed.split("?")[0];
  const m = clean.match(/^(.*\/)(\d+)(\.(jpg|jpeg|png|webp))$/i);
  if (!m) return [seed];
  const base = m[1];
  const ext = m[3];
  const urls: string[] = [];
  for (let i = 0; i <= 20; i++) urls.push(`${base}${i}${ext}`);
  return urls;
}

async function fetchBuffer(url: string, ms = 15000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    const b = Buffer.from(ab);
    if (b.length < 5000) return null;
    return b;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function downloadImages(urls: string[], code: string) {
  const displayDir = path.join(imagesDir, code, "display");
  const thumbsDir = path.join(imagesDir, code, "thumbs");
  await fsp.mkdir(displayDir, { recursive: true });
  await fsp.mkdir(thumbsDir, { recursive: true });

  const saved: string[] = [];
  const seen = new Set<string>();

  for (const url of urls) {
    if (saved.length >= 12) break;
    if (seen.has(url)) continue;
    seen.add(url);

    const buf = await fetchBuffer(url);
    if (!buf) continue;

    try {
      const meta = await sharp(buf).metadata();
      if ((meta.width || 0) < 250 || (meta.height || 0) < 250) continue;

      const n = String(saved.length + 1).padStart(2, "0");
      await sharp(buf)
        .resize({ width: 1600, withoutEnlargement: true })
        .webp({ quality: 88 })
        .toFile(path.join(displayDir, `${n}.webp`));

      await sharp(buf)
        .resize({ width: 520, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(thumbsDir, `${n}.webp`));

      saved.push(url);
    } catch {
      continue;
    }
  }

  return saved;
}

async function main() {
  await ensureDirs();
  await saveProgress("starting");

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    isMobile: false,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(timeoutMs);

  const products: Product[] = [];
  const skipped: any[] = [];

  try {
    await saveProgress("opening_page");
    await page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    if (debug) {
      await page.screenshot({ path: path.join(debugDir, "before-tab-click.png"), fullPage: true });
      await fsp.writeFile(path.join(debugDir, "before-tab-click.html"), await page.content());
    }

    if (tabName) {
      await saveProgress("clicking_tab");
      const clicked = await page.evaluate((tab) => {
        const els = Array.from(document.querySelectorAll("a,button,li,span,div"));
        const candidates = els
          .map((el) => {
            const text = (el.textContent || "").trim();
            const r = (el as HTMLElement).getBoundingClientRect();
            return { el, text, top: r.top, left: r.left, width: r.width, height: r.height };
          })
          .filter((x) => x.text === tab || (x.text.includes(tab) && x.text.length <= tab.length + 10))
          .filter((x) => x.width > 10 && x.height > 10)
          .sort((a, b) => a.top - b.top || a.left - b.left);

        const target = candidates[0]?.el as HTMLElement | undefined;
        if (!target) return false;
        target.scrollIntoView({ block: "center" });
        target.click();
        return true;
      }, tabName);

      if (!clicked) throw new Error(`Cannot find gxhy tab: ${tabName}`);
      await page.waitForTimeout(4000);

      if (debug) {
        await page.screenshot({ path: path.join(debugDir, "after-tab-click.png"), fullPage: true });
        await fsp.writeFile(path.join(debugDir, "after-tab-click.html"), await page.content());
      }
    }

    if (pageNo > 1) {
      await saveProgress("clicking_page");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(1500);

      if (debug) {
        await page.screenshot({ path: path.join(debugDir, "before-page-click.png"), fullPage: true });
        await fsp.writeFile(path.join(debugDir, "before-page-click.html"), await page.content());
      }

      const clickedPage = await page.evaluate((pageText) => {
        const els = Array.from(document.querySelectorAll("a,button,li,span,div"));
        const candidates = els
          .map((el) => {
            const text = (el.textContent || "").trim();
            const r = (el as HTMLElement).getBoundingClientRect();
            return { el, text, top: r.top, left: r.left, width: r.width, height: r.height };
          })
          .filter((x) => x.text === pageText)
          .filter((x) => x.width > 8 && x.height > 8)
          .sort((a, b) => b.top - a.top);
        const target = candidates[0]?.el as HTMLElement | undefined;
        if (!target) return false;
        target.scrollIntoView({ block: "center" });
        target.click();
        return true;
      }, String(pageNo));

      if (!clickedPage) throw new Error(`Cannot find gxhy page: ${pageNo}`);
      await page.waitForTimeout(4000);

      if (debug) {
        await page.screenshot({ path: path.join(debugDir, "after-page-click.png"), fullPage: true });
        await fsp.writeFile(path.join(debugDir, "after-page-click.html"), await page.content());
      }
    }

    await saveProgress("scrolling");
    for (let i = 0; i < 8; i++) {
      await page.evaluate((y) => window.scrollTo(0, y), i * 900);
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    await saveProgress("extracting_candidates");

    const candidates = await page.evaluate((max) => {
      const priceRe = /(￥|¥)\s*\d+|[pP]\s*\d{2,}/;
      const getUrl = (img: HTMLImageElement) =>
        img.currentSrc ||
        img.src ||
        img.getAttribute("data-src") ||
        img.getAttribute("data-original") ||
        "";

      const visible = (el: Element) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        const style = window.getComputedStyle(el as HTMLElement);
        return r.width > 80 && r.height > 80 && style.display !== "none" && style.visibility !== "hidden";
      };

      const rows: any[] = [];
      const seen = new Set<string>();
      const imgs = Array.from(document.images).filter((img) => {
        const u = getUrl(img);
        const r = img.getBoundingClientRect();
        return u && visible(img) && r.width > 100 && r.height > 100;
      });

      for (const img of imgs) {
        let node: Element | null = img;
        let chosen: Element | null = null;

        for (let depth = 0; depth < 8 && node?.parentElement; depth++) {
          node = node.parentElement;
          const text = ((node as HTMLElement).innerText || "").trim();
          const r = (node as HTMLElement).getBoundingClientRect();
          const imageCount = node.querySelectorAll("img").length;

          if (
            text.length >= 10 &&
            text.length <= 2500 &&
            imageCount >= 1 &&
            r.width >= 160 &&
            r.height >= 160 &&
            (priceRe.test(text) || text.includes("下载") || text.includes("一键转发"))
          ) {
            chosen = node;
            break;
          }
        }

        if (!chosen) continue;

        const text = ((chosen as HTMLElement).innerText || "").trim();
        if (text.includes("扫码") || text.includes("代发宣传") || text.includes("关注")) continue;

        const imageUrls = Array.from(chosen.querySelectorAll("img"))
          .map((x) => getUrl(x as HTMLImageElement))
          .filter(Boolean);

        const first = imageUrls[0] || getUrl(img);
        const key = first + "|" + text.slice(0, 80);
        if (seen.has(key)) continue;
        seen.add(key);

        const r = (chosen as HTMLElement).getBoundingClientRect();
        rows.push({
          index: rows.length + 1,
          text,
          firstImage: first,
          imageUrls,
          rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        });
      }

      return rows.slice(0, max);
    }, maxScan);

    await writeJson(path.join(debugDir, "desktop-product-candidates.json"), candidates);

    if (!candidates.length) {
      throw new Error("No desktop product candidates found after tab/page click");
    }

    let seq = 1;

    for (const cand of candidates) {
      if (products.length >= limitNew) break;

      const code = productCode(seq);
      const cardShot = path.join(debugDir, `product-${String(seq).padStart(3, "0")}-card.png`);
      const detailShot = path.join(debugDir, `product-${String(seq).padStart(3, "0")}-detail.png`);

      await saveProgress("processing_product", {
        scanned_count: cand.index,
        exported_count: products.length,
        last_product_index: cand.index,
      });

      const cardImages = Array.from(new Set((cand.imageUrls || []).map(normalizeUrl).filter(isGoodImageUrl)));
      await writeJson(path.join(debugDir, `product-${String(seq).padStart(3, "0")}-card-images.json`), cardImages);

      try {
        await page.mouse.click(cand.rect.x + Math.min(cand.rect.width / 2, 220), cand.rect.y + Math.min(cand.rect.height / 2, 220));
        await page.waitForTimeout(1800);
        if (debug) await page.screenshot({ path: detailShot, fullPage: true });
      } catch {
        skipped.push({ index: cand.index, product_title: cleanText(cand.text).slice(0, 120), reason: "detail_open_failed", card_image_count: cardImages.length });
        continue;
      }

      const detailImages = await page.evaluate(() => {
        const urls: string[] = [];
        const norm = (u: string) => {
          if (!u) return "";
          if (u.startsWith("//")) return `https:${u}`;
          if (u.startsWith("/")) return `https://gxhy1688.com${u}`;
          return u;
        };
        const add = (u: string) => {
          u = norm(u);
          if (!u) return;
          if (!/^https?:\/\//i.test(u)) return;
          if (!/\.(jpg|jpeg|png|webp)(\?|$)/i.test(u)) return;
          urls.push(u);
        };

        for (const img of Array.from(document.images)) {
          const r = img.getBoundingClientRect();
          if (r.width < 100 || r.height < 100) continue;
          add(img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("data-original") || "");
        }

        for (const el of Array.from(document.querySelectorAll("*"))) {
          const bg = window.getComputedStyle(el as HTMLElement).backgroundImage || "";
          const m = bg.match(/url\(["']?(.*?)["']?\)/);
          if (m) add(m[1]);
        }

        return Array.from(new Set(urls));
      });

      await writeJson(path.join(debugDir, `product-${String(seq).padStart(3, "0")}-detail-images.json`), detailImages);

      const expanded = new Set<string>();
      for (const u of [...cardImages, ...detailImages]) {
        for (const e of expandSeries(u)) {
          if (isGoodImageUrl(e)) expanded.add(e);
        }
      }

      const finalUrls = Array.from(expanded);
      await writeJson(path.join(debugDir, `product-${String(seq).padStart(3, "0")}-final-images.json`), finalUrls);

      const saved = await downloadImages(finalUrls, code);

      if (saved.length < minImages) {
        skipped.push({
          index: cand.index,
          product_title: cleanText(cand.text).slice(0, 120),
          card_image_count: cardImages.length,
          detail_image_count: detailImages.length,
          final_image_count: saved.length,
          reason: "below_min_images",
        });
        await fsp.rm(path.join(imagesDir, code), { recursive: true, force: true });
        continue;
      }

      const title = cleanText(cand.text).slice(0, 260);
      const fingerprintBase = `${sourceUrl}|${tabName}|${pageNo}|${saved[0] || cand.firstImage}|${title}`;
      const product: Product = {
        product_code: code,
        category,
        title_cn: title,
        source_title_cn: title,
        description_cn: title,
        source_description_cn: title,
        image_count: saved.length,
        source_album_url: sourceUrl,
        source_product_url: `${sourceUrl}#${tabName || "all"}-page-${pageNo}-item-${cand.index}`,
        source_fingerprint: sha(fingerprintBase),
        source_tab: tabName,
        source_page: pageNo,
        imported_at: new Date().toISOString(),
      };

      products.push(product);
      seq++;

      await writeJson(path.join(outDir, "products-import.partial.json"), products);
      await writeJson(path.join(outDir, "skipped-products.json"), skipped);

      try {
        await page.keyboard.press("Escape");
        await page.waitForTimeout(300);
      } catch {}
    }

    await writeJson(path.join(outDir, "products-import.json"), products);
    await writeJson(path.join(outDir, "skipped-products.json"), skipped);
    await writeJson(path.join(outDir, "import-report.json"), {
      source_url: sourceUrl,
      output_folder: outDir,
      category,
      selected_tab: tabName,
      selected_page: pageNo,
      total_candidates: candidates.length,
      exported_count: products.length,
      skipped_count: skipped.length,
      total_images_downloaded: products.reduce((s, p) => s + p.image_count, 0),
      skipped_products: skipped,
      output_file: path.join(outDir, "products-import.json"),
    });

    await saveProgress("done", {
      scanned_count: candidates.length,
      exported_count: products.length,
      skipped_count: skipped.length,
      output_file: path.join(outDir, "products-import.json"),
    });

    console.log(JSON.stringify({
      output_folder: outDir,
      products_exported: products.length,
      skipped: skipped.length,
      output_json: path.join(outDir, "products-import.json"),
    }, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(async (err) => {
  await saveProgress("failed", { error: String(err?.message || err) }).catch(() => {});
  console.error(err);
  process.exit(1);
});
