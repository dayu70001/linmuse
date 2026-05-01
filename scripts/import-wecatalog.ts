import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

type Browser = {
  newPage(options?: Record<string, unknown>): Promise<Page>;
  close(): Promise<void>;
};

type Page = {
  goto(url: string, options?: Record<string, unknown>): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  evaluate<T = unknown, A = unknown>(fn: string | ((arg: A) => T), arg?: A): Promise<T>;
  locator(selector: string): { count(): Promise<number> };
  screenshot(options: Record<string, unknown>): Promise<Buffer>;
  content(): Promise<string>;
  url(): string;
  goBack(options?: Record<string, unknown>): Promise<unknown>;
  waitForLoadState(state?: string, options?: Record<string, unknown>): Promise<void>;
  mouse: { click(x: number, y: number): Promise<void> };
  on(event: "response", handler: (response: NetworkResponse) => void): void;
  close(): Promise<void>;
};

type NetworkResponse = {
  url(): string;
  status(): number;
  headers(): Record<string, string>;
  text(): Promise<string>;
  request(): { resourceType(): string };
};

type CliOptions = {
  url: string;
  category: string;
  max: number;
  limitNew: number | null;
  maxScan: number;
  skipExisting: boolean;
  importBatchId: string;
  importedAt: string;
  debug: boolean;
  headed: boolean;
};

type Candidate = {
  url: string;
  title: string;
  imageUrls: string[];
  clickIndex: number;
};

type ImageCandidate = {
  url: string;
  accepted: boolean;
  reason: string;
  score: number;
};

type DetailExtraction = {
  title: string;
  description: string;
  url: string;
  imageUrls: string[];
  imageCandidates: ImageCandidate[];
  acceptedImages: ImageCandidate[];
  rejectedImages: ImageCandidate[];
  detailContainerFound: boolean;
  source: "network_api" | "detail_api" | "dom_detail" | "listing_fallback";
};

type ClickResult = {
  opened: boolean;
  urlBefore: string;
  urlAfter: string;
  detailContainerFound: boolean;
  strategy: string;
};

type ProductExport = {
  product_code: string;
  slug: string;
  category: string;
  subcategory: string;
  source_title_cn: string;
  cleaned_source_title_cn: string;
  source_description_cn: string;
  cleaned_source_description_cn: string;
  title_en: string;
  description_en: string;
  sizes_display: string;
  colors_display: string;
  moq: string;
  delivery_time: string;
  image_folder: string;
  main_image: string;
  gallery_images: string;
  main_thumbnail: string;
  gallery_thumbnails: string;
  source_url: string;
  source_product_url: string;
  source_album_url: string;
  source_fingerprint: string;
  import_batch_id: string;
  imported_at: string;
  translation_provider: "none" | "deepseek";
  translation_status: "fallback" | "success" | "failed" | "validation_failed";
  image_count: number;
  status: "draft" | "needs_review";
  notes: string;
};

type NetworkResponseRecord = {
  index: number;
  url: string;
  status: number;
  resourceType: string;
  contentType: string;
  json: unknown;
};

type ProductLikeArray = {
  path: string;
  length: number;
  sample_keys: string[];
  accepted_items: number;
  rejected_items: number;
};

type ApiProductCandidate = {
  index: number;
  id: string;
  title_cn: string;
  description_cn: string;
  image_urls: string[];
  detail_url: string;
  source_url: string;
  source: "network_api" | "detail_api";
  score: number;
  score_reasons: string[];
  json_path: string;
};

type RejectedProductCandidate = {
  path: string;
  title_cn: string;
  id: string;
  image_count: number;
  score: number;
  reasons: string[];
  source_url: string;
  sample_image_urls: string[];
};

type NetworkDiscovery = {
  productLikeArrays: ProductLikeArray[];
  candidates: ApiProductCandidate[];
  rejectedTemplateCandidates: RejectedProductCandidate[];
  networkSummaries: Array<{
    index: number;
    url: string;
    status: number;
    content_type: string;
    top_level_keys: string[];
    contains_arrays: boolean;
    image_url_count: number;
    sample_text_fields: string[];
    accepted_candidates: number;
    rejected_candidates: number;
    decision: string;
  }>;
};

const riskyTerms = [
  "authentic",
  "original",
  "1:1",
  "replica",
  "mirror quality",
  "top grade",
  "luxury",
  "best quality",
  "cheapest",
  "nike",
  "adidas",
  "gucci",
  "lv",
  "louis vuitton",
  "chanel",
  "dior",
  "rolex",
  "正品",
  "原单",
  "复刻",
  "高仿",
  "顶级",
  "一比一",
  "1比1",
  "耐克",
  "阿迪",
  "古驰",
  "香奈儿",
  "迪奥",
  "劳力士",
];

const MAX_PRODUCT_IMAGES = 9;

const csvColumns: Array<keyof ProductExport> = [
  "product_code",
  "slug",
  "category",
  "subcategory",
  "source_title_cn",
  "cleaned_source_title_cn",
  "source_description_cn",
  "cleaned_source_description_cn",
  "title_en",
  "description_en",
  "sizes_display",
  "colors_display",
  "moq",
  "delivery_time",
  "image_folder",
  "main_image",
  "gallery_images",
  "main_thumbnail",
  "gallery_thumbnails",
  "source_url",
  "source_product_url",
  "source_album_url",
  "source_fingerprint",
  "import_batch_id",
  "imported_at",
  "translation_provider",
  "translation_status",
  "image_count",
  "status",
  "notes",
];

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const getValue = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const url = getValue("--url");
  if (!url) {
    throw new Error('Missing required --url "https://..."');
  }
  const requestedMax = Number(getValue("--max") || 10);
  const requestedLimitNew = getValue("--limit-new");
  const limitNew = requestedLimitNew ? Math.max(1, Number(requestedLimitNew) || 10) : null;
  const targetMax = limitNew || Math.max(1, Math.min(Number.isFinite(requestedMax) ? requestedMax : 10, 20));
  const requestedMaxScan = Number(getValue("--max-scan") || Math.max(targetMax * 5, targetMax * 2));
  const importedAt = new Date().toISOString();
  const translator = getValue("--translator") || "none";
  if (!["none", "deepseek"].includes(translator)) {
    throw new Error('--translator must be "none" or "deepseek"');
  }
  return {
    url,
    category: getValue("--category") || "Apparel",
    max: targetMax,
    limitNew,
    maxScan: Math.max(targetMax, Number.isFinite(requestedMaxScan) ? requestedMaxScan : targetMax * 5),
    skipExisting: args.includes("--skip-existing"),
    importBatchId: `${(getValue("--category") || "Apparel").toLowerCase()}-${batchTimestamp(importedAt)}`,
    importedAt,
    debug: args.includes("--debug"),
    headed: args.includes("--headed"),
  };
}

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join("-") + `-${pad(now.getHours())}-${pad(now.getMinutes())}`;
}

function batchTimestamp(value = new Date().toISOString()) {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function importsRoot() {
  return path.join(process.cwd(), "imports", "wecatalog");
}

function importHistoryPath() {
  return path.join(importsRoot(), "import-history.json");
}

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  return fs.readFile(envPath, "utf8")
    .then((content) => {
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
        const index = trimmed.indexOf("=");
        const key = trimmed.slice(0, index).trim();
        const rawValue = trimmed.slice(index + 1).trim();
        const value = rawValue.replace(/^['"]|['"]$/g, "");
        if (key && process.env[key] === undefined) {
          process.env[key] = value;
        }
      }
    })
    .catch(() => undefined);
}

function normalizeUrl(raw: string, baseUrl: string) {
  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return "";
  }
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return "";
  }
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

function isLikelyStoreTitle(title: string, storeTitle: string) {
  const cleanTitle = cleanText(title);
  const cleanStoreTitle = cleanText(storeTitle);
  if (!cleanTitle) return true;
  if (cleanStoreTitle && (cleanTitle === cleanStoreTitle || cleanStoreTitle.includes(cleanTitle) || cleanTitle.includes(cleanStoreTitle))) {
    return true;
  }
  return /打开APP|先付款后发货|创威潮牌|联系TA|全部上新|商城三列|多图列表|瀑布流|商城|商城单图列表|模板|导航|布局|我的店铺|店铺已全新装修|就差你的光顾|光顾啦|欢迎光临|全新装修/.test(cleanTitle);
}

function isTemplateOrLayoutText(text: string) {
  const clean = cleanText(text).toLowerCase();
  if (!clean) return true;
  return /瀑布流|商城单图列表|模板|导航|布局|样式|主题|店招|template|layout|tab|navigation|style|theme|我的店铺|店铺已全新装修|就差你的光顾|光顾啦|欢迎光临|全新装修/.test(clean) || clean === "商城";
}

function isGlobalDescription(text: string) {
  if (text.length >= 3000) return true;
  return /全部上新|商城三列|商城大图|多图列表|联系TA|总数|购物车|店铺|客服/.test(text) && text.length > 800;
}

function isProbablyImageUrl(value: string) {
  if (!/^https?:\/\//i.test(value)) return false;
  if (/album_bg|\/album_bg|minicode|minicode_long|\/minicode_long\/|\/album\/personal\/|template|template_pubu|avatar|logo|qrcode|qr|wechat|cover|banner|background|icon|shop|store|profile|watermark/i.test(value)) return false;
  return /\.(jpe?g|png|webp|avif)(\?|$)/i.test(value) || /image|img|pic|photo|album|goods|product/i.test(value);
}

function hasTemplateImageUrl(urls: string[]) {
  return urls.some((url) => /album_bg|\/album_bg|minicode|minicode_long|\/minicode_long\/|\/album\/personal\/|template|template_pubu|avatar|logo|qrcode|qr|wechat|cover|banner|background|icon|profile/i.test(url));
}

function hasRealProductImageHost(urls: string[]) {
  return urls.some((url) => /(^https?:\/\/)?([^/]+\.)?(xcimg\.szwego\.com|szwego\.com)\//i.test(url));
}

function normalizedImageKey(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return rawUrl.split("?")[0].split("#")[0];
  }
}

function isProductCdnUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return /(^|\.)?(xcimg\.szwego\.com|szwego\.com|newimg\.szwego\.com)$/i.test(url.hostname);
  } catch {
    return /(xcimg\.szwego\.com|szwego\.com|newimg\.szwego\.com)/i.test(rawUrl);
  }
}

function normalizeProductDownloadUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (isProductCdnUrl(rawUrl)) {
      url.search = "";
      url.hash = "";
    }
    return url.toString();
  } catch {
    return rawUrl.split("?")[0].split("#")[0];
  }
}

function hasLowResolutionImageModifier(rawUrl: string) {
  const lower = rawUrl.toLowerCase();
  return /\.jpe?g_160(?:$|[?#/])|_160(?:$|[?#/])/.test(lower);
}

function isRejectedProductImageUrl(rawUrl: string) {
  const lower = rawUrl.toLowerCase();
  return /album_bg|\/album_bg|minicode|minicode_long|\/minicode_long\/|qrcode|qr|avatar|logo|banner|background|cover|icon|profile|template|template_pubu|\/album\/personal\//.test(lower) || hasLowResolutionImageModifier(lower);
}

function productImageGroupKey(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const match = url.pathname.match(/\/img\/([^/]+)\/([^/]+)\//i);
    if (match) {
      return `${url.hostname}/img/${match[1]}/${match[2]}/`;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    return `${url.hostname}/${parts.slice(0, 3).join("/")}/`;
  } catch {
    const match = rawUrl.match(/\/img\/([^/]+)\/([^/]+)\//i);
    return match ? `/img/${match[1]}/${match[2]}/` : "unknown";
  }
}

function selectDominantProductImages(imageUrls: string[]) {
  const rejected: Array<{ url: string; reason: string }> = [];
  const seen = new Set<string>();
  const groups = new Map<string, Array<{ discoveredUrl: string; downloadUrl: string }>>();

  for (const imageUrl of imageUrls) {
    const exact = imageUrl.trim();
    const normalized = normalizeProductDownloadUrl(exact);
    if (!exact) continue;
    if (seen.has(exact) || seen.has(normalized)) {
      rejected.push({ url: imageUrl, reason: "duplicate image url" });
      continue;
    }
    seen.add(exact);
    seen.add(normalized);
    if (isRejectedProductImageUrl(exact)) {
      rejected.push({ url: imageUrl, reason: "non-product image url" });
      continue;
    }
    const groupKey = productImageGroupKey(normalized);
    groups.set(groupKey, [...(groups.get(groupKey) || []), { discoveredUrl: exact, downloadUrl: normalized }]);
  }

  const sortedGroups = Array.from(groups.entries())
    .map(([group, images]) => ({ group, count: images.length, images }))
    .sort((a, b) => b.count - a.count);
  const selected = sortedGroups[0];
  const rejectedGroups = sortedGroups.slice(1).map((group) => ({
    group: group.group,
    count: group.count,
    reason: selected && group.count === 1 && selected.count >= 9 ? "single image group rejected in favor of dominant product group" : "non-dominant image group",
  }));

  return {
    selectedGroup: selected?.group || "",
    selectedImages: selected?.images || [],
    selectedUrls: selected?.images.map((image) => image.downloadUrl) || [],
    groups: sortedGroups.map((group) => ({ group: group.group, count: group.count })),
    rejectedGroups,
    rejectedUrls: rejected,
  };
}

function hasProductLikeTitle(title: string) {
  return /P\d{2,}|Polo|POLO|T恤|短袖|长袖|衬衫|外套|卫衣|裤|短裤|套装|男士|女士|码数|尺码|颜色/i.test(title);
}

function normalizeProductTitleForDedup(title: string) {
  return cleanText(title)
    .toLowerCase()
    .replace(/[，。！？!?,.;:：、~～'"“”‘’()[\]{}]/g, " ")
    .replace(/\b([1-9])\s*x\s*l\b/gi, "$1xl")
    .replace(/\b([1-9])x[lｌ]\b/gi, "$1xl")
    .replace(/\bxl\b/gi, "xl")
    .replace(/\s+/g, " ")
    .trim();
}

function productDedupKey(title: string, imageUrls: string[]) {
  const firstImage = imageUrls[0] ? normalizedImageKey(imageUrls[0]) : "";
  return `${normalizeProductTitleForDedup(title)}|${firstImage}`;
}

function sha1(value: string) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function sourceFingerprint({
  sourceAlbumUrl,
  title,
  selectedGroup,
  firstImageUrl,
}: {
  sourceAlbumUrl: string;
  title: string;
  selectedGroup: string;
  firstImageUrl: string;
}) {
  return sha1([
    normalizeUrl(sourceAlbumUrl, sourceAlbumUrl) || sourceAlbumUrl,
    normalizeProductTitleForDedup(title),
    selectedGroup,
    normalizedImageKey(firstImageUrl),
  ].join("|"));
}

function fingerprintForProduct(product: DetailExtraction, sourceAlbumUrl: string) {
  const imageSelection = selectDominantProductImages(product.imageUrls);
  return {
    fingerprint: sourceFingerprint({
      sourceAlbumUrl,
      title: product.title,
      selectedGroup: imageSelection.selectedGroup,
      firstImageUrl: imageSelection.selectedUrls[0] || product.imageUrls[0] || "",
    }),
    selectedGroup: imageSelection.selectedGroup,
    firstImageUrl: imageSelection.selectedUrls[0] || "",
  };
}

function productTitleDedupKey(title: string) {
  return normalizeProductTitleForDedup(title);
}

async function loadLocalHistory() {
  const historyPath = importHistoryPath();
  try {
    const raw = await fs.readFile(historyPath, "utf8");
    const parsed = JSON.parse(raw) as { fingerprints?: string[]; entries?: Array<{ source_fingerprint?: string }> };
    return new Set([
      ...(parsed.fingerprints || []),
      ...(parsed.entries || []).map((entry) => entry.source_fingerprint || "").filter(Boolean),
    ]);
  } catch {
    return new Set<string>();
  }
}

async function saveLocalHistory(rows: ProductExport[]) {
  const historyPath = importHistoryPath();
  await fs.mkdir(path.dirname(historyPath), { recursive: true });
  const existing = await loadLocalHistory();
  for (const row of rows) {
    if (row.source_fingerprint) existing.add(row.source_fingerprint);
  }
  const payload = {
    updated_at: new Date().toISOString(),
    fingerprints: Array.from(existing).sort(),
  };
  await fs.writeFile(historyPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function fetchSupabaseFingerprints() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !key) {
    return new Set<string>();
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/products?select=source_fingerprint&source_fingerprint=not.is.null&limit=10000`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    if (!response.ok) return new Set<string>();
    const rows = await response.json() as Array<{ source_fingerprint?: string | null }>;
    return new Set(rows.map((row) => row.source_fingerprint || "").filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

function containsChinese(text: string) {
  return /[\u3400-\u9fff]/.test(text);
}

function detectRiskyTerms(...texts: string[]) {
  const combined = texts.join(" ").toLowerCase();
  return riskyTerms.filter((term) => combined.includes(term.toLowerCase()));
}

function inferSubcategory(sourceText: string) {
  const text = sourceText.toLowerCase();
  if (/外套|夹克|jacket|coat/.test(text)) return "Jackets";
  if (/裤|pants|trouser|jeans/.test(text)) return "Pants";
  if (/裙|dress|skirt/.test(text)) return "Dresses";
  if (/套装|set/.test(text)) return "Apparel Sets";
  if (/针织|毛衣|knit|sweater/.test(text)) return "Knitwear";
  if (/衬衫|shirt|blouse/.test(text)) return "Shirts";
  if (/t恤|tee|t-shirt/.test(text)) return "Tops";
  return "Selected Apparel";
}

function extractUsefulDetails(sourceText: string) {
  const details: string[] = [];
  const text = sourceText.toLowerCase();
  const materialMap = [
    [/棉|cotton/, "cotton"],
    [/针织|knit/, "knit"],
    [/牛仔|denim/, "denim"],
    [/羊毛|wool/, "wool blend"],
    [/皮|leather/, "leather-look"],
    [/雪纺|chiffon/, "chiffon"],
    [/涤纶|polyester/, "polyester"],
  ] as const;
  const seasonMap = [
    [/春|spring/, "spring"],
    [/夏|summer/, "summer"],
    [/秋|autumn|fall/, "autumn"],
    [/冬|winter/, "winter"],
  ] as const;
  const styleMap = [
    [/休闲|casual/, "casual style"],
    [/宽松|loose|relaxed/, "relaxed fit"],
    [/修身|slim/, "slim fit"],
    [/短款|cropped/, "cropped style"],
    [/长款|long/, "longline style"],
    [/套装|set/, "set option"],
  ] as const;

  for (const [pattern, value] of [...materialMap, ...seasonMap, ...styleMap]) {
    if (pattern.test(text) && !details.includes(value)) {
      details.push(value);
    }
  }
  return details;
}

function removeHighQualityPhrase(sourceText: string) {
  return cleanText(sourceText.replace(/高品质/g, ""));
}

function fallbackTitle(sourceText: string) {
  if (/短袖/.test(sourceText) && /短裤/.test(sourceText) && /套装/.test(sourceText)) return "Short Sleeve & Shorts Set";
  if (/套装/.test(sourceText)) return "Casual Apparel Set";
  if (/T恤|t恤|短袖/i.test(sourceText)) return "Short Sleeve Top";
  if (/外套|夹克/.test(sourceText)) return "Jacket";
  if (/卫衣/.test(sourceText)) return "Hoodie";
  if (/长裤|裤子|休闲裤|短裤/.test(sourceText)) return "Pants";
  if (/衬衫/.test(sourceText)) return "Shirt";
  return "Selected Apparel Style";
}

function fallbackDescription() {
  return "Selected apparel style available for retail and wholesale orders. Please contact us with product code, size, color, and destination for details.";
}

function csvEscape(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

type TranslationResult = {
  titleEn: string;
  descriptionEn: string;
  provider: "none";
  status: "fallback";
  note: string;
};

function fallbackTranslation(cleanedTitle: string, cleanedDescription: string): TranslationResult {
  return {
    titleEn: fallbackTitle(`${cleanedTitle} ${cleanedDescription}`),
    descriptionEn: fallbackDescription(),
    provider: "none",
    status: "fallback",
    note: "Translation provider not configured",
  };
}

function toCsv(rows: ProductExport[]) {
  return [
    csvColumns.join(","),
    ...rows.map((row) => csvColumns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
}

async function writeJson(filePath: string, data: unknown) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function saveDebugScreenshot(page: Page, filePath: string) {
  await page.screenshot({ path: filePath, fullPage: true }).catch(() => undefined);
}

async function saveDebugHtml(page: Page, filePath: string) {
  await fs.writeFile(filePath, await page.content()).catch(() => undefined);
}

async function getStoreTitle(page: Page) {
  const title = await page.evaluate(`
    (() => {
      const clean = (text) => (text || "").replace(/\\s+/g, " ").trim();
      return clean(
        document.querySelector("h1,h2,[class*=shop],[class*=store],[class*=title]")?.textContent ||
        document.title ||
        ""
      );
    })()
  `).catch(() => "");
  return cleanText(String(title || ""));
}

function attachNetworkCapture(page: Page, records: NetworkResponseRecord[]) {
  let index = 1;
  page.on("response", async (response) => {
    try {
      const resourceType = response.request().resourceType();
      const headers = response.headers();
      const contentType = headers["content-type"] || headers["Content-Type"] || "";
      if (!["xhr", "fetch", "document"].includes(resourceType) && !/json|text|javascript/i.test(contentType)) {
        return;
      }
      const text = await response.text();
      const trimmed = text.trim();
      if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) {
        return;
      }
      const json = JSON.parse(trimmed);
      records.push({
        index: index++,
        url: response.url(),
        status: response.status(),
        resourceType,
        contentType,
        json,
      });
    } catch {
      // Ignore non-JSON and cross-origin response bodies.
    }
  });
}

function collectImageUrlsFromJson(value: unknown, baseUrl: string, output = new Set<string>()) {
  if (typeof value === "string") {
    const normalized = normalizeUrl(value, baseUrl);
    if (normalized && isProbablyImageUrl(normalized)) {
      output.add(normalized);
    }
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectImageUrlsFromJson(item, baseUrl, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      collectImageUrlsFromJson(item, baseUrl, output);
    }
  }
  return output;
}

function pickString(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && cleanText(value)) return cleanText(value);
    if (typeof value === "number") return String(value);
  }
  return "";
}

function hasAnyKey(obj: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(obj, key));
}

function sampleTextFields(value: unknown, output: string[] = []) {
  if (output.length >= 16) return output;
  if (typeof value === "string") {
    const clean = cleanText(value);
    if (clean.length >= 2 && clean.length <= 120 && !/^https?:\/\//i.test(clean)) {
      output.push(clean);
    }
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 20)) sampleTextFields(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) sampleTextFields(item, output);
  }
  return output;
}

function containsArray(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some(containsArray);
}

function scoreApiProductCandidate({
  obj,
  pathName,
  responseUrl,
  title,
  id,
  imageUrls,
  description,
  storeTitle,
}: {
  obj: Record<string, unknown>;
  pathName: string;
  responseUrl: string;
  title: string;
  id: string;
  imageUrls: string[];
  description: string;
  storeTitle: string;
}) {
  const reasons: string[] = [];
  let score = 0;
  const pathAndUrl = `${pathName} ${responseUrl}`.toLowerCase();
  const keys = Object.keys(obj).join(" ").toLowerCase();
  const realId = Boolean(id && !isTemplateOrLayoutText(id) && /^[a-z0-9_-]{3,}$/i.test(id));
  const hasRealProductImages = hasRealProductImageHost(imageUrls);

  if (realId) {
    score += 4;
    reasons.push("has product-like id");
  } else {
    reasons.push("missing real product id");
  }
  if (title && !isLikelyStoreTitle(title, storeTitle) && !isTemplateOrLayoutText(title)) {
    score += 3;
    reasons.push("has non-template title");
  } else {
    reasons.push("template/store title");
  }
  if (hasProductLikeTitle(title)) {
    score += 4;
    reasons.push("has apparel product-like title signal");
  } else {
    score -= 4;
    reasons.push("missing apparel product-like title signal");
  }
  if (imageUrls.length >= 1) {
    score += 2;
    reasons.push("has real image url");
  } else {
    reasons.push("missing real image url");
  }
  if (hasRealProductImages) {
    score += 4;
    reasons.push("has szwego product image host");
  }
  if (imageUrls.length >= 3) {
    score += 2;
    reasons.push("has image gallery");
  }
  if (description && !isGlobalDescription(description) && !isTemplateOrLayoutText(description)) {
    score += 1;
    reasons.push("has usable description");
  }
  if (/goods|product|item|sku|spu|detail/i.test(`${pathAndUrl} ${keys}`)) {
    score += 2;
    reasons.push("product-like source fields");
  }
  if (!hasRealProductImages && /config|template|layout|theme|style|navigation|tab|decorate|personal|setting/i.test(`${pathAndUrl} ${keys}`)) {
    score -= 5;
    reasons.push("template/config source");
  }
  if (hasTemplateImageUrl(imageUrls)) {
    score -= 6;
    reasons.push("template/layout image url");
  }
  return {
    score,
    reasons,
    accepted: score >= 5 &&
      title.length > 0 &&
      imageUrls.length > 0 &&
      hasProductLikeTitle(title) &&
      !isLikelyStoreTitle(title, storeTitle) &&
      !isTemplateOrLayoutText(title),
  };
}

function findProductCandidatesFromNetwork(records: NetworkResponseRecord[], storeTitle: string, sourceUrl: string): NetworkDiscovery {
  const productLikeArrays: ProductLikeArray[] = [];
  const candidates: ApiProductCandidate[] = [];
  const rejectedTemplateCandidates: RejectedProductCandidate[] = [];
  const seen = new Set<string>();
  const titleKeys = ["title", "name", "goodsName", "productName", "itemName", "goods_name", "product_name", "item_name"];
  const descKeys = ["desc", "description", "detail", "content", "goodsDesc", "goodsDetail", "productDesc", "memo", "remark"];
  const idKeys = ["id", "goodsId", "itemId", "productId", "goods_id", "item_id", "product_id", "spuId", "skuId"];
  const urlKeys = ["url", "href", "link", "detailUrl", "detail_url", "shareUrl"];
  const networkSummaries = records.map((record) => ({
    index: record.index,
    url: record.url,
    status: record.status,
    content_type: record.contentType,
    top_level_keys: record.json && typeof record.json === "object" && !Array.isArray(record.json)
      ? Object.keys(record.json as Record<string, unknown>).slice(0, 30)
      : [],
    contains_arrays: containsArray(record.json),
    image_url_count: collectImageUrlsFromJson(record.json, record.url || sourceUrl).size,
    sample_text_fields: unique(sampleTextFields(record.json)).slice(0, 16),
    accepted_candidates: 0,
    rejected_candidates: 0,
    decision: "no product candidates found",
  }));

  function visit(value: unknown, pathName: string, responseUrl: string) {
    if (Array.isArray(value)) {
      const objectItems = value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
      if (objectItems.length > 0) {
        const sampleKeys = Object.keys(objectItems[0] || {});
        let acceptedItems = 0;
        let rejectedItems = 0;
        objectItems.forEach((item, itemIndex) => {
          const title = pickString(item, titleKeys);
          const images = Array.from(collectImageUrlsFromJson(item, responseUrl));
          const id = pickString(item, idKeys);
          const description = pickString(item, descKeys);
          const scored = scoreApiProductCandidate({
            obj: item,
            pathName: `${pathName}[${itemIndex}]`,
            responseUrl,
            title,
            id,
            imageUrls: images,
            description,
            storeTitle,
          });
          if (title || images.length > 0 || hasAnyKey(item, [...titleKeys, ...idKeys])) {
            if (scored.accepted) acceptedItems += 1;
            else rejectedItems += 1;
          }
        });
        if (acceptedItems > 0 || rejectedItems > 0) {
          productLikeArrays.push({
            path: pathName,
            length: objectItems.length,
            sample_keys: sampleKeys.slice(0, 20),
            accepted_items: acceptedItems,
            rejected_items: rejectedItems,
          });
        }
      }
      value.forEach((item, itemIndex) => visit(item, `${pathName}[${itemIndex}]`, responseUrl));
      return;
    }
    if (!value || typeof value !== "object") return;
    const obj = value as Record<string, unknown>;
    const title = pickString(obj, titleKeys);
    const description = pickString(obj, descKeys);
    const id = pickString(obj, idKeys);
    const detailUrl = normalizeUrl(pickString(obj, urlKeys), responseUrl);
    const imageUrls = Array.from(collectImageUrlsFromJson(obj, responseUrl));
    const score = scoreApiProductCandidate({ obj, pathName, responseUrl, title, id, imageUrls, description, storeTitle });
    const summary = networkSummaries.find((item) => item.url === responseUrl);
    if (title || imageUrls.length > 0 || hasAnyKey(obj, [...titleKeys, ...idKeys])) {
      if (score.accepted) {
        if (summary) summary.accepted_candidates += 1;
      } else {
        if (summary) summary.rejected_candidates += 1;
        if (title || imageUrls.length > 0) {
          rejectedTemplateCandidates.push({
            path: pathName,
            title_cn: title,
            id,
            image_count: imageUrls.length,
            score: score.score,
            reasons: score.reasons,
            source_url: responseUrl,
            sample_image_urls: imageUrls.slice(0, 3),
          });
        }
      }
    }
    if (score.accepted) {
      const key = id || detailUrl || `${title}|${imageUrls[0]}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidates.push({
          index: candidates.length + 1,
          id,
          title_cn: title,
          description_cn: description,
          image_urls: imageUrls,
          detail_url: detailUrl,
          source_url: responseUrl,
          source: /detail|goods|product|item/i.test(responseUrl) && description ? "detail_api" : "network_api",
          score: score.score,
          score_reasons: score.reasons,
          json_path: pathName,
        });
      }
    }
    for (const [key, child] of Object.entries(obj)) {
      visit(child, pathName ? `${pathName}.${key}` : key, responseUrl);
    }
  }

  for (const record of records) {
    visit(record.json, `response-${record.index}`, record.url || sourceUrl);
  }

  for (const summary of networkSummaries) {
    if (summary.accepted_candidates > 0) {
      summary.decision = "accepted product-like candidates";
    } else if (summary.rejected_candidates > 0) {
      summary.decision = "rejected template/config or low-score candidates";
    }
  }

  return { productLikeArrays, candidates, rejectedTemplateCandidates, networkSummaries };
}

async function autoScroll(page: Page, maxItems: number) {
  let stableRounds = 0;
  let lastImageCount = 0;
  for (let i = 0; i < 12; i += 1) {
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await page.waitForTimeout(1200);
    const imageCount = await page.locator("img").count().catch(() => 0);
    if (imageCount === lastImageCount) {
      stableRounds += 1;
    } else {
      stableRounds = 0;
      lastImageCount = imageCount;
    }
    if (imageCount >= maxItems * 3 || stableRounds >= 3) {
      break;
    }
  }
}

async function collectCandidates(page: Page, sourceUrl: string, max: number): Promise<Candidate[]> {
  const candidates = await page.evaluate(`
    (() => {
      const baseUrl = ${JSON.stringify(sourceUrl)};
      const absolute = (raw) => {
        if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return "";
        try {
          return new URL(raw, baseUrl).toString();
        } catch {
          return "";
        }
      };
      const textOf = (element) => (element.textContent || "").replace(/\\s+/g, " ").trim();
      const isRealProductImage = (img) => {
        const src = img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || "";
        const meta = [
          src,
          img.alt || "",
          img.className || "",
          img.id || "",
          img.closest("[class]") ? img.closest("[class]").className : "",
        ].join(" ").toLowerCase();
        const badAssetWords = ["album_bg", "/album_bg", "minicode", "minicode_long", "/minicode_long/", "avatar", "logo", "qrcode", "qr", "wechat", "cover", "banner", "background", "bg", "icon", "shop", "store", "profile", "watermark"];
        if (badAssetWords.some((word) => meta.includes(word))) return false;
        const rect = img.getBoundingClientRect();
        const width = img.naturalWidth || rect.width || 0;
        const height = img.naturalHeight || rect.height || 0;
        if (width && height && (width < 240 || height < 240)) return false;
        return true;
      };
      const imagesOf = (element) => {
        const imageUrls = Array.from(element.querySelectorAll("img"))
          .filter(isRealProductImage)
          .map((img) => absolute(img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || ""))
          .filter(Boolean);
        return Array.from(new Set(imageUrls));
      };

      const clickableSelectors = "a[href], [onclick], [role=button], li, article, .goods, .product, .item, .card, .album, .pic";
      const clickableCards = Array.from(document.querySelectorAll(clickableSelectors))
        .filter((element) => {
          const text = textOf(element);
          const imageUrls = imagesOf(element);
          const rect = element.getBoundingClientRect();
          const top = rect.top + window.scrollY;
          const meta = [
            element.className || "",
            element.id || "",
            text,
            imageUrls.join(" ")
          ].join(" ").toLowerCase();
          if (top < 180) return false;
          if (/瀑布流|商城单图列表|模板|我的店铺|店铺已全新装修|就差你的光顾|光顾啦|欢迎光临|全新装修|template|layout|navigation|style|theme|banner|cover|avatar|logo|profile/.test(meta)) return false;
          return rect.width >= 110 && rect.height >= 110 && imageUrls.length > 0 && text.length > 2;
        });

      const anchorCards = clickableCards
        .map((anchor, index) => {
          const href = absolute(anchor.getAttribute("href"));
          const imageUrls = imagesOf(anchor);
          const title = textOf(anchor);
          return { url: href, title, imageUrls, clickIndex: index };
        })
        .filter((item) => item.imageUrls.length > 0 || item.title.length > 3);

      if (anchorCards.length > 0) {
        return anchorCards;
      }

      return Array.from(document.querySelectorAll("img"))
        .filter(isRealProductImage)
        .map((img, index) => {
          const src = absolute(img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || "");
          const parent = img.closest("li, article, div") || img;
          return { url: baseUrl + "#image-" + index, title: textOf(parent), imageUrls: src ? [src] : [], clickIndex: index };
        })
        .filter((item) => item.imageUrls.length > 0);
    })()
  `) as Candidate[];

  const seen = new Set<string>();
  const filtered: Candidate[] = [];
  for (const candidate of candidates) {
    const key = candidate.url || candidate.imageUrls[0] || candidate.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    filtered.push({
      url: normalizeUrl(candidate.url, sourceUrl),
      title: cleanText(candidate.title).slice(0, 180),
      imageUrls: unique(candidate.imageUrls.map((url) => normalizeUrl(url, sourceUrl)).filter(Boolean)),
      clickIndex: candidate.clickIndex,
    });
    if (filtered.length >= max) break;
  }
  return filtered;
}

async function saveDetectedCardDebug(page: Page, filePath: string) {
  const cards = await page.evaluate(`
    (() => {
      const textOf = (element) => (element.textContent || "").replace(/\\s+/g, " ").trim();
      const isBadAsset = (value) => /album_bg|\\/album_bg|minicode|minicode_long|\\/minicode_long\\/|\\/album\\/personal\\/|template|template_pubu|avatar|logo|qrcode|qr|wechat|cover|banner|background|icon|shop|store|profile|watermark/i.test(value || "");
      const cards = Array.from(document.querySelectorAll("a[href], [onclick], [role=button], li, article, .goods, .product, .item, .card, .album, .pic"))
        .map((element, index) => {
          const rect = element.getBoundingClientRect();
          const images = Array.from(element.querySelectorAll("img")).map((img) => img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || "");
          const text = textOf(element);
          const meta = [element.className || "", element.id || "", text, images.join(" ")].join(" ").toLowerCase();
          const top = rect.top + window.scrollY;
          const accepted = top >= 180 &&
            rect.width >= 110 &&
            rect.height >= 110 &&
            images.some((url) => url && !isBadAsset(url)) &&
            text.length > 2 &&
            !/瀑布流|商城单图列表|模板|我的店铺|店铺已全新装修|就差你的光顾|光顾啦|欢迎光临|全新装修|template|layout|navigation|style|theme|banner|cover|avatar|logo|profile/.test(meta);
          if (accepted) {
            element.setAttribute("data-lm-detected-card", String(index));
            element.style.outline = "3px solid #C8A24A";
            element.style.outlineOffset = "2px";
          }
          return {
            index,
            text: text.slice(0, 160),
            image_count: images.length,
            sample_images: images.slice(0, 3),
            bbox: { x: Math.round(rect.x), y: Math.round(rect.y + window.scrollY), width: Math.round(rect.width), height: Math.round(rect.height) },
            accepted,
          };
        })
        .filter((item) => item.image_count > 0 || item.text.length > 2);
      return cards;
    })()
  `);
  await writeJson(filePath, cards);
}

async function detectDetailState(page: Page) {
  return page.evaluate(`
    (() => {
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 80 && rect.height > 80 && style.display !== "none" && style.visibility !== "hidden";
      };
      const detailSelectors = [
        "[class*=detail]",
        "[class*=goods]",
        "[class*=product]",
        "[class*=swiper]",
        "[class*=gallery]",
        "[class*=carousel]",
        "[class*=album]",
        "[class*=image-list]",
        "[class*=pic]"
      ];
      const detailContainerFound = detailSelectors.some((selector) =>
        Array.from(document.querySelectorAll(selector)).some(visible)
      );
      const modalFound = Array.from(document.querySelectorAll("[class*=modal],[class*=popup],[class*=drawer],[class*=dialog],[role=dialog]")).some(visible);
      const closeFound = Array.from(document.querySelectorAll("button,[class*=close],[aria-label*=close],[aria-label*=Close]")).some(visible);
      return { detailContainerFound, modalFound, closeFound };
    })()
  `) as Promise<{ detailContainerFound: boolean; modalFound: boolean; closeFound: boolean }>;
}

async function clickCandidateForDetail(page: Page, candidate: Candidate): Promise<ClickResult> {
  const urlBefore = page.url();
  const clickInfo = await page.evaluate(`
    (() => {
      const index = ${JSON.stringify(candidate.clickIndex)};
      const selector = "a[href], [onclick], [role=button], li, article, .goods, .product, .item, .card, .album, .pic";
      const textOf = (element) => (element.textContent || "").replace(/\\s+/g, " ").trim();
      const imageCountOf = (element) => element.querySelectorAll("img").length;
      const cards = Array.from(document.querySelectorAll(selector)).filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width >= 80 && rect.height >= 80 && (imageCountOf(element) > 0 || textOf(element).length > 3);
      });
      const card = cards[index] || cards.find((element) => textOf(element).includes(${JSON.stringify(candidate.title.slice(0, 24))}));
      if (!card) return { found: false, x: 0, y: 0, href: "" };
      card.scrollIntoView({ block: "center", inline: "center" });
      const rect = card.getBoundingClientRect();
      const hrefEl = card.matches("a[href]") ? card : card.querySelector("a[href]");
      return {
        found: true,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        href: hrefEl ? hrefEl.href : ""
      };
    })()
  `) as { found: boolean; x: number; y: number; href: string };

  let strategy = "center coordinate click";
  if (clickInfo.found) {
    await page.mouse.click(clickInfo.x, clickInfo.y);
    await page.waitForTimeout(1800);
  } else if (candidate.url && !candidate.url.includes("#image-")) {
    strategy = "open href directly";
    await page.goto(candidate.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1800);
  } else {
    strategy = "no clickable card found";
  }

  await collectCarouselImages(page);
  const state = await detectDetailState(page);
  const urlAfter = page.url();
  const opened = urlAfter !== urlBefore || state.modalFound || state.detailContainerFound;
  return {
    opened,
    urlBefore,
    urlAfter,
    detailContainerFound: state.detailContainerFound || state.modalFound,
    strategy,
  };
}

async function collectCarouselImages(page: Page) {
  for (let i = 0; i < 12; i += 1) {
    await page.evaluate(`
      (() => {
        const clickable = Array.from(document.querySelectorAll("button,.next,.swiper-button-next,[class*=next],[aria-label*=next],[aria-label*=Next]"))
          .find((el) => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return rect.width > 8 && rect.height > 8 && style.display !== "none" && style.visibility !== "hidden";
          });
        if (clickable) {
          clickable.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
          return;
        }
        const gallery = document.querySelector("[class*=swiper], [class*=carousel], [class*=gallery], [class*=album]");
        if (gallery) {
          gallery.dispatchEvent(new TouchEvent("touchstart", { bubbles: true }));
          gallery.dispatchEvent(new TouchEvent("touchend", { bubbles: true }));
        }
      })()
    `).catch(() => undefined);
    await page.evaluate("window.scrollBy(0, Math.round(window.innerHeight * 0.55))").catch(() => undefined);
    await page.waitForTimeout(350);
  }
}

async function closeDetailAndReturn(page: Page, sourceUrl: string, urlBefore: string) {
  const urlNow = page.url();
  if (urlNow !== urlBefore) {
    await page.goBack({ waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => page.goto(sourceUrl, { waitUntil: "domcontentloaded", timeout: 45000 }));
    await page.waitForTimeout(1200);
    return;
  }
  await page.evaluate(`
    (() => {
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return rect.width > 8 && rect.height > 8 && style.display !== "none" && style.visibility !== "hidden";
      };
      const close = Array.from(document.querySelectorAll("button,[class*=close],[aria-label*=close],[aria-label*=Close]"))
        .find(visible);
      if (close) {
        close.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
      }
    })()
  `).catch(() => undefined);
  await page.waitForTimeout(900);
}

async function extractProduct(page: Page, candidate: Candidate, sourceUrl: string): Promise<DetailExtraction> {

  const detail = await page.evaluate(`
    (() => {
      const baseUrl = ${JSON.stringify(candidate.url || sourceUrl)};
      const absolute = (raw) => {
        if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return "";
        try {
          return new URL(raw, baseUrl).toString();
        } catch {
          return "";
        }
      };
      const clean = (text) => text.replace(/\\s+/g, " ").trim();

      const isRealProductImage = (img) => {
        const src = img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || "";
        const meta = [
          src,
          img.alt || "",
          img.className || "",
          img.id || "",
          img.closest("[class]") ? img.closest("[class]").className : "",
        ].join(" ").toLowerCase();
        if (/avatar|logo|qrcode|qr|wechat|cover|banner|background|bg|icon|shop|store|profile|watermark/.test(meta)) return false;
        const rect = img.getBoundingClientRect();
        const width = img.naturalWidth || rect.width || 0;
        const height = img.naturalHeight || rect.height || 0;
        if (width && height && (width < 240 || height < 240)) return false;
        return true;
      };
      const scoreImage = (img) => {
        const meta = [
          img.className || "",
          img.id || "",
          img.closest("[class]") ? img.closest("[class]").className : "",
          img.closest("main,.detail,.goods,.product,.gallery,.swiper") ? "detail" : "",
        ].join(" ").toLowerCase();
        let score = 0;
        if (/detail|goods|product|gallery|swiper|album|photo|image|item/.test(meta)) score += 8;
        const rect = img.getBoundingClientRect();
        score += Math.min(6, Math.round(((img.naturalWidth || rect.width || 0) + (img.naturalHeight || rect.height || 0)) / 500));
        return score;
      };

      const heading = clean(
        Array.from(document.querySelectorAll("h1,h2,.title,[class*=title],[class*=name]"))
          .map((item) => item.textContent || "")
          .find((text) => clean(text).length > 2) || ""
      );
      const bodyLines = Array.from(document.querySelectorAll("p,li,div,span"))
        .map((item) => clean(item.textContent || ""))
        .filter((text) => /[\\u3400-\\u9fff]/.test(text))
        .filter((text) => text.length >= 4 && text.length <= 600)
        .filter((text) => !/首页|分类|购物车|客服|登录|注册|分享|微信|二维码|扫一扫|店铺|关注/.test(text));
      const description = Array.from(new Set(bodyLines)).join(" ").slice(0, 5000);
      const imageCandidates = Array.from(document.querySelectorAll("img"))
        .map((img) => {
          const url = absolute(img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || img.getAttribute("data-lazy") || "");
          const rect = img.getBoundingClientRect();
          const meta = [
            url,
            img.alt || "",
            img.className || "",
            img.id || "",
            img.closest("[class]") ? img.closest("[class]").className : "",
          ].join(" ").toLowerCase();
          let reason = "";
          if (!url) reason = "missing image url";
          else if (["album_bg", "/album_bg", "minicode", "minicode_long", "/minicode_long/", "avatar", "logo", "qrcode", "qr", "wechat", "cover", "banner", "background", "bg", "icon", "shop", "store", "profile", "watermark"].some((word) => meta.includes(word))) reason = "non-product asset keyword";
          else if ((img.naturalWidth || rect.width || 0) < 240 || (img.naturalHeight || rect.height || 0) < 240) reason = "image too small";
          const accepted = !reason;
          return {
            url,
            accepted,
            reason: accepted ? "accepted product/detail image" : reason,
            score: scoreImage(img)
          };
        })
        .filter((item) => item.url);
      const acceptedImages = imageCandidates
        .filter((item) => item.accepted)
        .sort((a, b) => b.score - a.score);
      const rejectedImages = imageCandidates.filter((item) => !item.accepted);
      const imageUrls = acceptedImages.map((item) => item.url);
      return {
        title: heading,
        description,
        imageUrls: Array.from(new Set(imageUrls)),
        imageCandidates,
        acceptedImages,
        rejectedImages,
        detailContainerFound: Boolean(document.querySelector("[class*=detail], [class*=goods], [class*=product], [class*=swiper], [class*=gallery], [class*=carousel], [class*=album], [class*=image-list], [class*=pic]")),
        url: location.href,
      };
    })()
  `) as DetailExtraction;

  return {
    title: cleanText(detail.title || candidate.title),
    description: cleanText(detail.description),
    url: detail.url || candidate.url || sourceUrl,
    imageUrls: unique([...detail.imageUrls, ...candidate.imageUrls]),
    imageCandidates: detail.imageCandidates,
    acceptedImages: detail.acceptedImages,
    rejectedImages: detail.rejectedImages,
    detailContainerFound: detail.detailContainerFound,
    source: "dom_detail",
  };
}

async function downloadImage(url: string, referer: string) {
  const downloadUrl = normalizeProductDownloadUrl(url);
  if (hasLowResolutionImageModifier(url)) {
    throw new Error("rejected low resolution image URL");
  }

  const response = await fetch(downloadUrl, {
    headers: {
      Referer: referer,
      "User-Agent": "Mozilla/5.0 LM-Dkbrand-local-importer",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const input = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(input).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (width < 800 || height < 800) {
    throw new Error(`rejected low resolution image: ${width}x${height}`);
  }

  const displayBuffer = await sharp(input)
    .rotate()
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();
  const thumbnailBuffer = await sharp(input)
    .rotate()
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return {
    displayBuffer,
    thumbnailBuffer,
    hash: crypto.createHash("sha1").update(input).digest("hex"),
    downloadUrl,
    width,
    height,
  };
}

async function exportDetailProduct({
  product,
  productCode,
  sequence,
  outputRoot,
  options,
  storeTitle,
  sourceUrl,
  sourceFingerprintValue,
  clickResult,
}: {
  product: DetailExtraction;
  productCode: string;
  sequence: number;
  outputRoot: string;
  options: CliOptions;
  storeTitle: string;
  sourceUrl: string;
  sourceFingerprintValue: string;
  clickResult?: ClickResult;
}) {
  const sourceTitle = cleanText(product.title);
  const sourceDescription = cleanText(product.description || (product.title.length > 80 ? product.title : ""));
  const cleanedTitle = removeHighQualityPhrase(sourceTitle);
  const cleanedDescription = removeHighQualityPhrase(sourceDescription);
  const translationSource = cleanText(`${cleanedTitle} ${cleanedDescription || cleanedTitle}`);
  const isDomSource = product.source === "dom_detail" || product.source === "listing_fallback";

  if (clickResult && (clickResult.strategy === "no clickable card found" || (!clickResult.opened && !clickResult.detailContainerFound))) {
    return {
      row: null,
      downloaded: 0,
      riskyTerms: [] as string[],
      reason: "Product detail was not opened. Whole store page was detected instead.",
    };
  }
  if (isLikelyStoreTitle(sourceTitle, storeTitle)) {
    return {
      row: null,
      downloaded: 0,
      riskyTerms: [] as string[],
      reason: "Store title was captured instead of product title.",
    };
  }
  if (!hasProductLikeTitle(sourceTitle)) {
    return {
      row: null,
      downloaded: 0,
      riskyTerms: [] as string[],
      reason: "Product title did not contain apparel product signals.",
    };
  }
  if (isTemplateOrLayoutText(sourceTitle)) {
    return {
      row: null,
      downloaded: 0,
      riskyTerms: [] as string[],
      reason: "Template/layout/config record was detected instead of a product.",
    };
  }
  if (product.imageUrls.length === 0) {
    return {
      row: null,
      downloaded: 0,
      riskyTerms: [] as string[],
      reason: "Product has zero real images.",
    };
  }
  if (isDomSource && isGlobalDescription(sourceDescription)) {
    return {
      row: null,
      downloaded: 0,
      riskyTerms: [] as string[],
      reason: "Global store description was captured instead of product description.",
    };
  }
  if (isDomSource && product.imageCandidates.length >= 100) {
    return {
      row: null,
      downloaded: 0,
      riskyTerms: [] as string[],
      reason: "Whole store page image set was detected instead of one product gallery.",
    };
  }

  const imageFolder = path.join("images", productCode);
  const displayFolder = path.join(imageFolder, "display");
  const thumbnailFolder = path.join(imageFolder, "thumbs");
  const displayOutputDir = path.join(outputRoot, displayFolder);
  const thumbnailOutputDir = path.join(outputRoot, thumbnailFolder);
  await fs.mkdir(displayOutputDir, { recursive: true });
  await fs.mkdir(thumbnailOutputDir, { recursive: true });

  const savedImages: string[] = [];
  const savedThumbnails: string[] = [];
  const imageErrors: string[] = [];
  const seenImageHashes = new Set<string>();
  const imageSelection = selectDominantProductImages(product.imageUrls);
  if (options.debug) {
    console.log(JSON.stringify({
      product_code: productCode,
      image_groups_found: imageSelection.groups,
      selected_image_group: imageSelection.selectedGroup,
      rejected_image_groups: imageSelection.rejectedGroups,
      rejected_image_urls: imageSelection.rejectedUrls.slice(0, 12),
    }, null, 2));
  }
  for (const imageCandidate of imageSelection.selectedImages) {
    if (savedImages.length >= MAX_PRODUCT_IMAGES) break;
    const imageUrl = imageCandidate.downloadUrl;
    try {
      const image = await downloadImage(imageUrl, product.url || sourceUrl);
      if (seenImageHashes.has(image.hash)) {
        if (options.debug) {
          console.log(JSON.stringify({
            product_code: productCode,
            discovered_url: imageCandidate.discoveredUrl,
            normalized_download_url: image.downloadUrl,
            downloaded_width: image.width,
            downloaded_height: image.height,
            saved_path: "",
            rejected_reason: "duplicate downloaded image hash",
          }, null, 2));
        }
        continue;
      }
      seenImageHashes.add(image.hash);
      const filename = `${String(savedImages.length + 1).padStart(2, "0")}.webp`;
      const displayRelativePath = path.join(displayFolder, filename);
      const thumbnailRelativePath = path.join(thumbnailFolder, filename);
      await fs.writeFile(path.join(outputRoot, displayRelativePath), image.displayBuffer);
      await fs.writeFile(path.join(outputRoot, thumbnailRelativePath), image.thumbnailBuffer);
      savedImages.push(displayRelativePath);
      savedThumbnails.push(thumbnailRelativePath);
      if (options.debug) {
        console.log(JSON.stringify({
          product_code: productCode,
          discovered_url: imageCandidate.discoveredUrl,
          normalized_download_url: image.downloadUrl,
          downloaded_width: image.width,
          downloaded_height: image.height,
          saved_path: displayRelativePath,
          thumbnail_path: thumbnailRelativePath,
          rejected_reason: "",
        }, null, 2));
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "download failed";
      imageErrors.push(`${imageUrl}: ${reason}`);
      if (options.debug) {
        console.log(JSON.stringify({
          product_code: productCode,
          discovered_url: imageCandidate.discoveredUrl,
          normalized_download_url: imageUrl,
          downloaded_width: 0,
          downloaded_height: 0,
          saved_path: "",
          rejected_reason: reason,
        }, null, 2));
      }
    }
  }

  const terms = detectRiskyTerms(sourceTitle, sourceDescription);
  const highQualityRemoved = /高品质/.test(`${sourceTitle} ${sourceDescription}`);
  const subcategory = inferSubcategory(translationSource);
  const translation = fallbackTranslation(cleanedTitle, cleanedDescription || cleanedTitle);
  const reviewReasons = [
    savedImages.length === 0 ? "no images" : "",
    savedImages.length === 1 ? "Only listing cover image found. Product detail gallery was not extracted." : "",
    savedImages.length > 0 && savedImages.length < MAX_PRODUCT_IMAGES ? "Fewer than 9 product images found" : "",
    !sourceTitle ? "unclear title" : "",
    !sourceDescription ? "No product-specific Chinese description found." : "",
    terms.length > 0 ? `risky terms: ${terms.join(", ")}` : "",
    translation.note,
    imageErrors.length > 0 ? `${imageErrors.length} image download errors` : "",
  ].filter(Boolean);
  const notes = [
    ...reviewReasons,
    savedImages.length === MAX_PRODUCT_IMAGES ? "9 product images exported" : "",
    highQualityRemoved ? '"高品质" removed from English output' : "",
  ].filter(Boolean).join("; ");

  return {
    row: {
      product_code: productCode,
      slug: productCode.toLowerCase(),
      category: options.category,
      subcategory,
      source_title_cn: sourceTitle,
      cleaned_source_title_cn: cleanedTitle,
      source_description_cn: sourceDescription,
      cleaned_source_description_cn: cleanedDescription,
      title_en: translation.titleEn,
      description_en: translation.descriptionEn,
      sizes_display: "Contact us for current size availability",
      colors_display: "Contact us for available color options",
      moq: "From 1 piece",
      delivery_time: "7-12 business days",
      image_folder: imageFolder,
      main_image: savedImages[0] || "",
      gallery_images: savedImages.join("|"),
      main_thumbnail: savedThumbnails[0] || "",
      gallery_thumbnails: savedThumbnails.join("|"),
      source_url: sourceUrl,
      source_product_url: product.url,
      source_album_url: sourceUrl,
      source_fingerprint: sourceFingerprintValue,
      import_batch_id: options.importBatchId,
      imported_at: options.importedAt,
      translation_provider: translation.provider,
      translation_status: translation.status,
      image_count: savedImages.length,
      status: reviewReasons.length > 0 ? "needs_review" : "draft",
      notes,
    } satisfies ProductExport,
    downloaded: savedImages.length,
    riskyTerms: terms,
    reason: "",
  };
}

async function main() {
  const options = parseArgs();
  await loadEnvLocal();
  const outputRoot = path.join(process.cwd(), "imports", "wecatalog", `clothing-test-${timestamp()}`);
  const imagesRoot = path.join(outputRoot, "images");
  const debugRoot = path.join(outputRoot, "debug");
  await fs.mkdir(imagesRoot, { recursive: true });
  if (options.debug) {
    await fs.mkdir(debugRoot, { recursive: true });
  }

  let browser: Browser | undefined;
  const failedProducts: Array<{ product_code?: string; source_product_url?: string; reason: string }> = [];
  const exported: ProductExport[] = [];
  const riskyTermsFound: string[] = [];
  let totalImagesDownloaded = 0;
  let totalProductsFound = 0;
  let skippedExisting = 0;
  const existingFingerprints = options.skipExisting
    ? new Set([...(await loadLocalHistory()), ...(await fetchSupabaseFingerprints())])
    : new Set<string>();

  try {
    const loadModule = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
    const { chromium } = await loadModule("playwright").catch(() => {
      throw new Error(
        "Missing dependency: playwright. Run `npm install` after network access is available, then retry the importer."
      );
    });
    const activeBrowser: Browser = await chromium.launch({
      headless: !options.headed,
      slowMo: options.headed ? 300 : 0,
      args: ["--disable-crash-reporter", "--disable-crashpad"],
    });
    browser = activeBrowser;
    const page = await activeBrowser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 LM-Dkbrand-local-importer",
    });
    const networkRecords: NetworkResponseRecord[] = [];
    attachNetworkCapture(page, networkRecords);
    await page.goto(options.url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    await autoScroll(page, options.maxScan);
    await page.waitForTimeout(1000);
    const storeTitle = await getStoreTitle(page);
    if (options.debug) {
      await saveDebugScreenshot(page, path.join(debugRoot, "listing-page.png"));
      await saveDebugScreenshot(page, path.join(debugRoot, "listing-mobile-page.png"));
      await saveDetectedCardDebug(page, path.join(debugRoot, "detected-cards.json"));
      await saveDebugScreenshot(page, path.join(debugRoot, "listing-with-detected-cards.png"));
      const networkDir = path.join(debugRoot, "network");
      await fs.mkdir(networkDir, { recursive: true });
      for (const record of networkRecords.slice(0, 80)) {
        await writeJson(path.join(networkDir, `response-${String(record.index).padStart(3, "0")}.json`), {
          url: record.url,
          status: record.status,
          resourceType: record.resourceType,
          contentType: record.contentType,
          json: record.json,
        });
      }
    }
    const networkDiscovery = findProductCandidatesFromNetwork(networkRecords, storeTitle, options.url);
    if (options.debug) {
      const productDiscovery = {
        store_title_detected: storeTitle,
        network_responses_count: networkRecords.length,
        product_like_arrays_found: networkDiscovery.productLikeArrays,
        rejected_template_candidates: networkDiscovery.rejectedTemplateCandidates.slice(0, 120),
        valid_product_candidates: networkDiscovery.candidates.map((candidate) => ({
          index: candidate.index,
          id: candidate.id,
          title_cn: candidate.title_cn,
          image_count: candidate.image_urls.length,
          has_description: Boolean(candidate.description_cn),
          source: candidate.source,
          score: candidate.score,
          score_reasons: candidate.score_reasons,
          json_path: candidate.json_path,
          sample_image_urls: candidate.image_urls.slice(0, 3),
        })),
      };
      await writeJson(path.join(debugRoot, "network-summary.json"), {
        network_responses_count: networkRecords.length,
        responses: networkDiscovery.networkSummaries,
      });
      await writeJson(path.join(debugRoot, "product-discovery.json"), productDiscovery);
      console.log(JSON.stringify({
        network_json_responses: networkRecords.length,
        product_like_arrays_found: networkDiscovery.productLikeArrays.length,
        product_candidates_found: networkDiscovery.candidates.length,
        sample_product_candidate_title: networkDiscovery.candidates[0]?.title_cn || "",
        sample_image_urls: networkDiscovery.candidates[0]?.image_urls.slice(0, 3) || [],
      }, null, 2));
    }
    const candidates = await collectCandidates(page, options.url, options.maxScan);
    totalProductsFound = candidates.length;

    const seenHashes = new Set<string>();
    const seenTitles = new Set<string>();
    let attemptSequence = 1;
    for (const apiCandidate of networkDiscovery.candidates) {
      if (exported.length >= options.max) break;
      const detail = detailFromApiCandidate(apiCandidate, options.url);
      const fingerprintInfo = fingerprintForProduct(detail, options.url);
      if (options.skipExisting && existingFingerprints.has(fingerprintInfo.fingerprint)) {
        skippedExisting += 1;
        continue;
      }
      const titleKey = productTitleDedupKey(detail.title);
      if (seenTitles.has(titleKey)) continue;
      const identity = crypto
        .createHash("sha1")
        .update(productDedupKey(detail.title, detail.imageUrls))
        .digest("hex");
      if (seenHashes.has(identity)) continue;
      const productCode = `LM-APP-${String(exported.length + 1).padStart(4, "0")}`;
      const saved = await exportDetailProduct({
        product: detail,
        productCode,
        sequence: exported.length + 1,
        outputRoot,
        options,
        storeTitle,
        sourceUrl: options.url,
        sourceFingerprintValue: fingerprintInfo.fingerprint,
      });
      if (!saved.row) {
        failedProducts.push({
          product_code: productCode,
          source_product_url: detail.url,
          reason: saved.reason,
        });
        continue;
      }
      seenHashes.add(identity);
      seenTitles.add(titleKey);
      existingFingerprints.add(fingerprintInfo.fingerprint);
      exported.push(saved.row);
      totalImagesDownloaded += saved.downloaded;
      riskyTermsFound.push(...saved.riskyTerms);
      if (options.debug) {
        console.log(JSON.stringify({
          product_code: saved.row.product_code,
          source: detail.source,
          source_title_cn: saved.row.source_title_cn,
          title_en: saved.row.title_en,
          chinese_description_length: saved.row.source_description_cn.length,
          english_description_length: saved.row.description_en.length,
          image_count: saved.row.image_count,
          status: saved.row.status,
          notes: saved.row.notes,
        }, null, 2));
      }
      attemptSequence += 1;
    }

    for (const candidate of candidates) {
      if (exported.length >= options.max) break;
      try {
        const debugPrefix = `product-${String(attemptSequence).padStart(3, "0")}`;
        if (options.debug) {
          await saveDebugScreenshot(page, path.join(debugRoot, `${debugPrefix}-before-click.png`));
        }
        const clickResult = await clickCandidateForDetail(page, candidate);
        if (options.debug) {
          await saveDebugScreenshot(page, path.join(debugRoot, `${debugPrefix}-after-click.png`));
          await saveDebugHtml(page, path.join(debugRoot, `${debugPrefix}-detail.html`));
        }
        const product = await extractProduct(page, candidate, options.url);
        if (options.debug) {
          await writeJson(path.join(debugRoot, `${debugPrefix}-image-candidates-before-filter.json`), product.imageCandidates);
          await writeJson(path.join(debugRoot, `${debugPrefix}-accepted-images.json`), product.acceptedImages);
          await writeJson(path.join(debugRoot, `${debugPrefix}-rejected-images.json`), product.rejectedImages);
        }

        const identity = crypto
          .createHash("sha1")
        .update(productDedupKey(product.title, product.imageUrls))
        .digest("hex");
        const fingerprintInfo = fingerprintForProduct(product, options.url);
        if (options.skipExisting && existingFingerprints.has(fingerprintInfo.fingerprint)) {
          skippedExisting += 1;
          await closeDetailAndReturn(page, options.url, clickResult.urlBefore);
          attemptSequence += 1;
          continue;
        }
        const titleKey = productTitleDedupKey(product.title);
        if (seenTitles.has(titleKey)) continue;
        if (seenHashes.has(identity)) continue;
        const productCode = `LM-APP-${String(exported.length + 1).padStart(4, "0")}`;

        const saved = await exportDetailProduct({
          product: { ...product, source: "dom_detail" },
          productCode,
          sequence: exported.length + 1,
          outputRoot,
          options,
          storeTitle,
          sourceUrl: options.url,
          sourceFingerprintValue: fingerprintInfo.fingerprint,
          clickResult,
        });
        if (!saved.row) {
          failedProducts.push({
            product_code: productCode,
            source_product_url: candidate.url || product.url,
            reason: saved.reason,
          });
          await closeDetailAndReturn(page, options.url, clickResult.urlBefore);
          attemptSequence += 1;
          continue;
        }
        seenHashes.add(identity);
        seenTitles.add(titleKey);
        existingFingerprints.add(fingerprintInfo.fingerprint);
        exported.push(saved.row);
        totalImagesDownloaded += saved.downloaded;
        riskyTermsFound.push(...saved.riskyTerms);
        if (options.debug) {
          console.log(JSON.stringify({
            product_code: saved.row.product_code,
            click_opened_detail: clickResult.opened,
            click_strategy: clickResult.strategy,
            url_before_click: clickResult.urlBefore,
            url_after_click: clickResult.urlAfter,
            detail_container_found: clickResult.detailContainerFound || product.detailContainerFound,
            total_image_candidates_in_detail: product.imageCandidates.length,
            accepted_real_product_images: product.acceptedImages.length,
            downloaded_images: saved.row.image_count,
            source_title_cn: saved.row.source_title_cn,
            title_en: saved.row.title_en,
            chinese_description_length: saved.row.source_description_cn.length,
            english_description_length: saved.row.description_en.length,
            image_count: saved.row.image_count,
            status: saved.row.status,
            notes: saved.row.notes,
          }, null, 2));
        }
        await closeDetailAndReturn(page, options.url, clickResult.urlBefore);
        await autoScroll(page, Math.max(options.maxScan, attemptSequence + 2));
        attemptSequence += 1;
      } catch (error) {
        failedProducts.push({
          product_code: `attempt-${attemptSequence}`,
          source_product_url: candidate.url,
          reason: error instanceof Error ? error.message : "unknown product error",
        });
        attemptSequence += 1;
      }
    }
  } finally {
    await browser?.close().catch(() => undefined);
  }

  const productsWithMissingImages = exported.filter((item) => item.image_count === 0).map((item) => item.product_code);
  const productsWithFewerThan3Images = exported
    .filter((item) => item.image_count > 0 && item.image_count < 3)
    .map((item) => item.product_code);
  const productsWithFewerThan6Images = exported
    .filter((item) => item.image_count > 0 && item.image_count < 6)
    .map((item) => item.product_code);
  const productsWithGoodImageCollection = exported
    .filter((item) => item.image_count === MAX_PRODUCT_IMAGES)
    .map((item) => item.product_code);
  const productsNeedingReview = exported.filter((item) => item.status === "needs_review").map((item) => item.product_code);
  const categoryCounts = exported.reduce<Record<string, number>>((counts, item) => {
    counts[item.category] = (counts[item.category] || 0) + 1;
    return counts;
  }, {});

  const report = {
    source_url: options.url,
    import_batch_id: options.importBatchId,
    imported_at: options.importedAt,
    skip_existing: options.skipExisting,
    limit_new: options.limitNew,
    max_scan: options.maxScan,
    output_folder: outputRoot,
    total_products_found: totalProductsFound,
    total_products_exported: exported.length,
    total_images_downloaded: totalImagesDownloaded,
    skipped_existing_products: skippedExisting,
    failed_products: failedProducts,
    products_with_missing_images: productsWithMissingImages,
    products_with_fewer_than_3_images: productsWithFewerThan3Images,
    products_with_fewer_than_6_images: productsWithFewerThan6Images,
    products_with_good_image_collection: productsWithGoodImageCollection,
    risky_terms_found: unique(riskyTermsFound),
    products_needing_review: productsNeedingReview,
    category_counts: categoryCounts,
  };

  await fs.writeFile(path.join(outputRoot, "products-import.json"), JSON.stringify(exported, null, 2));
  await fs.writeFile(path.join(outputRoot, "products-import.csv"), `${toCsv(exported)}\n`);
  await fs.writeFile(path.join(outputRoot, "import-report.json"), JSON.stringify(report, null, 2));
  if (exported.length > 0) {
    await saveLocalHistory(exported);
  }

  console.log(JSON.stringify(report, null, 2));
}

function detailFromApiCandidate(candidate: ApiProductCandidate, sourceUrl: string): DetailExtraction {
  const acceptedImages = candidate.image_urls.map((url, index) => ({
    url,
    accepted: true,
    reason: "accepted product image from network API",
    score: 100 - index,
  }));
  return {
    title: candidate.title_cn,
    description: candidate.description_cn,
    url: candidate.detail_url || candidate.source_url || sourceUrl,
    imageUrls: candidate.image_urls,
    imageCandidates: acceptedImages,
    acceptedImages,
    rejectedImages: [],
    detailContainerFound: true,
    source: candidate.source,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
