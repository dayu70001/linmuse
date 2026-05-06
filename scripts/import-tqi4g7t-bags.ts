import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium, firefox, webkit, type Browser, type Page } from "playwright";
import sharp from "sharp";

type Options = {
  url: string;
  category: string;
  limitNew: number;
  maxScan: number;
  minImages: number;
  imageLimit: number;
  outDir: string;
  debug: boolean;
  headed: boolean;
  scanOnly: boolean;
  excludeFile: string;
};

type Candidate = {
  index: number;
  source: "network" | "dom";
  titleHint: string;
  descriptionHint: string;
  coverUrl: string;
  imageUrls: string[];
  sourceProductUrl: string;
  sourceFingerprint: string;
  imageCountHint: number;
  top: number;
  width: number;
  height: number;
  x: number;
  y: number;
  rejectReason: string;
  item?: ApiItem;
  finalUrl?: string;
};

type Detail = {
  title: string;
  description: string;
  url: string;
  imageUrls: string[];
  wholeStore: boolean;
};

type ProductExport = {
  product_code: string;
  category: string;
  title_cn: string;
  source_title_cn: string;
  description_cn: string;
  source_description_cn: string;
  source_album_url: string;
  source_product_url: string;
  source_fingerprint: string;
  image_count: number;
  gallery_images: string;
  display_images: string[];
  image_paths: string[];
  thumbnail_images: string[];
  thumbnail_image_paths: string[];
  main_image: string;
  main_image_path: string;
  main_thumbnail: string;
  main_thumbnail_path: string;
  gallery_thumbnails: string;
  image_folder: string;
  source_url: string;
  import_batch_id: string;
  imported_at: string;
  source_order: number;
  candidate_index: number;
  slug: string;
  title_en: string;
  description_en: string;
  translation_provider: "none";
  translation_status: "fallback";
  status: "draft";
  notes: string;
};

type ApiItem = Record<string, any>;

const DEFAULT_URL = "https://shop09236014.wecatalog.cn/t/TQi4g7t";
const SHELL_TEXT_RE = /A东成皮具|古奇\s*原厂皮|我的店铺|店铺已全新装修|就差你的光顾|欢迎光临|联系TA|全部上新|客服|购物车/g;
const BANNED_IMAGE_RE = /avatar|logo|qrcode|qr|minicode|album_bg|banner|cover|background|shop|store|profile|header|poster|video|template|wechat/i;
const STORE_TITLE_RE = /^A东成皮具\s*【古奇\s*原厂皮】?$/;
const BAD_TITLE_PART_RE = /A东成皮具|古奇\s*原厂皮|我的店铺|店铺|店铺已全新装修|已全新装修|全新装修|就差你的光顾|光顾|欢迎光临|联系TA|全部上新|客服|购物车/;
const TITLE_FIELD_NAMES = [
  "title",
  "name",
  "desc",
  "description",
  "content",
  "productName",
  "goodsName",
  "itemName",
  "text",
  "remark",
  "intro",
  "subTitle",
  "goodsNum",
];

function parseArgs(): Options {
  const args = process.argv.slice(2);
  const read = (name: string, fallback: string) => {
    const index = args.indexOf(name);
    return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
  };
  const flag = (name: string) => args.includes(name);
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");

  return {
    url: read("--url", DEFAULT_URL),
    category: read("--category", "Bags"),
    limitNew: Number(read("--limit-new", "50")),
    maxScan: Number(read("--max-scan", "300")),
    minImages: Number(read("--min-images", "9")),
    imageLimit: Number(read("--image-limit", "9")),
    outDir: read("--out-dir", path.join(process.cwd(), "imports", "wecatalog", `tqi4g7t-bags-${timestamp}`)),
    debug: flag("--debug"),
    headed: flag("--headed"),
    scanOnly: flag("--scan-only"),
    excludeFile: read("--exclude-file", ""),
  };
}

function cleanText(value: string) {
  return value
    .replace(SHELL_TEXT_RE, " ")
    .replace(/[🔷🌟📢]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBadTitle(value: string) {
  const title = cleanText(value)
    .replace(/[【】\[\]（）(){}<>《》]/g, "")
    .replace(/\s+/g, "")
    .trim();
  if (!title) return true;
  if (/^【\s*】$/.test(value.trim()) || value.trim() === "【】") return true;
  if (/^[\p{P}\p{S}\s]+$/u.test(value)) return true;
  if (/^[￥¥]\s*共\s*[￥¥]\s*0$/i.test(title)) return true;
  if (BAD_TITLE_PART_RE.test(value)) return true;
  return false;
}

function summarizeProductTitle(value: string) {
  const cleaned = cleanText(value);
  if (isBadTitle(cleaned)) return "";
  const priceMatch = cleaned.match(/批\s*([0-9]+(?:\.[0-9]+)?)/);
  const codeMatch = cleaned.match(/款号\s*([A-Za-z0-9-]+[\u4e00-\u9fa5A-Za-z0-9-]*)/);
  if (priceMatch && codeMatch) {
    return `批${priceMatch[1]}，款号${codeMatch[1]}`;
  }
  return cleaned;
}

function firstValidTextFromObject(item: ApiItem) {
  for (const field of TITLE_FIELD_NAMES) {
    const value = item[field];
    if (typeof value === "string") {
      const title = summarizeProductTitle(value);
      if (title) return title;
    }
  }
  return "";
}

function fullDescriptionFromObject(item: ApiItem, fallbackTitle: string) {
  for (const field of TITLE_FIELD_NAMES) {
    const value = item[field];
    if (typeof value === "string") {
      const cleaned = cleanText(value);
      if (!isBadTitle(cleaned)) return cleaned;
    }
  }
  return fallbackTitle;
}

function absoluteUrl(url: string, base: string) {
  try {
    return new URL(url, base).toString();
  } catch {
    return "";
  }
}

function normalizeImageUrl(url: string) {
  if (!url || url.startsWith("data:") || url.startsWith("blob:")) return "";
  const parsed = new URL(url);
  parsed.pathname = parsed.pathname.replace(/\/cmp_i/g, "/i");
  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) {
    if (/^(x-oss-process|imageView|imageMogr|width|height|w|h|resize|thumbnail)$/i.test(key)) {
      parsed.searchParams.delete(key);
    }
  }
  return parsed.toString();
}

function isRejectedImageUrl(url: string) {
  return !url || BANNED_IMAGE_RE.test(url) || /\.(svg|gif)(\?|$)/i.test(url);
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function fingerprintFor(parts: string[]) {
  return crypto.createHash("sha1").update(parts.filter(Boolean).join("|")).digest("hex");
}

function collectImageUrlsDeep(value: unknown, baseUrl: string, output: string[] = []) {
  if (!value) return output;
  if (typeof value === "string") {
    if (/^https?:\/\/|^\/\//.test(value) && /\.(jpe?g|png|webp)(?:[?#].*)?$/i.test(value)) {
      const absolute = value.startsWith("//") ? `https:${value}` : absoluteUrl(value, baseUrl);
      try {
        const normalized = normalizeImageUrl(absolute);
        if (normalized && !isRejectedImageUrl(normalized)) output.push(normalized);
      } catch {
        // Ignore malformed media strings while recursively scanning JSON.
      }
    }
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectImageUrlsDeep(item, baseUrl, output);
    return output;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) collectImageUrlsDeep(item, baseUrl, output);
  }
  return output;
}

function collectProductObjectsDeep(value: unknown, baseUrl: string, output: ApiItem[] = []) {
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value)) {
    for (const item of value) collectProductObjectsDeep(item, baseUrl, output);
    return output;
  }

  const item = value as ApiItem;
  const title = firstValidTextFromObject(item);
  const images = unique(collectImageUrlsDeep(item, baseUrl));
  if (title && images.length >= 1) {
    output.push(item);
  }
  for (const child of Object.values(item)) {
    if (child && typeof child === "object") collectProductObjectsDeep(child, baseUrl, output);
  }
  return output;
}

function headersCookie(headers: Headers) {
  const getSetCookie = (headers as any).getSetCookie?.bind(headers);
  const cookies = typeof getSetCookie === "function" ? getSetCookie() : [];
  const raw = cookies.length > 0 ? cookies : [headers.get("set-cookie") || ""];
  return raw
    .flatMap((item) => String(item).split(/,(?=\s*[^;,]+=)/))
    .map((item) => item.split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

function albumIdFromUrl(url: string) {
  const match = url.match(/\/store\/([^/?#]+)/);
  return match?.[1] || "";
}

function imageUrlsFromApiItem(item: ApiItem, baseUrl: string) {
  const fromSourceList = Array.isArray(item.sourceList)
    ? item.sourceList.flatMap((source: ApiItem) => Array.isArray(source.medias) ? source.medias : [])
      .flatMap((media: ApiItem) => [media.url, media.src, media.thumbnail, media.cover])
    : [];
  const direct = unique([
    ...(Array.isArray(item.imgsSrc) ? item.imgsSrc : []),
    ...(Array.isArray(item.imgs) ? item.imgs : []),
    ...(Array.isArray(item.images) ? item.images : []),
    ...fromSourceList,
  ]
    .map((url) => absoluteUrl(String(url || ""), baseUrl))
    .map((url) => {
      try {
        return normalizeImageUrl(url);
      } catch {
        return "";
      }
    })
    .filter((url) => url && !isRejectedImageUrl(url)));
  return unique([...direct, ...collectImageUrlsDeep(item, baseUrl)]);
}

function apiItemTitle(item: ApiItem) {
  return firstValidTextFromObject(item);
}

async function loadExcludedFingerprints(filePath: string) {
  if (!filePath) return new Set<string>();
  const raw = await fs.readFile(filePath, "utf8");
  const rows = JSON.parse(raw) as Array<{ source_fingerprint?: string }>;
  return new Set(rows.map((row) => row.source_fingerprint || "").filter(Boolean));
}

function titleList(items: Candidate[]) {
  return items.map((item) => item.titleHint).filter(Boolean);
}

async function runScanOnly(options: Options) {
  const excluded = await loadExcludedFingerprints(options.excludeFile);
  const candidates = await collectApiCandidates(options);
  const skipReasons: Record<string, number> = {};
  const seenFingerprints = new Set<string>();
  const validTitleCandidates: Candidate[] = [];
  const imageCountGte9Candidates: Candidate[] = [];
  const availableNewCandidates: Candidate[] = [];
  let duplicateFingerprints = 0;
  let alreadyExistingByFingerprint = 0;
  let badTitleCandidates = 0;

  for (const candidate of candidates) {
    const titleValid = !!candidate.titleHint && !isBadTitle(candidate.titleHint);
    if (!titleValid) {
      badTitleCandidates += 1;
      skipReasons.bad_or_empty_title = (skipReasons.bad_or_empty_title || 0) + 1;
      continue;
    }
    validTitleCandidates.push(candidate);

    if (candidate.imageCountHint < options.minImages) {
      const reason = `fewer_than_${options.minImages}_product_images`;
      skipReasons[reason] = (skipReasons[reason] || 0) + 1;
      continue;
    }
    imageCountGte9Candidates.push(candidate);

    if (seenFingerprints.has(candidate.sourceFingerprint)) {
      duplicateFingerprints += 1;
      skipReasons.duplicate_source_fingerprint = (skipReasons.duplicate_source_fingerprint || 0) + 1;
      continue;
    }
    seenFingerprints.add(candidate.sourceFingerprint);

    if (excluded.has(candidate.sourceFingerprint)) {
      alreadyExistingByFingerprint += 1;
      skipReasons.already_existing_by_fingerprint = (skipReasons.already_existing_by_fingerprint || 0) + 1;
      continue;
    }

    availableNewCandidates.push(candidate);
  }

  console.log(JSON.stringify({
    total_candidates: candidates.length,
    valid_title_candidates: validTitleCandidates.length,
    image_count_gte_9: imageCountGte9Candidates.length,
    bad_title_candidates: badTitleCandidates,
    duplicate_source_fingerprint: duplicateFingerprints,
    already_existing_by_fingerprint: alreadyExistingByFingerprint,
    available_new_candidates: availableNewCandidates.length,
    skip_reasons: skipReasons,
    first_20_valid_candidate_titles: titleList(validTitleCandidates.slice(0, 20)),
    last_20_valid_candidate_titles: titleList(validTitleCandidates.slice(-20)),
    first_20_available_new_candidate_titles: titleList(availableNewCandidates.slice(0, 20)),
    last_20_available_new_candidate_titles: titleList(availableNewCandidates.slice(-20)),
  }, null, 2));
}

async function fetchApiItems(options: Options) {
  const landing = await fetch(options.url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0 LM-Dkbrand-local-importer TQi4g7t" },
  });
  const finalUrl = landing.url;
  const albumId = albumIdFromUrl(finalUrl);
  const cookie = headersCookie(landing.headers);
  if (!albumId) throw new Error(`network_json_missing_album_id final_url=${finalUrl}`);

  const items: ApiItem[] = [];
  const seenKeys = new Set<string>();
  let pageTimestamp = "";
  let isLoadMore = true;
  let slipType = 0;
  let noNewPages = 0;

  while (items.length < options.maxScan && isLoadMore && noNewPages < 3) {
    const apiUrl = new URL("/album/personal/all", "https://www.wecatalog.cn");
    const params: Record<string, string> = {
      currTab: "all",
      albumId,
      searchValue: "",
      searchImg: "",
      slipType: String(slipType),
      timestamp: slipType ? pageTimestamp : "",
      requestDataType: "",
    };
    for (const [key, value] of Object.entries(params)) apiUrl.searchParams.set(key, value);
    const body = new URLSearchParams();
    body.set("tagList", "[]");
    const response = await fetch(apiUrl, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": "Mozilla/5.0 LM-Dkbrand-local-importer TQi4g7t",
        Referer: finalUrl,
        Cookie: cookie,
      },
    });
    if (!response.ok) throw new Error(`network_json_http_${response.status}`);
    const json = await response.json() as ApiItem;
    if (json.errcode !== 0) throw new Error(`network_json_error_${json.errcode}_${json.errmsg || ""}`);
    const result = json.result || {};
    const pageItems = Array.isArray(result.items) ? result.items : [];
    const discovered = unique([...pageItems, ...collectProductObjectsDeep(result, finalUrl)]);
    let added = 0;
    for (const item of discovered) {
      const images = imageUrlsFromApiItem(item, finalUrl);
      const title = apiItemTitle(item);
      const key = String(item.goods_id || item.itemId || item.id || fingerprintFor([title, images[0] || ""]));
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      items.push(item);
      added += 1;
      if (items.length >= options.maxScan) break;
    }
    noNewPages = added > 0 ? 0 : noNewPages + 1;
    const pagination = result.pagination || {};
    pageTimestamp = String(pagination.pageTimestamp || "");
    isLoadMore = Boolean(pagination.isLoadMore) && pageItems.length > 0 && !!pageTimestamp;
    slipType = 1;
  }

  return { items: items.slice(0, options.maxScan), albumId, finalUrl };
}

async function collectApiCandidates(options: Options) {
  const { items, finalUrl } = await fetchApiItems(options);
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  for (const item of items) {
    const images = imageUrlsFromApiItem(item, finalUrl);
    const coverUrl = images[0] || "";
    const titleHint = apiItemTitle(item);
    const descriptionHint = fullDescriptionFromObject(item, titleHint);
    const shopId = String(item.shop_id || item.targetAlbumId || "");
    const goodsId = String(item.goods_id || item.itemId || item.id || "");
    const sourceProductUrl = shopId && goodsId
      ? `https://www.wecatalog.cn/static/index.html#/product/${encodeURIComponent(shopId)}/${encodeURIComponent(goodsId)}`
      : finalUrl;
    const sourceFingerprint = fingerprintFor([options.url, sourceProductUrl, titleHint, coverUrl]);
    const dedupeKey = sourceFingerprint || `${titleHint}|${coverUrl}` || coverUrl;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    let rejectReason = "";
    if (!coverUrl) rejectReason = "no_real_cover_image";
    if (isRejectedImageUrl(coverUrl)) rejectReason = "banned_image_url";
    if (!titleHint) rejectReason = "bad_or_empty_title";
    if (!rejectReason && images.length < options.minImages) rejectReason = `fewer_than_${options.minImages}_product_images`;
    candidates.push({
      index: candidates.length,
      source: "network",
      titleHint,
      descriptionHint,
      coverUrl,
      imageUrls: images,
      sourceProductUrl,
      sourceFingerprint,
      imageCountHint: images.length,
      top: candidates.length * 220,
      width: 180,
      height: 180,
      x: 0,
      y: 0,
      rejectReason,
      item,
      finalUrl,
    });
  }
  return candidates.slice(0, options.maxScan);
}

function detailFromApiCandidate(candidate: Candidate, options: Options): Detail {
  const title = candidate.titleHint;
  const description = candidate.descriptionHint || title;
  return {
    title,
    description: isBadTitle(description) ? title : description,
    url: candidate.sourceProductUrl || options.url,
    imageUrls: candidate.imageUrls,
    wholeStore: STORE_TITLE_RE.test(title),
  };
}

async function autoScroll(page: Page, maxSteps = 12) {
  for (let i = 0; i < maxSteps; i += 1) {
    if (page.isClosed()) return;
    await page.evaluate("window.scrollBy(0, Math.floor(window.innerHeight * 0.85))").catch(() => undefined);
    await page.waitForTimeout(500).catch(() => undefined);
  }
  await page.evaluate("window.scrollTo(0, 0)").catch(() => undefined);
  await page.waitForTimeout(500).catch(() => undefined);
}

async function collectCandidates(page: Page, options: Options): Promise<Candidate[]> {
  await autoScroll(page, Math.min(22, Math.ceil(options.maxScan / 8)));
  if (page.isClosed()) return [];

  const raw = await page.evaluate(new Function("params", `
    const banned = new RegExp(params.bannedImageSource, "i");
    const shell = new RegExp(params.shellSource, "g");
    const maxScan = params.maxScan;
    const textOf = (node) => (node && node.textContent || "").replace(shell, " ").replace(/\\s+/g, " ").trim();
    const visible = (rect) => rect.width >= 90 && rect.height >= 90 && rect.top > -20;
    const imageUrlOf = (img) => img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("data-original") || "";
    const bestCard = (img) => {
      let node = img;
      let best = img;
      for (let depth = 0; node && depth < 7; depth += 1, node = node.parentElement) {
        const rect = node.getBoundingClientRect();
        const text = textOf(node);
        if (rect.width >= 120 && rect.width <= window.innerWidth + 40 && rect.height >= 120 && rect.height <= 900) {
          best = node;
          if (text.length > 6 || node.querySelectorAll("img").length >= 1) break;
        }
      }
      return best;
    };

    const seen = new Set();
    return Array.from(document.images)
      .map((img) => {
        const rect = img.getBoundingClientRect();
        const coverUrl = imageUrlOf(img);
        const card = bestCard(img);
        const cardRect = card.getBoundingClientRect();
        const rawText = textOf(card);
        let rejectReason = "";
        if (!visible(rect)) rejectReason = "image_too_small_or_hidden";
        if (banned.test(coverUrl)) rejectReason = "banned_image_url";
        if (seen.has(coverUrl)) rejectReason = "duplicate_cover";
        if (!rejectReason) seen.add(coverUrl);
        const titleHint = rawText.slice(0, 120);
        return {
          index: 0,
          titleHint,
          coverUrl,
          top: Math.round(rect.top + window.scrollY),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          x: Math.round(cardRect.left + Math.min(cardRect.width / 2, rect.left - cardRect.left + rect.width / 2)),
          y: Math.round(cardRect.top + Math.min(cardRect.height / 2, rect.top - cardRect.top + rect.height / 2)),
          rejectReason,
        };
      })
      .filter((item) => item.coverUrl)
      .sort((a, b) => a.top - b.top)
      .slice(0, maxScan * 2);
  `) as any, { bannedImageSource: BANNED_IMAGE_RE.source, shellSource: SHELL_TEXT_RE.source, maxScan: options.maxScan });

  return raw
    .map((item) => ({ ...item, coverUrl: absoluteUrl(item.coverUrl, options.url) }))
    .filter((item) => item.coverUrl)
    .map((item, index) => {
      const titleHint = summarizeProductTitle(item.titleHint || "");
      const imageUrls = item.coverUrl ? [item.coverUrl] : [];
      return {
        ...item,
        index,
        source: "dom" as const,
        titleHint,
        descriptionHint: titleHint,
        imageUrls,
        sourceProductUrl: options.url,
        sourceFingerprint: fingerprintFor([options.url, titleHint, item.coverUrl]),
        imageCountHint: imageUrls.length,
        rejectReason: item.rejectReason || (!titleHint ? "bad_or_empty_title" : ""),
      };
    })
    .slice(0, options.maxScan);
}

async function clickCandidateForDetail(page: Page, sourceUrl: string, candidate: Candidate) {
  const before = page.url();
  await page.mouse.click(candidate.x, candidate.y).catch(() => undefined);
  await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => undefined);
  await page.waitForTimeout(1200).catch(() => undefined);
  if (page.url() === before) {
    await page.locator(`img[src="${candidate.coverUrl}"]`).first().click({ timeout: 800 }).catch(() => undefined);
    await page.waitForTimeout(1200).catch(() => undefined);
  }
  if (page.url() === sourceUrl) {
    await page.waitForTimeout(500).catch(() => undefined);
  }
}

async function extractDetail(page: Page, sourceUrl: string): Promise<Detail> {
  if (page.isClosed()) {
    return { title: "", description: "", url: "", imageUrls: [], wholeStore: true };
  }

  await autoScroll(page, 8);
  const data = await page.evaluate(new Function("params", `
    const banned = new RegExp(params.bannedImageSource, "i");
    const shell = new RegExp(params.shellSource, "g");
    const clean = (value) => value.replace(shell, " ").replace(/\\s+/g, " ").trim();
    const images = Array.from(document.images)
      .map((img) => ({
        src: img.currentSrc || img.src || img.getAttribute("data-src") || img.getAttribute("data-original") || "",
        width: img.naturalWidth || img.getBoundingClientRect().width,
        height: img.naturalHeight || img.getBoundingClientRect().height,
      }))
      .filter((img) => img.src && img.width >= 500 && img.height >= 500 && !banned.test(img.src))
      .map((img) => img.src);
    const titleNode = document.querySelector("h1,h2,.title,[class*='title'],[class*='name']");
    const title = clean((titleNode && titleNode.textContent || document.title || ""));
    const rawBody = document.body && document.body.innerText || "";
    const body = clean(rawBody);
    const description = body
      .split(/\\n+/)
      .map((line) => clean(line))
      .filter((line) => line && line !== title)
      .slice(0, 20)
      .join("\\n");
    return {
      title,
      description,
      body: rawBody,
      url: location.href,
      imageUrls: images,
    };
  `) as any, { bannedImageSource: BANNED_IMAGE_RE.source, shellSource: SHELL_TEXT_RE.source });

  const normalizedImages = unique(
    data.imageUrls
      .map((url) => absoluteUrl(url, data.url || sourceUrl))
      .map((url) => {
        try {
          return normalizeImageUrl(url);
        } catch {
          return "";
        }
      })
      .filter((url) => url && !isRejectedImageUrl(url))
  );
  const title = summarizeProductTitle(data.title);
  const wholeStore = STORE_TITLE_RE.test(data.title.trim()) || (data.body.includes("我的店铺") && normalizedImages.length === 0);
  return {
    title,
    description: isBadTitle(data.description) ? title : cleanText(data.description),
    url: data.url || sourceUrl,
    imageUrls: normalizedImages,
    wholeStore,
  };
}

async function downloadImage(url: string, referer: string) {
  const response = await fetch(url, {
    headers: {
      Referer: referer,
      "User-Agent": "Mozilla/5.0 LM-Dkbrand-local-importer TQi4g7t",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(input).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (width < 500 || height < 500) throw new Error(`low_resolution_${width}x${height}`);
  const display = await sharp(input).rotate().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 90 }).toBuffer();
  const thumbnail = await sharp(input).rotate().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  return {
    display,
    thumbnail,
    hash: crypto.createHash("sha1").update(input).digest("hex"),
  };
}

async function savePartial(outputRoot: string, exported: ProductExport[]) {
  await fs.mkdir(outputRoot, { recursive: true });
  await fs.writeFile(path.join(outputRoot, "products-import.partial.json"), JSON.stringify(exported, null, 2));
}

async function exportProduct(detail: Detail, candidate: Candidate, options: Options, order: number, exported: ProductExport[]) {
  const selectedUrls = detail.imageUrls;
  const title = detail.title && !isBadTitle(detail.title)
    ? detail.title
    : candidate.titleHint && !isBadTitle(candidate.titleHint)
      ? candidate.titleHint
      : "";
  if (!title) {
    return { row: null, realImages: selectedUrls.length, reason: "bad_or_empty_title" };
  }
  const description = detail.description && !isBadTitle(detail.description) ? detail.description : (candidate.descriptionHint || title);
  const sourceFingerprintValue = candidate.sourceFingerprint || fingerprintFor([options.url, detail.url, title, selectedUrls[0] || ""]);
  if (exported.some((row) => row.source_fingerprint === sourceFingerprintValue)) {
    return { row: null, realImages: selectedUrls.length, reason: "duplicate_source_fingerprint" };
  }
  const productCode = `LM-BAG-TQI4G7T-${String(order).padStart(4, "0")}`;
  const imageFolder = path.join("images", productCode);
  const displayFolder = path.join(imageFolder, "display");
  const thumbFolder = path.join(imageFolder, "thumbs");
  await fs.mkdir(path.join(options.outDir, displayFolder), { recursive: true });
  await fs.mkdir(path.join(options.outDir, thumbFolder), { recursive: true });

  const displayPaths: string[] = [];
  const thumbPaths: string[] = [];
  const seenHashes = new Set<string>();

  for (const url of selectedUrls) {
    if (displayPaths.length >= options.imageLimit) break;
    try {
      const image = await downloadImage(url, detail.url);
      if (seenHashes.has(image.hash)) continue;
      seenHashes.add(image.hash);
      const filename = `${String(displayPaths.length + 1).padStart(2, "0")}.webp`;
      const displayPath = path.join(displayFolder, filename);
      const thumbPath = path.join(thumbFolder, filename);
      await fs.writeFile(path.join(options.outDir, displayPath), image.display);
      await fs.writeFile(path.join(options.outDir, thumbPath), image.thumbnail);
      displayPaths.push(displayPath);
      thumbPaths.push(thumbPath);
    } catch {
      continue;
    }
  }

  if (displayPaths.length < options.minImages) {
    return { row: null, realImages: displayPaths.length, reason: "downloaded_images_fewer_than_min_images" };
  }

  const row: ProductExport = {
    product_code: productCode,
    category: options.category,
    title_cn: title,
    source_title_cn: title,
    description_cn: description,
    source_description_cn: description,
    source_album_url: options.url,
    source_product_url: detail.url,
    source_fingerprint: sourceFingerprintValue,
    image_count: displayPaths.length,
    gallery_images: displayPaths.join("|"),
    display_images: displayPaths,
    image_paths: displayPaths,
    thumbnail_images: thumbPaths,
    thumbnail_image_paths: thumbPaths,
    main_image: displayPaths[0],
    main_image_path: displayPaths[0],
    main_thumbnail: thumbPaths[0],
    main_thumbnail_path: thumbPaths[0],
    gallery_thumbnails: thumbPaths.join("|"),
    image_folder: imageFolder,
    source_url: options.url,
    import_batch_id: `tqi4g7t-bags-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
    imported_at: new Date().toISOString(),
    source_order: order,
    candidate_index: candidate.index,
    slug: productCode.toLowerCase(),
    title_en: title,
    description_en: description,
    translation_provider: "none",
    translation_status: "fallback",
    status: "draft",
    notes: "9 product images exported by TQi4g7t-only importer",
  };
  exported.push(row);
  await savePartial(options.outDir, exported);
  return { row, realImages: displayPaths.length, reason: "" };
}

async function runDebug(browser: Browser, options: Options) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto(options.url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);
  const candidates = await collectCandidates(page, options);
  for (const item of candidates.slice(0, 50)) {
    console.log(JSON.stringify({
      index: item.index,
      source: item.source,
      titleHint: item.titleHint,
      image_count_hint: item.imageCountHint,
      coverUrl: item.coverUrl,
      rejectReason: item.rejectReason || "",
    }));
  }
}

async function runDebugApiFallback(options: Options) {
  const candidates = await collectApiCandidates(options);
  for (const item of candidates.slice(0, 50)) {
    console.log(JSON.stringify({
      index: item.index,
      source: item.source,
      titleHint: item.titleHint,
      image_count_hint: item.imageCountHint,
      coverUrl: item.coverUrl,
      rejectReason: item.rejectReason || "",
    }));
  }
}

async function runImport(browser: Browser, options: Options) {
  await fs.mkdir(options.outDir, { recursive: true });
  const exported: ProductExport[] = [];
  let scanned = 0;
  let endedReason = "";
  const skipReasons: Record<string, number> = {};
  const markSkip = (reason: string) => {
    skipReasons[reason] = (skipReasons[reason] || 0) + 1;
  };

  const writeFinal = async () => {
    const outputFile = path.join(options.outDir, "products-import.json");
    await savePartial(options.outDir, exported);
    await fs.writeFile(outputFile, JSON.stringify(exported, null, 2));
    await fs.writeFile(path.join(process.cwd(), ".last-wecatalog-bags-products-file"), `${outputFile}\n`);
  };
  process.once("SIGINT", () => {
    savePartial(options.outDir, exported)
      .then(() => process.exit(130))
      .catch(() => process.exit(130));
  });

  const listPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await listPage.goto(options.url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await listPage.waitForTimeout(2500);
  const candidates = await collectCandidates(listPage, options);
  await listPage.close().catch(() => undefined);

  for (const candidate of candidates) {
    if (exported.length >= options.limitNew || scanned >= options.maxScan) break;
    scanned += 1;

    if (candidate.rejectReason) {
      markSkip(candidate.rejectReason);
      console.log(`[${scanned}/${candidates.length}] SKIP reason=${candidate.rejectReason} real_images=0 title=${candidate.titleHint.slice(0, 80)}`);
      await savePartial(options.outDir, exported);
      continue;
    }

    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
    try {
      await page.goto(options.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1200);
      await clickCandidateForDetail(page, options.url, candidate);
      const detail = await extractDetail(page, options.url);
      if (isBadTitle(detail.title) && candidate.titleHint) {
        detail.title = candidate.titleHint;
      }
      const title = detail.title || candidate.titleHint;
      if (detail.wholeStore || STORE_TITLE_RE.test(title)) {
        markSkip("whole_store_page_detected");
        console.log(`[${scanned}/${candidates.length}] SKIP reason=whole_store_page_detected real_images=${detail.imageUrls.length} title=${title.slice(0, 80)}`);
        await savePartial(options.outDir, exported);
      } else if (!title || isBadTitle(title)) {
        markSkip("bad_or_empty_title");
        console.log(`[${scanned}/${candidates.length}] SKIP reason=bad_or_empty_title real_images=${detail.imageUrls.length} title=${title.slice(0, 80)}`);
        await savePartial(options.outDir, exported);
      } else if (detail.imageUrls.length < options.minImages) {
        markSkip(`fewer_than_${options.minImages}_product_images`);
        console.log(`[${scanned}/${candidates.length}] SKIP reason=fewer_than_${options.minImages}_product_images real_images=${detail.imageUrls.length} title=${title.slice(0, 80)}`);
        await savePartial(options.outDir, exported);
      } else {
        const result = await exportProduct(detail, candidate, options, exported.length + 1, exported);
        if (result.row) {
          console.log(`[${scanned}/${candidates.length}] OK exported=${exported.length} image_count=${result.row.image_count} title=${result.row.source_title_cn.slice(0, 80)}`);
        } else {
          markSkip(result.reason);
          console.log(`[${scanned}/${candidates.length}] SKIP reason=${result.reason} real_images=${result.realImages} title=${title.slice(0, 80)}`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      const reason = message.replace(/\s+/g, "_").slice(0, 120);
      markSkip(reason);
      console.log(`[${scanned}/${candidates.length}] SKIP reason=${reason} real_images=0 title=${candidate.titleHint.slice(0, 80)}`);
      await savePartial(options.outDir, exported);
    } finally {
      await page.close().catch(() => undefined);
    }
  }

  if (!endedReason && exported.length < options.limitNew) {
    endedReason = "max_scan_or_candidates_exhausted_before_limit_new";
  }
  await writeFinal();
  console.log(JSON.stringify({
    output_folder: options.outDir,
    products_import_json: path.join(options.outDir, "products-import.json"),
    exported_count: exported.length,
    scanned_count: scanned,
    skip_reasons: skipReasons,
    ended_reason: endedReason,
  }, null, 2));
}

async function runImportApiFallback(options: Options) {
  await fs.mkdir(options.outDir, { recursive: true });
  const exported: ProductExport[] = [];
  const candidates = await collectApiCandidates(options);
  let scanned = 0;
  let endedReason = "";
  const skipReasons: Record<string, number> = {};
  const markSkip = (reason: string) => {
    skipReasons[reason] = (skipReasons[reason] || 0) + 1;
  };

  const writeFinal = async () => {
    const outputFile = path.join(options.outDir, "products-import.json");
    await savePartial(options.outDir, exported);
    await fs.writeFile(outputFile, JSON.stringify(exported, null, 2));
    await fs.writeFile(path.join(process.cwd(), ".last-wecatalog-bags-products-file"), `${outputFile}\n`);
  };
  process.once("SIGINT", () => {
    savePartial(options.outDir, exported)
      .then(() => process.exit(130))
      .catch(() => process.exit(130));
  });

  for (const candidate of candidates) {
    if (exported.length >= options.limitNew || scanned >= options.maxScan) break;
    scanned += 1;
    if (candidate.rejectReason) {
      markSkip(candidate.rejectReason);
      console.log(`[${scanned}/${candidates.length}] SKIP reason=${candidate.rejectReason} real_images=0 title=${candidate.titleHint.slice(0, 80)}`);
      await savePartial(options.outDir, exported);
    } else {
      const detail = detailFromApiCandidate(candidate, options);
      const title = !isBadTitle(detail.title) ? detail.title : candidate.titleHint;
      if (detail.wholeStore || STORE_TITLE_RE.test(title)) {
        markSkip("whole_store_page_detected");
        console.log(`[${scanned}/${candidates.length}] SKIP reason=whole_store_page_detected real_images=${detail.imageUrls.length} title=${title.slice(0, 80)}`);
        await savePartial(options.outDir, exported);
      } else if (!title || isBadTitle(title)) {
        markSkip("bad_or_empty_title");
        console.log(`[${scanned}/${candidates.length}] SKIP reason=bad_or_empty_title real_images=${detail.imageUrls.length} title=${title.slice(0, 80)}`);
        await savePartial(options.outDir, exported);
      } else if (detail.imageUrls.length < options.minImages) {
        markSkip(`fewer_than_${options.minImages}_product_images`);
        console.log(`[${scanned}/${candidates.length}] SKIP reason=fewer_than_${options.minImages}_product_images real_images=${detail.imageUrls.length} title=${title.slice(0, 80)}`);
        await savePartial(options.outDir, exported);
      } else {
        const result = await exportProduct(detail, candidate, options, exported.length + 1, exported);
        if (result.row) {
          console.log(`[${scanned}/${candidates.length}] OK exported=${exported.length} image_count=${result.row.image_count} title=${result.row.source_title_cn.slice(0, 80)}`);
        } else {
          markSkip(result.reason);
          console.log(`[${scanned}/${candidates.length}] SKIP reason=${result.reason} real_images=${result.realImages} title=${title.slice(0, 80)}`);
        }
      }
    }
  }

  if (!endedReason && exported.length < options.limitNew) {
    endedReason = "max_scan_or_candidates_exhausted_before_limit_new";
  }
  await writeFinal();
  console.log(JSON.stringify({
    output_folder: options.outDir,
    products_import_json: path.join(options.outDir, "products-import.json"),
    exported_count: exported.length,
    scanned_count: scanned,
    skip_reasons: skipReasons,
    ended_reason: endedReason,
    fallback: "network_json",
  }, null, 2));
}

async function main() {
  const options = parseArgs();
  try {
    if (options.scanOnly) {
      await runScanOnly(options);
    } else if (options.debug) {
      await runDebugApiFallback(options);
    } else {
      await runImportApiFallback(options);
    }
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`network_json_failed_falling_back_to_dom: ${message.split("\n")[0]}`);
  }

  let browser: Browser | null = null;
  const launchers = [
    ["chromium", chromium.launch.bind(chromium)],
    ["webkit", webkit.launch.bind(webkit)],
    ["firefox", firefox.launch.bind(firefox)],
  ] as const;
  const errors: string[] = [];
  for (const [name, launch] of launchers) {
    try {
      browser = await launch({ headless: !options.headed });
      if (name !== "chromium") console.error(`using_${name}_fallback`);
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${name}: ${message.split("\n")[0]}`);
      console.error(`${name}_launch_failed: ${message.split("\n")[0]}`);
    }
  }
  if (!browser) {
    console.error(`all_playwright_browsers_failed_to_launch_using_network_json_fallback: ${errors.join(" | ")}`);
    if (options.debug) {
      await runDebugApiFallback(options);
    } else {
      await runImportApiFallback(options);
    }
    return;
  }
  try {
    if (options.debug) {
      await runDebug(browser, options);
    } else {
      await runImport(browser, options);
    }
  } finally {
    await browser.close().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exitCode = 1;
});
