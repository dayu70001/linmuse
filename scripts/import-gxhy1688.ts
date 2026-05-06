import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";

type CliOptions = {
  url: string;
  inputHtml: string;
  debugDir: string;
  tab: string;
  page: number;
  dedupeExisting: boolean;
  mobile: boolean;
  category: string;
  limitNew: number;
  maxScan: number;
  minImages: number;
  productTimeoutMs: number;
  saveEvery: number;
  debug: boolean;
  headed: boolean;
};

type DomProduct = {
  title: string;
  description: string;
  price: string;
  imageUrls: string[];
  sourceProductUrl: string;
  domIndex: number;
};

type SkippedProduct = {
  index: number;
  product_title?: string;
  text_sample: string;
  image_url_count: number;
  raw_image_urls: string[];
  card_image_count?: number;
  detail_image_count?: number;
  final_image_count?: number;
  expanded_image_count: number;
  reason:
    | "no_title"
    | "no_price"
    | "no_images"
    | "image_filtered_out"
    | "image_series_expand_failed"
    | "detail_open_failed"
    | "detail_images_not_found"
    | "below_min_images"
    | "download_failed"
    | "filtered_as_non_product"
    | "unsupported_dom_structure";
};

type DetailImageResult = {
  opened: boolean;
  cardImages: string[];
  detailImages: string[];
  finalImages: string[];
  reason?: SkippedProduct["reason"];
};

type ProductExport = {
  product_code: string;
  slug: string;
  category: string;
  subcategory: string;
  title_cn: string;
  description_cn: string;
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
  image_urls: string;
  gallery_image_urls: string;
  image_count: number;
  source_url: string;
  source_album_url: string;
  source_product_url: string;
  source_tab: string;
  source_page: number;
  source_fingerprint: string;
  import_batch_id: string;
  imported_at: string;
  translation_provider: "none";
  translation_status: "fallback";
  status: "draft" | "needs_review";
  notes: string;
};

const maxProductImages = 20;
const csvColumns: Array<keyof ProductExport> = [
  "product_code",
  "slug",
  "category",
  "subcategory",
  "title_cn",
  "description_cn",
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
  "image_urls",
  "gallery_image_urls",
  "image_count",
  "source_url",
  "source_album_url",
  "source_product_url",
  "source_tab",
  "source_page",
  "source_fingerprint",
  "import_batch_id",
  "imported_at",
  "translation_provider",
  "translation_status",
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
  if (!url) throw new Error('Missing --url "https://..."');
  return {
    url,
    inputHtml: getValue("--input-html") || "",
    debugDir: getValue("--debug-dir") || "",
    tab: getValue("--tab") || getValue("--category-tab") || "",
    page: Math.max(1, Number(getValue("--page") || getValue("--page-number") || 1) || 1),
    dedupeExisting: args.includes("--dedupe-existing"),
    mobile: args.includes("--mobile"),
    category: getValue("--category") || "Bags",
    limitNew: Math.max(1, Number(getValue("--limit-new") || 5) || 5),
    maxScan: Math.max(1, Number(getValue("--max-scan") || 50) || 50),
    minImages: Math.max(0, Number(getValue("--min-images") || 0) || 0),
    productTimeoutMs: Math.max(5000, Number(getValue("--product-timeout-ms") || 45000) || 45000),
    saveEvery: Math.max(1, Number(getValue("--save-every") || 1) || 1),
    debug: args.includes("--debug"),
    headed: args.includes("--headed"),
  };
}

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function batchTimestamp(value = new Date().toISOString()) {
  const date = new Date(value);
  const pad = (input: number) => String(input).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

function cleanText(text: string) {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/下载|一键转发|复制文案|保存图片|查看详情|1分钟内|刚刚|分钟前/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)));
}

function categoryPrefix(category: string) {
  const normalized = category.toLowerCase();
  if (normalized === "shoes") return "LM-SHO";
  if (normalized === "watches") return "LM-WAT";
  if (normalized === "bags") return "LM-BAG";
  return "LM-APP";
}

function productCodeFor(category: string, sequence: number) {
  return `${categoryPrefix(category)}-${String(sequence).padStart(4, "0")}`;
}

function slugFor(productCode: string) {
  return productCode.toLowerCase();
}

function sha1(value: string) {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function productIdFromImageUrl(rawUrl: string) {
  const cleanUrl = normalizedImageKey(rawUrl);
  return cleanUrl.match(/\/person\/[^/]+\/([^/]+)\/\d+\.(?:jpe?g|png|webp)$/i)?.[1] || "";
}

function sourceFingerprintFor({
  options,
  title,
  firstImageUrl,
}: {
  options: CliOptions;
  title: string;
  firstImageUrl: string;
}) {
  const productId = productIdFromImageUrl(firstImageUrl);
  const basis = productId
    ? ["gxhy1688", options.url, options.tab, String(options.page), productId]
    : ["gxhy1688", options.url, options.tab, String(options.page), title.toLowerCase(), normalizedImageKey(firstImageUrl)];
  return sha1(basis.join("|"));
}

function normalizeUrl(rawUrl: string, baseUrl: string) {
  if (!rawUrl || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) return "";
  try {
    const url = new URL(rawUrl, baseUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return "";
  }
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

function isRejectedImageUrl(rawUrl: string) {
  return /avatar|logo|qrcode|qr|captcha|verify|icon|shop|store|profile|watermark|background|banner|default|loading|blank/i.test(rawUrl);
}

function productLikeImageUrls(imageUrls: string[], sourceUrl: string) {
  return unique(imageUrls.map((url) => normalizeUrl(url, sourceUrl)).filter(Boolean))
    .map((url) => normalizedImageKey(url))
    .filter((url) => !isRejectedImageUrl(url))
    .filter((url) => /\/\/product\.aliyizhan\.com\/person\//i.test(url));
}

function isLikelyNonProduct(product: DomProduct) {
  const text = `${product.title} ${product.description}`;
  if (product.imageUrls.length > 30 && /关注|浏览量|周关注|总关注|服务类型|联系商家|货源直供/.test(text)) {
    return true;
  }
  if (/下单请扫这个微信|支持一件代发|生意兴隆|财源广进/.test(text) && product.imageUrls.length <= 2) {
    return true;
  }
  return false;
}

function hasPriceOrModel(product: DomProduct) {
  const text = `${product.title} ${product.description}`;
  return Boolean(product.price || /(￥\s*\d+|p\s*\d+|Rolex|劳力士|腕表|机芯|表壳|表带|直径|尺寸|mm|系列|型号)/i.test(text));
}

function skippedDetail(
  product: DomProduct,
  expandedImageCount: number,
  reason: SkippedProduct["reason"],
  detail?: Partial<Pick<SkippedProduct, "card_image_count" | "detail_image_count" | "final_image_count">>
): SkippedProduct {
  return {
    index: product.domIndex,
    product_title: cleanText(`${product.title || product.description || ""}`).slice(0, 240),
    text_sample: cleanText(`${product.title || product.description || ""}`).slice(0, 240),
    image_url_count: product.imageUrls.length,
    raw_image_urls: product.imageUrls.slice(0, 5),
    card_image_count: detail?.card_image_count,
    detail_image_count: detail?.detail_image_count,
    final_image_count: detail?.final_image_count,
    expanded_image_count: expandedImageCount,
    reason,
  };
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function productImageSeriesUrls(rawUrl: string) {
  const cleanUrl = normalizedImageKey(rawUrl);
  const match = cleanUrl.match(/^(https?:\/\/product\.aliyizhan\.com\/person\/[^?#]+\/)(\d+)\.(jpe?g|png|webp)$/i);
  if (!match) return [];
  const [, base, , extension] = match;
  return Array.from({ length: maxProductImages }, (_item, index) => `${base}${index}.${extension}`);
}

async function urlExists(url: string, referer: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, 8000));
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        Referer: referer,
        "User-Agent": "Mozilla/5.0 LM-Dkbrand-gxhy-importer",
      },
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function expandSequentialImageUrls(imageUrls: string[], referer: string, timeoutMs: number) {
  const expanded: string[] = [];
  for (const imageUrl of imageUrls) {
    const series = productImageSeriesUrls(imageUrl);
    if (series.length === 0) {
      expanded.push(imageUrl);
      continue;
    }
    let missingInARow = 0;
    for (const seriesUrl of series) {
      const exists = await urlExists(seriesUrl, referer, timeoutMs);
      if (!exists) {
        missingInARow += 1;
        if (missingInARow >= 2) break;
        continue;
      }
      missingInARow = 0;
      expanded.push(seriesUrl);
    }
  }
  return unique(expanded.length > 0 ? expanded : imageUrls);
}

async function collectVisiblePageImages(page: any, sourceUrl: string) {
  return page.evaluate(({ sourceUrl: baseUrl }: { sourceUrl: string }) => {
    const absolute = (raw: string) => {
      if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return "";
      try {
        return new URL(raw, baseUrl).toString();
      } catch {
        return "";
      }
    };
    const urls: string[] = [];
    const pushUrl = (raw: string) => {
      const url = absolute(raw);
      if (url) urls.push(url);
    };
    document.querySelectorAll("img").forEach((img) => {
      const rect = img.getBoundingClientRect();
      const visible = rect.width >= 80 && rect.height >= 80;
      if (!visible) return;
      pushUrl(img.currentSrc || img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("data-original") || img.getAttribute("data-lazy") || "");
    });
    document.querySelectorAll<HTMLElement>("*").forEach((element) => {
      const style = window.getComputedStyle(element);
      const matches = Array.from(style.backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g));
      matches.forEach((match) => pushUrl(match[1] || ""));
    });
    return Array.from(new Set(urls));
  }, { sourceUrl }) as Promise<string[]>;
}

async function collectPageImages(page: any, sourceUrl: string) {
  return page.evaluate(({ sourceUrl: baseUrl }: { sourceUrl: string }) => {
    const absolute = (raw: string) => {
      if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return "";
      try {
        return new URL(raw, baseUrl).toString();
      } catch {
        return "";
      }
    };
    const urls: string[] = [];
    const pushUrl = (raw: string | null) => {
      const url = absolute(raw || "");
      if (url) urls.push(url);
    };
    document.querySelectorAll("img").forEach((img) => {
      pushUrl(img.currentSrc);
      pushUrl(img.getAttribute("src"));
      pushUrl(img.getAttribute("data-src"));
      pushUrl(img.getAttribute("data-original"));
      pushUrl(img.getAttribute("data-lazy"));
      pushUrl(img.getAttribute("data-url"));
    });
    document.querySelectorAll<HTMLElement>("*").forEach((element) => {
      const style = window.getComputedStyle(element);
      const matches = Array.from(style.backgroundImage.matchAll(/url\(["']?([^"')]+)["']?\)/g));
      matches.forEach((match) => pushUrl(match[1] || ""));
    });
    return Array.from(new Set(urls));
  }, { sourceUrl }) as Promise<string[]>;
}

function productDebugName(productDebugIndex: number) {
  return `product-${String(productDebugIndex).padStart(3, "0")}`;
}

async function writeProductDebugJson(debugRoot: string, productDebugIndex: number, suffix: string, data: unknown, enabled: boolean) {
  if (!enabled) return;
  await writeJson(path.join(debugRoot, `${productDebugName(productDebugIndex)}-${suffix}.json`), data).catch(() => undefined);
}

async function saveProductDetailScreenshot(page: any, debugRoot: string, productDebugIndex: number, enabled: boolean) {
  if (!enabled) return;
  await page.screenshot({
    path: path.join(debugRoot, `${productDebugName(productDebugIndex)}-detail.png`),
    fullPage: true,
  }).catch(() => undefined);
}

async function productCardLocator(page: any, product: DomProduct) {
  const productId = product.imageUrls.map(productIdFromImageUrl).find(Boolean) || "";
  if (productId) {
    const locator = page.locator(`img[src*="${productId}"], img[data-src*="${productId}"], img[data-original*="${productId}"], img[data-lazy*="${productId}"]`).first();
    if (await locator.count().catch(() => 0)) return locator;
  }
  const firstImage = normalizedImageKey(product.imageUrls[0] || "");
  const imagePath = firstImage ? new URL(firstImage).pathname.split("/").slice(-3).join("/") : "";
  if (imagePath) {
    const locator = page.locator(`img[src*="${imagePath}"], img[data-src*="${imagePath}"], img[data-original*="${imagePath}"], img[data-lazy*="${imagePath}"]`).first();
    if (await locator.count().catch(() => 0)) return locator;
  }
  return page.locator("img").nth(Math.max(0, product.domIndex - 1));
}

async function clickProductCard(page: any, product: DomProduct, timeoutMs: number) {
  const productId = product.imageUrls.map(productIdFromImageUrl).find(Boolean) || "";
  const firstImage = normalizedImageKey(product.imageUrls[0] || "");
  const clickedInDom = await page.evaluate(
    ({ productId, firstImage }: { productId: string; firstImage: string }) => {
      const normalize = (value: string) => value.split("?")[0].split("#")[0];
      const imagePath = firstImage ? new URL(firstImage).pathname.split("/").slice(-3).join("/") : "";
      const images = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
      const image = images.find((img) => {
        const values = [
          img.currentSrc,
          img.getAttribute("src") || "",
          img.getAttribute("data-src") || "",
          img.getAttribute("data-original") || "",
          img.getAttribute("data-lazy") || "",
        ].map(normalize);
        return values.some((value) => Boolean(productId && value.includes(productId)) || Boolean(imagePath && value.includes(imagePath)));
      });
      if (!image) return false;
      const clickable = image.closest<HTMLElement>("a[href], [onclick], li, article, [class*=goods], [class*=Goods], [class*=product], [class*=Product], [class*=item], [class*=Item], [class*=card], [class*=Card], [class*=Shopbusiness]") || image;
      clickable.scrollIntoView({ block: "center", inline: "center" });
      clickable.click();
      return true;
    },
    { productId, firstImage }
  ).catch(() => false);
  if (clickedInDom) return;

  const locator = await productCardLocator(page, product);
  await locator.scrollIntoViewIfNeeded({ timeout: Math.min(timeoutMs, 8000) }).catch(() => undefined);
  await locator.click({ timeout: Math.min(timeoutMs, 10000) });
}

async function clickProductDetailImages(page: any, product: DomProduct, options: CliOptions, debugRoot: string, productDebugIndex: number): Promise<DetailImageResult> {
  const timeoutMs = options.productTimeoutMs;
  const beforeUrl = page.url();
  const cardImages = productLikeImageUrls(product.imageUrls, options.url);
  await writeProductDebugJson(debugRoot, productDebugIndex, "card-images", cardImages, options.debug);
  try {
    if (options.debug) {
      const initialCardLocator = await productCardLocator(page, product);
      await initialCardLocator.scrollIntoViewIfNeeded({ timeout: Math.min(timeoutMs, 8000) }).catch(() => undefined);
      await initialCardLocator.screenshot({ path: path.join(debugRoot, `${productDebugName(productDebugIndex)}-card.png`) }).catch(async () => {
        await page.screenshot({ path: path.join(debugRoot, `${productDebugName(productDebugIndex)}-card.png`), fullPage: false }).catch(() => undefined);
      });
    }
    if (/^https?:\/\//i.test(product.sourceProductUrl) && !/#(?:dom|html)-\d+$/i.test(product.sourceProductUrl)) {
      await page.goto(product.sourceProductUrl, { waitUntil: "domcontentloaded", timeout: Math.min(timeoutMs, 20000) }).catch(() => undefined);
      await page.waitForTimeout(1500).catch(() => undefined);
      for (let index = 0; index < 6; index += 1) {
        await page.evaluate("window.scrollBy(0, Math.round(window.innerHeight * 0.8))").catch(() => undefined);
        await page.waitForTimeout(350).catch(() => undefined);
      }
      const directImages = productLikeImageUrls(await collectPageImages(page, options.url), options.url);
      await saveProductDetailScreenshot(page, debugRoot, productDebugIndex, options.debug);
      await page.goto(beforeUrl, { waitUntil: "domcontentloaded", timeout: Math.min(timeoutMs, 12000) }).catch(() => undefined);
      if (directImages.length > 0) {
        const expandedDirect = await expandSequentialImageUrls(directImages, options.url, timeoutMs);
        const finalImages = productLikeImageUrls(expandedDirect, options.url);
        await writeProductDebugJson(debugRoot, productDebugIndex, "detail-images", directImages, options.debug);
        await writeProductDebugJson(debugRoot, productDebugIndex, "final-images", finalImages, options.debug);
        return { opened: true, cardImages, detailImages: directImages, finalImages };
      }
    }

    const cardLocator = await productCardLocator(page, product);
    await cardLocator.scrollIntoViewIfNeeded({ timeout: Math.min(timeoutMs, 8000) }).catch(() => undefined);
    await clickProductCard(page, product, timeoutMs);
    await page.waitForTimeout(2200).catch(() => undefined);
    const pageImages = productLikeImageUrls(await collectPageImages(page, options.url), options.url);
    const productIds = new Set(cardImages.map(productIdFromImageUrl).filter(Boolean));
    const detailImages = productIds.size > 0
      ? pageImages.filter((url) => productIds.has(productIdFromImageUrl(url)))
      : pageImages;
    const detailOpenedByEvidence = page.url() !== beforeUrl || detailImages.length > cardImages.length;
    await saveProductDetailScreenshot(page, debugRoot, productDebugIndex, options.debug);
    await page.keyboard.press("Escape").catch(() => undefined);
    await page.waitForTimeout(500).catch(() => undefined);
    if (page.url() !== beforeUrl) {
      await page.goto(beforeUrl, { waitUntil: "domcontentloaded", timeout: Math.min(timeoutMs, 12000) }).catch(() => undefined);
    }
    if (!detailOpenedByEvidence) {
      await writeProductDebugJson(debugRoot, productDebugIndex, "detail-images", detailImages, options.debug);
      await writeProductDebugJson(debugRoot, productDebugIndex, "final-images", [], options.debug);
      return { opened: false, cardImages, detailImages, finalImages: [], reason: "detail_open_failed" };
    }
    const expandedDetailImages = await expandSequentialImageUrls(detailImages.length > 0 ? detailImages : [], options.url, timeoutMs);
    const finalImages = productLikeImageUrls(expandedDetailImages, options.url);
    await writeProductDebugJson(debugRoot, productDebugIndex, "detail-images", detailImages, options.debug);
    await writeProductDebugJson(debugRoot, productDebugIndex, "final-images", finalImages, options.debug);
    if (detailImages.length === 0) {
      return { opened: true, cardImages, detailImages, finalImages, reason: "detail_images_not_found" };
    }
    return { opened: true, cardImages, detailImages, finalImages };
  } catch {
    await writeProductDebugJson(debugRoot, productDebugIndex, "detail-images", [], options.debug);
    await writeProductDebugJson(debugRoot, productDebugIndex, "final-images", [], options.debug);
    return { opened: false, cardImages, detailImages: [], finalImages: [], reason: "detail_open_failed" };
  }
}

async function enrichProductImages(product: DomProduct, options: CliOptions, page: any | undefined, debugRoot: string, productDebugIndex: number): Promise<{ product: DomProduct; detail: DetailImageResult }> {
  const cardImages = productLikeImageUrls(product.imageUrls, options.url);
  if (page && !options.mobile) {
    const detail = await clickProductDetailImages(page, { ...product, imageUrls: cardImages }, options, debugRoot, productDebugIndex);
    return { product: { ...product, imageUrls: detail.finalImages }, detail };
  }

  const expanded = await expandSequentialImageUrls(cardImages, options.url, options.productTimeoutMs);
  const finalImages = productLikeImageUrls(expanded, options.url);
  const detail: DetailImageResult = { opened: false, cardImages, detailImages: [], finalImages, reason: page ? undefined : "detail_open_failed" };
  await writeProductDebugJson(debugRoot, productDebugIndex, "card-images", cardImages, options.debug);
  await writeProductDebugJson(debugRoot, productDebugIndex, "detail-images", [], options.debug);
  await writeProductDebugJson(debugRoot, productDebugIndex, "final-images", finalImages, options.debug);
  return { product: { ...product, imageUrls: finalImages }, detail };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function saveDebugPage(page: any, debugRoot: string, name: string, enabled: boolean) {
  if (!enabled) return;
  await page.screenshot({ path: path.join(debugRoot, `${name}.png`), fullPage: true }).catch(() => undefined);
  await fs.writeFile(path.join(debugRoot, `${name}.html`), await page.content()).catch(() => undefined);
}

async function clickText(page: any, text: string, errorMessage: string, timeoutMs: number) {
  const exact = page.getByText(text, { exact: true }).first();
  if (await exact.count().catch(() => 0)) {
    await exact.scrollIntoViewIfNeeded({ timeout: Math.min(timeoutMs, 8000) }).catch(() => undefined);
    await exact.click({ timeout: Math.min(timeoutMs, 10000) });
    return;
  }

  const partial = page.getByText(text).first();
  if (await partial.count().catch(() => 0)) {
    await partial.scrollIntoViewIfNeeded({ timeout: Math.min(timeoutMs, 8000) }).catch(() => undefined);
    await partial.click({ timeout: Math.min(timeoutMs, 10000) });
    return;
  }

  const tabLike = page.locator("a, button, li, span").filter({ hasText: text }).first();
  if (await tabLike.count().catch(() => 0)) {
    await tabLike.scrollIntoViewIfNeeded({ timeout: Math.min(timeoutMs, 8000) }).catch(() => undefined);
    await tabLike.click({ timeout: Math.min(timeoutMs, 10000) });
    return;
  }

  throw new Error(errorMessage);
}

async function clickGxhyTab(page: any, options: CliOptions, outputRoot: string, debugRoot: string, startedAt: string) {
  if (!options.tab) return;
  await saveProgress({
    outputRoot,
    rows: [],
    sourceUrl: options.url,
    category: options.category,
    limitNew: options.limitNew,
    scannedCount: 0,
    stage: "clicking_tab",
    startedAt,
    selectedTab: options.tab,
    selectedPage: options.page,
  });
  await saveDebugPage(page, debugRoot, "before-tab-click", options.debug);
  await clickText(page, options.tab, `Cannot find gxhy tab: ${options.tab}`, options.productTimeoutMs);
  await page.waitForTimeout(3000);
  await saveDebugPage(page, debugRoot, "after-tab-click", options.debug);
}

async function clickGxhyPage(page: any, options: CliOptions, outputRoot: string, debugRoot: string, startedAt: string) {
  if (options.page <= 1) return;
  await saveProgress({
    outputRoot,
    rows: [],
    sourceUrl: options.url,
    category: options.category,
    limitNew: options.limitNew,
    scannedCount: 0,
    stage: "clicking_page",
    startedAt,
    selectedTab: options.tab,
    selectedPage: options.page,
  });
  await saveDebugPage(page, debugRoot, "before-page-click", options.debug);
  await clickText(page, String(options.page), `Cannot find gxhy page: ${options.page}`, options.productTimeoutMs);
  await page.waitForTimeout(3500);
  await saveDebugPage(page, debugRoot, "after-page-click", options.debug);
}

async function debugSummaryFor(debugDir: string) {
  const summaryPath = path.join(debugDir, "gxhy1688-network-summary.json");
  try {
    const content = await fs.readFile(summaryPath, "utf8");
    return JSON.parse(content) as { source_url?: string; selected_tab?: string; selected_page?: number; viewport_mode?: string };
  } catch {
    return null;
  }
}

async function debugHtmlIn(debugDir: string, options: CliOptions) {
  const summary = await debugSummaryFor(debugDir);
  if (!summary?.source_url || summary.source_url !== options.url) {
    return "";
  }
  if (options.tab && summary.selected_tab !== options.tab) {
    return "";
  }
  if (options.page > 1 && Number(summary.selected_page || 1) !== options.page) {
    return "";
  }
  const expectedViewport = options.mobile ? "mobile" : "desktop";
  if (summary.viewport_mode !== expectedViewport) {
    return "";
  }

  const candidates = [
    path.join(debugDir, "page.html"),
    path.join(debugDir, "listing-page.html"),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // try next debug html file
    }
  }
  return "";
}

async function matchingDebugHtml(options: CliOptions) {
  if (options.debugDir) {
    const resolved = path.resolve(options.debugDir);
    return debugHtmlIn(resolved, options);
  }

  const gxhyRoot = path.join(process.cwd(), "imports", "gxhy1688");
  let entries: string[] = [];
  try {
    entries = await fs.readdir(gxhyRoot);
  } catch {
    return "";
  }
  const candidates = entries
    .filter((entry) => entry.startsWith("debug-"))
    .sort()
    .reverse()
    .map((entry) => path.join(gxhyRoot, entry));
  for (const candidateDir of candidates) {
    const htmlPath = await debugHtmlIn(candidateDir, options);
    if (htmlPath) return htmlPath;
  }
  return "";
}

async function collectHtmlProducts(htmlPath: string, sourceUrl: string, maxScan: number) {
  const html = await fs.readFile(htmlPath, "utf8");
  const blocks = html.match(/<div class="Shopbusiness_footer">[\s\S]*?(?=<div class="Shopbusiness_footer">|<\/body>|$)/g) || [];
  const products: DomProduct[] = [];
  for (const [index, block] of blocks.entries()) {
    if (products.length >= maxScan) break;
    const imageUrls = unique(
      Array.from(block.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi))
        .map((match) => normalizeUrl(decodeHtml(match[1] || ""), sourceUrl))
        .filter(Boolean)
        .filter((url) => !url.startsWith("data:") && !isRejectedImageUrl(url))
    );
    if (imageUrls.length === 0) continue;
    const price = decodeHtml(block.match(/Shopbusiness_footer_row_title[^>]*>\s*([\s\S]*?)\s*<\/div>/i)?.[1] || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, "");
    const titleHtml = block.match(/Shopbusiness_footer_right_title[^>]*>\s*([\s\S]*?)\s*<\/div>/i)?.[1] || "";
    const description = cleanText(decodeHtml(titleHtml));
    const combined = cleanText(`${price} ${description}`);
    if (!/(￥\s*\d+|p\s*\d+)/i.test(combined) || description.length < 8) continue;
    products.push({
      title: combined.slice(0, 220),
      description: combined.slice(0, 1800),
      price: (combined.match(/(￥\s*\d+|p\s*\d+)/i) || [""])[0].replace(/\s+/g, ""),
      imageUrls,
      sourceProductUrl: `${sourceUrl}#html-${index + 1}`,
      domIndex: index + 1,
    });
  }
  return products;
}

function csvEscape(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
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

async function loadEnvLocal() {
  try {
    const content = await fs.readFile(path.resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const index = trimmed.indexOf("=");
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch {
    // .env.local is optional for gxhy extraction.
  }
}

async function fetchExistingFingerprints(category: string) {
  await loadEnvLocal();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !key) return new Set<string>();
  const response = await fetch(`${supabaseUrl}/rest/v1/products?select=source_fingerprint&category=eq.${encodeURIComponent(category)}&source_fingerprint=not.is.null&limit=10000`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!response.ok) return new Set<string>();
  const rows = await response.json() as Array<{ source_fingerprint?: string | null }>;
  return new Set(rows.map((row) => row.source_fingerprint || "").filter(Boolean));
}

async function saveProgress({
  outputRoot,
  rows,
  sourceUrl,
  category,
  limitNew,
  scannedCount,
  stage,
  startedAt,
  selectedTab,
  selectedPage,
}: {
  outputRoot: string;
  rows: ProductExport[];
  sourceUrl: string;
  category: string;
  limitNew: number;
  scannedCount: number;
  stage: string;
  startedAt: string;
  selectedTab?: string;
  selectedPage?: number;
}) {
  const partialPath = path.join(outputRoot, "products-import.partial.json");
  await writeJson(partialPath, rows);
  await writeJson(path.join(outputRoot, "import-progress.json"), {
    started_at: startedAt,
    updated_at: new Date().toISOString(),
    stage,
    source_url: sourceUrl,
    category,
    selected_tab: selectedTab || "",
    selected_page: selectedPage || 1,
    requested_limit_new: limitNew,
    scanned_count: scannedCount,
    exported_count: rows.length,
    skipped_count: Math.max(0, scannedCount - rows.length),
    failed_count: 0,
    last_product_index: scannedCount,
    last_product_url: rows[rows.length - 1]?.source_product_url || "",
    output_partial_file: partialPath,
  });
}

async function downloadImage(url: string, referer: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  const response = await fetch(url, {
    headers: {
      Referer: referer,
      "User-Agent": "Mozilla/5.0 LM-Dkbrand-gxhy-importer",
    },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const input = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(input).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  if (width < 180 || height < 180) throw new Error(`image too small ${width}x${height}`);
  return {
    displayBuffer: await sharp(input).rotate().resize({ width: 1400, withoutEnlargement: true }).webp({ quality: 90 }).toBuffer(),
    thumbBuffer: await sharp(input).rotate().resize({ width: 400, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer(),
    hash: sha1(input.toString("base64")),
  };
}

async function collectDomProducts(page: any, sourceUrl: string, maxScan: number) {
  return page.evaluate(
    ({ sourceUrl: baseUrl, maxScan: limit }: { sourceUrl: string; maxScan: number }) => {
      const absolute = (raw: string) => {
        if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return "";
        try {
          return new URL(raw, baseUrl).toString();
        } catch {
          return "";
        }
      };
      const textOf = (element: Element) => (element.textContent || "").replace(/\s+/g, " ").trim();
      const badText = /下载|一键转发|复制文案|保存图片|查看详情|1分钟内|刚刚|分钟前/g;
      const imageUrlsOf = (element: Element) => {
        const urls = Array.from(element.querySelectorAll("img"))
          .map((img) => absolute(
            img.currentSrc ||
            img.getAttribute("src") ||
            img.getAttribute("data-src") ||
            img.getAttribute("data-original") ||
            img.getAttribute("data-lazy") ||
            ""
          ))
          .filter(Boolean);
        return Array.from(new Set(urls));
      };
      const pricePattern = /(￥\s*\d+|p\s*\d+)/i;
      const selectors = [
        "[class*=goods]",
        "[class*=Goods]",
        "[class*=product]",
        "[class*=Product]",
        "[class*=item]",
        "[class*=Item]",
        "[class*=card]",
        "[class*=Card]",
        "[class*=grid]",
        "[class*=Grid]",
        ".new_list_box",
        ".wechat_business_box",
        ".swiper_row_img",
        ".new_list_box",
        ".wechat_business_box",
        ".swiper_row_img",
        ".Shopbusiness_footer",
        "[class*=business]",
        "[class*=goods]",
        "[class*=product]",
        "[class*=list]",
        "li",
        "article",
      ].join(",");
      const candidateRoots = new Set<Element>();
      Array.from(document.querySelectorAll(selectors)).forEach((element) => {
        const text = textOf(element);
        const images = imageUrlsOf(element);
        if (images.length === 0) return;
        if (!pricePattern.test(text) && !/下载|一键转发|Rolex|劳力士|腕表|机芯|表壳|表带|直径|尺寸/i.test(text)) return;
        let root: Element = element;
        for (let i = 0; i < 4; i += 1) {
          const parent = root.parentElement;
          if (!parent) break;
          const parentText = textOf(parent);
          const parentImages = imageUrlsOf(parent);
          if (parentImages.length >= images.length && parentText.length < 2600 && (pricePattern.test(parentText) || /下载|一键转发|Rolex|劳力士|腕表|机芯|表壳|表带|直径|尺寸/i.test(parentText))) {
            root = parent;
          }
        }
        candidateRoots.add(root);
      });

      const products = Array.from(candidateRoots)
        .map((element, index) => {
          const rawText = textOf(element);
          const cleanedText = rawText.replace(badText, " ").replace(/\s+/g, " ").trim();
          const price = (cleanedText.match(pricePattern) || [""])[0].replace(/\s+/g, "");
          const anchor = element.matches("a[href]") ? element : element.querySelector("a[href]");
          const sourceProductUrl = anchor ? absolute(anchor.getAttribute("href") || "") : `${baseUrl}#dom-${index + 1}`;
          return {
            title: cleanedText.slice(0, 220),
            description: cleanedText.slice(0, 1800),
            price,
            imageUrls: imageUrlsOf(element),
            sourceProductUrl,
            domIndex: index + 1,
          };
        })
        .filter((item) => item.title.length >= 8 && item.imageUrls.length > 0);

      const seen = new Set<string>();
      return products.filter((item) => {
        const key = `${item.title}|${item.imageUrls[0]}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, limit);
    },
    { sourceUrl, maxScan }
  ) as Promise<DomProduct[]>;
}

async function exportProduct({
  product,
  sequence,
  options,
  outputRoot,
  importedAt,
  importBatchId,
}: {
  product: DomProduct;
  sequence: number;
  options: CliOptions;
  outputRoot: string;
  importedAt: string;
  importBatchId: string;
}) {
  const productCode = productCodeFor(options.category, sequence);
  const sourceTitle = cleanText(product.title);
  const sourceDescription = cleanText(product.description || product.title);
  const filteredUrls = productLikeImageUrls(product.imageUrls, options.url)
    .slice(0, maxProductImages);
  const imageFolder = path.join("images", productCode);
  const displayFolder = path.join(imageFolder, "display");
  const thumbsFolder = path.join(imageFolder, "thumbs");
  await fs.mkdir(path.join(outputRoot, displayFolder), { recursive: true });
  await fs.mkdir(path.join(outputRoot, thumbsFolder), { recursive: true });

  const savedImages: string[] = [];
  const savedThumbs: string[] = [];
  const seenHashes = new Set<string>();
  const errors: string[] = [];
  for (const imageUrl of filteredUrls) {
    if (savedImages.length >= maxProductImages) break;
    try {
      const image = await downloadImage(imageUrl, options.url);
      if (seenHashes.has(image.hash)) continue;
      seenHashes.add(image.hash);
      const filename = `${String(savedImages.length + 1).padStart(2, "0")}.webp`;
      const displayPath = path.join(displayFolder, filename);
      const thumbPath = path.join(thumbsFolder, filename);
      await fs.writeFile(path.join(outputRoot, displayPath), image.displayBuffer);
      await fs.writeFile(path.join(outputRoot, thumbPath), image.thumbBuffer);
      savedImages.push(displayPath);
      savedThumbs.push(thumbPath);
    } catch (error) {
      errors.push(`${imageUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (options.minImages > 0 && savedImages.length < options.minImages) {
    return {
      row: null,
      skipped: true,
      reason: errors.length > 0 && savedImages.length === 0 ? "download_failed" : "below_min_images",
      message: `Fewer than ${options.minImages} product images saved from detail image set (${savedImages.length} saved, ${filteredUrls.length} candidate urls)`,
      downloaded: savedImages.length,
    };
  }

  const fingerprint = sourceFingerprintFor({
    options,
    title: sourceTitle,
    firstImageUrl: filteredUrls[0] || "",
  });
  const notes = [
    product.price ? `source price: ${product.price}` : "",
    errors.length > 0 ? `${errors.length} image download errors` : "",
  ].filter(Boolean).join("; ");

  const row: ProductExport = {
    product_code: productCode,
    slug: slugFor(productCode),
    category: options.category,
    subcategory: "Selected Products",
    title_cn: sourceTitle,
    description_cn: sourceDescription,
    source_title_cn: sourceTitle,
    cleaned_source_title_cn: sourceTitle,
    source_description_cn: sourceDescription,
    cleaned_source_description_cn: sourceDescription,
    title_en: "Selected Product Style",
    description_en: "Selected product style available for retail and wholesale orders. Please contact us with product code, size, color, and destination for details.",
    sizes_display: "Contact us for current size availability",
    colors_display: "Contact us for available color options",
    moq: "From 1 piece",
    delivery_time: "7-12 business days",
    image_folder: imageFolder,
    main_image: savedImages[0] || "",
    gallery_images: savedImages.join("|"),
    main_thumbnail: savedThumbs[0] || "",
    gallery_thumbnails: savedThumbs.join("|"),
    image_urls: filteredUrls.join("|"),
    gallery_image_urls: savedImages.join("|"),
    image_count: savedImages.length,
    source_url: options.url,
    source_album_url: options.url,
    source_product_url: product.sourceProductUrl || `${options.url}#dom-${product.domIndex}`,
    source_tab: options.tab,
    source_page: options.page,
    source_fingerprint: fingerprint,
    import_batch_id: importBatchId,
    imported_at: importedAt,
    translation_provider: "none",
    translation_status: "fallback",
    status: savedImages.length === 0 || errors.length > 0 ? "needs_review" : "draft",
    notes,
  };
  return { row, skipped: false, reason: "", downloaded: savedImages.length };
}

async function main() {
  const options = parseArgs();
  const importedAt = new Date().toISOString();
  const importBatchId = `${options.category.toLowerCase()}-${batchTimestamp(importedAt)}`;
  const outputRoot = path.join(process.cwd(), "imports", "gxhy1688", `gxhy-test-${timestamp()}`);
  const debugRoot = path.join(outputRoot, "debug");
  const browserHome = path.join(outputRoot, "browser-home");
  await fs.mkdir(debugRoot, { recursive: true });
  await fs.mkdir(browserHome, { recursive: true });

  const loadModule = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
  const { chromium } = await loadModule("playwright");
  let browser: any;
  let listingPage: any;
  const exported: ProductExport[] = [];
  const skippedProducts: Array<{ title: string; reason: string }> = [];
  const skippedProductDetails: SkippedProduct[] = [];
  const failedProducts: Array<{ title: string; reason: string }> = [];
  const duplicateCandidates: Array<{ index: number; source_fingerprint: string; title: string; first_image_url: string; reason: string }> = [];
  let scannedCount = 0;
  let totalImagesDownloaded = 0;
  let candidates: DomProduct[] = [];
  let collectionMode = "playwright";
  let skippedDuplicateCount = 0;
  let skippedBelowMinImagesCount = 0;
  let skippedNonProductCount = 0;
  let existingFingerprints = new Set<string>();
  let detailAttemptCount = 0;

  if (options.dedupeExisting) {
    existingFingerprints = await fetchExistingFingerprints(options.category);
  }

  await saveProgress({
    outputRoot,
    rows: exported,
    sourceUrl: options.url,
    category: options.category,
    limitNew: options.limitNew,
    scannedCount,
    stage: "opening_page",
    startedAt: importedAt,
    selectedTab: options.tab,
    selectedPage: options.page,
  });

  if (options.inputHtml) {
    collectionMode = "input-html";
    await saveProgress({
      outputRoot,
      rows: exported,
      sourceUrl: options.url,
      category: options.category,
      limitNew: options.limitNew,
      scannedCount,
      stage: "reading_dom",
      startedAt: importedAt,
      selectedTab: options.tab,
      selectedPage: options.page,
    });
    candidates = await collectHtmlProducts(options.inputHtml, options.url, options.maxScan);
  } else {
    try {
      candidates = await withTimeout((async () => {
        browser = await chromium.launch({
          headless: !options.headed,
          slowMo: options.headed ? 180 : 0,
          args: ["--disable-crash-reporter", "--disable-crashpad", "--no-sandbox"],
          env: {
            ...process.env,
            HOME: browserHome,
            XDG_CACHE_HOME: path.join(browserHome, ".cache"),
            XDG_CONFIG_HOME: path.join(browserHome, ".config"),
          },
        });
        const page = await browser.newPage({
          viewport: options.mobile ? { width: 390, height: 1200 } : { width: 1440, height: 1000 },
          isMobile: options.mobile,
          hasTouch: options.mobile,
          deviceScaleFactor: 1,
          userAgent: options.mobile
            ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 LM-Dkbrand-gxhy-importer"
            : "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 LM-Dkbrand-gxhy-importer",
        });
        listingPage = page;
        await page.goto(options.url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await saveProgress({
          outputRoot,
          rows: exported,
          sourceUrl: options.url,
          category: options.category,
          limitNew: options.limitNew,
          scannedCount,
          stage: "reading_dom",
          startedAt: importedAt,
          selectedTab: options.tab,
          selectedPage: options.page,
        });
        await page.waitForTimeout(3000);
        await clickGxhyTab(page, options, outputRoot, debugRoot, importedAt);
        await clickGxhyPage(page, options, outputRoot, debugRoot, importedAt);
        for (let index = 0; index < 18; index += 1) {
          await page.evaluate("window.scrollBy(0, Math.round(window.innerHeight * 0.9))");
          await page.waitForTimeout(500);
        }
        if (options.debug) {
          await page.screenshot({ path: path.join(debugRoot, "listing-page.png"), fullPage: true }).catch(() => undefined);
          await fs.writeFile(path.join(debugRoot, "listing-page.html"), await page.content()).catch(() => undefined);
          await writeJson(path.join(debugRoot, "gxhy1688-network-summary.json"), {
            source_url: options.url,
            selected_tab: options.tab,
            selected_page: options.page,
            viewport_mode: options.mobile ? "mobile" : "desktop",
            viewport: options.mobile ? { width: 390, height: 1200 } : { width: 1440, height: 1000 },
            output_folder: debugRoot,
          });
        }
        return collectDomProducts(page, options.url, options.maxScan);
      })(), 60000, "Playwright page read timed out after 60000ms");
    } catch (error) {
      const fallbackHtml = await matchingDebugHtml(options);
      if (!fallbackHtml) {
        await browser?.close().catch(() => undefined);
        const errorMessage = error instanceof Error ? error.message.split("\n")[0] : String(error);
        throw new Error(`No matching gxhy debug html for this URL. Playwright failed: ${errorMessage}`);
      }
      collectionMode = "saved-html-fallback";
      const errorMessage = error instanceof Error ? error.message.split("\n")[0] : String(error);
      failedProducts.push({
        title: "playwright collection",
        reason: `Playwright unavailable; used ${fallbackHtml}: ${errorMessage}`,
      });
      await saveProgress({
        outputRoot,
        rows: exported,
        sourceUrl: options.url,
        category: options.category,
        limitNew: options.limitNew,
        scannedCount,
        stage: "reading_dom",
        startedAt: importedAt,
        selectedTab: options.tab,
        selectedPage: options.page,
      });
      candidates = await collectHtmlProducts(fallbackHtml, options.url, options.maxScan);
    }
  }

  scannedCount = candidates.length;
  await saveProgress({
    outputRoot,
    rows: exported,
    sourceUrl: options.url,
    category: options.category,
    limitNew: options.limitNew,
    scannedCount,
    stage: "extracting_products",
    startedAt: importedAt,
    selectedTab: options.tab,
    selectedPage: options.page,
  });
  if (options.debug) await writeJson(path.join(debugRoot, "dom-product-candidates.json"), candidates);

  const seenFingerprints = new Set<string>();
  for (const candidate of candidates) {
    if (exported.length >= options.limitNew) break;
    await saveProgress({
      outputRoot,
      rows: exported,
      sourceUrl: options.url,
      category: options.category,
      limitNew: options.limitNew,
      scannedCount,
      stage: "downloading_images",
      startedAt: importedAt,
      selectedTab: options.tab,
      selectedPage: options.page,
    });
    if (!cleanText(candidate.title || candidate.description || "")) {
      skippedProductDetails.push(skippedDetail(candidate, 0, "no_title"));
      await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
      continue;
    }
    if (!hasPriceOrModel(candidate)) {
      skippedProductDetails.push(skippedDetail(candidate, 0, "no_price"));
      await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
      continue;
    }
    if (candidate.imageUrls.length === 0) {
      skippedProductDetails.push(skippedDetail(candidate, 0, "no_images"));
      await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
      continue;
    }
    if (isLikelyNonProduct(candidate)) {
      skippedNonProductCount += 1;
      skippedProductDetails.push(skippedDetail(candidate, 0, "filtered_as_non_product"));
      await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
      continue;
    }

    const productImages = productLikeImageUrls(candidate.imageUrls, options.url);
    if (productImages.length === 0) {
      skippedProductDetails.push(skippedDetail(candidate, 0, "image_filtered_out"));
      await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
      continue;
    }

    detailAttemptCount += 1;
    const productDebugIndex = detailAttemptCount;
    const { product: enrichedCandidate, detail } = await enrichProductImages({ ...candidate, imageUrls: productImages }, options, listingPage, debugRoot, productDebugIndex);
    const expandedProductImages = productLikeImageUrls(enrichedCandidate.imageUrls, options.url);
    if (!options.mobile && !detail.opened) {
      skippedProductDetails.push(skippedDetail(candidate, expandedProductImages.length, "detail_open_failed", {
        card_image_count: detail.cardImages.length,
        detail_image_count: detail.detailImages.length,
        final_image_count: detail.finalImages.length,
      }));
      await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
      continue;
    }
    if (!options.mobile && detail.detailImages.length === 0) {
      skippedProductDetails.push(skippedDetail(candidate, expandedProductImages.length, "detail_images_not_found", {
        card_image_count: detail.cardImages.length,
        detail_image_count: detail.detailImages.length,
        final_image_count: detail.finalImages.length,
      }));
      await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
      continue;
    }
    if (expandedProductImages.length === 0) {
      skippedProductDetails.push(skippedDetail(candidate, 0, "image_series_expand_failed"));
      await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
      continue;
    }
    if (options.minImages > 0 && expandedProductImages.length < options.minImages) {
      skippedBelowMinImagesCount += 1;
      skippedProducts.push({ title: candidate.title, reason: `Fewer than ${options.minImages} detail images (${expandedProductImages.length})` });
      skippedProductDetails.push(skippedDetail(candidate, expandedProductImages.length, "below_min_images", {
        card_image_count: detail.cardImages.length,
        detail_image_count: detail.detailImages.length,
        final_image_count: expandedProductImages.length,
      }));
      await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
      continue;
    }
    const fingerprint = sourceFingerprintFor({
      options,
      title: cleanText(enrichedCandidate.title),
      firstImageUrl: expandedProductImages[0] || "",
    });
    if (seenFingerprints.has(fingerprint) || existingFingerprints.has(fingerprint)) {
      skippedDuplicateCount += 1;
      duplicateCandidates.push({
        index: candidate.domIndex,
        source_fingerprint: fingerprint,
        title: cleanText(enrichedCandidate.title).slice(0, 240),
        first_image_url: expandedProductImages[0] || "",
        reason: existingFingerprints.has(fingerprint) ? "existing_source_fingerprint" : "duplicate_inside_current_run",
      });
      await writeJson(path.join(outputRoot, "duplicate_candidates.json"), duplicateCandidates);
      continue;
    }
    seenFingerprints.add(fingerprint);
    try {
      const result = await exportProduct({
        product: enrichedCandidate,
        sequence: exported.length + 1,
        options,
        outputRoot,
        importedAt,
        importBatchId,
      });
      if (!result.row) {
        const reason = (typeof result.reason === "string" ? result.reason : "below_min_images") as SkippedProduct["reason"];
        if (reason === "below_min_images") skippedBelowMinImagesCount += 1;
        skippedProducts.push({ title: candidate.title, reason: result.message || result.reason });
        skippedProductDetails.push(skippedDetail(candidate, expandedProductImages.length, reason, {
          card_image_count: detail.cardImages.length,
          detail_image_count: detail.detailImages.length,
          final_image_count: expandedProductImages.length,
        }));
        await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
        continue;
      }
      exported.push(result.row);
      totalImagesDownloaded += result.downloaded;
      if (exported.length % options.saveEvery === 0) {
        await saveProgress({
          outputRoot,
          rows: exported,
          sourceUrl: options.url,
          category: options.category,
          limitNew: options.limitNew,
          scannedCount,
          stage: "downloading_images",
          startedAt: importedAt,
          selectedTab: options.tab,
          selectedPage: options.page,
        });
      }
    } catch (error) {
      failedProducts.push({ title: candidate.title, reason: error instanceof Error ? error.message : String(error) });
      skippedProductDetails.push(skippedDetail(candidate, productLikeImageUrls(candidate.imageUrls, options.url).length, "download_failed"));
      await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
    }
  }

  await browser?.close().catch(() => undefined);

  await saveProgress({
    outputRoot,
    rows: exported,
    sourceUrl: options.url,
    category: options.category,
    limitNew: options.limitNew,
    scannedCount,
    stage: "complete",
    startedAt: importedAt,
    selectedTab: options.tab,
    selectedPage: options.page,
  });
  await writeJson(path.join(outputRoot, "products-import.json"), exported);
  await fs.writeFile(path.join(outputRoot, "products-import.csv"), `${toCsv(exported)}\n`);
  await writeJson(path.join(outputRoot, "failed-skipped-products.json"), {
    failed_products: failedProducts,
    skipped_products: skippedProducts,
  });
  await writeJson(path.join(outputRoot, "skipped-products.json"), skippedProductDetails);
  await writeJson(path.join(outputRoot, "duplicate_candidates.json"), duplicateCandidates);
  const report = {
    source_url: options.url,
    output_folder: outputRoot,
    collection_mode: collectionMode,
    selected_tab: options.tab,
    selected_page: options.page,
    import_batch_id: importBatchId,
    imported_at: importedAt,
    total_candidates: scannedCount,
    exported_count: exported.length,
    skipped_duplicate_count: skippedDuplicateCount,
    skipped_below_min_images_count: skippedBelowMinImagesCount,
    skipped_non_product_count: skippedNonProductCount,
    products_scanned: scannedCount,
    products_exported: exported.length,
    total_images_downloaded: totalImagesDownloaded,
    skipped_products: skippedProducts,
    failed_products: failedProducts,
    output_file: path.join(outputRoot, "products-import.json"),
    partial_file: path.join(outputRoot, "products-import.partial.json"),
  };
  await writeJson(path.join(outputRoot, "import-report.json"), report);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
