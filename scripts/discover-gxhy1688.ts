import fs from "node:fs/promises";
import path from "node:path";

type NetworkRecord = {
  index: number;
  url: string;
  status: number;
  resourceType: string;
  contentType: string;
  topLevelKeys: string[];
  containsArrays: boolean;
  imageUrlCount: number;
  sampleTextFields: string[];
  json: unknown;
};

function parseArgs() {
  const args = process.argv.slice(2);
  const getValue = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const url = getValue("--url");
  if (!url) {
    throw new Error('Missing --url "https://..."');
  }
  return {
    url,
    timeoutMs: Math.max(5000, Number(getValue("--timeout-ms") || 60000) || 60000),
    headed: args.includes("--headed"),
  };
}

function timestamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
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

function containsArray(value: unknown): boolean {
  if (Array.isArray(value)) return true;
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some(containsArray);
}

function collectImageUrls(value: unknown, output = new Set<string>()) {
  if (typeof value === "string") {
    if (/^https?:\/\//i.test(value) && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(value)) {
      output.add(value);
    }
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectImageUrls(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) collectImageUrls(item, output);
  }
  return output;
}

function sampleTextFields(value: unknown, output: string[] = []) {
  if (output.length >= 20) return output;
  if (typeof value === "string") {
    const clean = value.replace(/\s+/g, " ").trim();
    if (clean.length >= 2 && clean.length <= 160 && !/^https?:\/\//i.test(clean)) {
      output.push(clean);
    }
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 30)) sampleTextFields(item, output);
    return output;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) sampleTextFields(item, output);
  }
  return output;
}

function findProductLikeArrays(value: unknown, pathName = "root", output: unknown[] = []) {
  if (Array.isArray(value)) {
    const objectItems = value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
    if (objectItems.length > 0) {
      const sampleKeys = Object.keys(objectItems[0] || {});
      const keyText = sampleKeys.join(" ").toLowerCase();
      const hasProductKeys = /title|name|goods|product|item|sku|price|image|img|pic|cover|photo|id/.test(keyText);
      if (hasProductKeys) {
        output.push({
          path: pathName,
          length: objectItems.length,
          sample_keys: sampleKeys.slice(0, 40),
          sample_item: objectItems[0],
        });
      }
    }
    value.forEach((item, index) => findProductLikeArrays(item, `${pathName}[${index}]`, output));
    return output;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      findProductLikeArrays(child, pathName ? `${pathName}.${key}` : key, output);
    }
  }
  return output;
}

async function main() {
  const options = parseArgs();
  const outputRoot = path.join(process.cwd(), "imports", "gxhy1688", `debug-${timestamp()}`);
  const networkDir = path.join(outputRoot, "network");
  const browserHome = path.join(outputRoot, "browser-home");
  await fs.mkdir(networkDir, { recursive: true });
  await fs.mkdir(browserHome, { recursive: true });

  const records: NetworkRecord[] = [];
  const errors: string[] = [];
  let browser: any;

  try {
    await withTimeout((async () => {
      const loadModule = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<any>;
      const { chromium } = await loadModule("playwright");
      browser = await chromium.launch({
        headless: !options.headed,
        slowMo: options.headed ? 150 : 0,
        args: ["--disable-crash-reporter", "--disable-crashpad", "--no-sandbox"],
        env: {
          ...process.env,
          HOME: browserHome,
          XDG_CACHE_HOME: path.join(browserHome, ".cache"),
          XDG_CONFIG_HOME: path.join(browserHome, ".config"),
        },
      });
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 LM-Dkbrand-gxhy-discovery",
      });

      let index = 1;
      page.on("response", async (response: any) => {
        try {
          const headers = response.headers();
          const contentType = headers["content-type"] || "";
          const resourceType = response.request().resourceType();
          if (!["xhr", "fetch", "document"].includes(resourceType) && !/json|text|javascript/i.test(contentType)) {
            return;
          }
          const text = await response.text();
          const trimmed = text.trim();
          if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return;
          const json = JSON.parse(trimmed);
          const record: NetworkRecord = {
            index,
            url: response.url(),
            status: response.status(),
            resourceType,
            contentType,
            topLevelKeys: json && typeof json === "object" && !Array.isArray(json)
              ? Object.keys(json as Record<string, unknown>).slice(0, 40)
              : [],
            containsArrays: containsArray(json),
            imageUrlCount: collectImageUrls(json).size,
            sampleTextFields: Array.from(new Set(sampleTextFields(json))).slice(0, 20),
            json,
          };
          records.push(record);
          await fs.writeFile(path.join(networkDir, `response-${String(index).padStart(3, "0")}.json`), JSON.stringify(record, null, 2));
          index += 1;
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      });

      await page.goto(options.url, { waitUntil: "domcontentloaded", timeout: Math.min(options.timeoutMs, 15000) })
        .catch((error: unknown) => errors.push(`goto: ${error instanceof Error ? error.message : String(error)}`));

      const startedAt = Date.now();
      while (Date.now() - startedAt < options.timeoutMs) {
        await page.waitForTimeout(1000).catch(() => undefined);
        await page.evaluate("window.scrollBy(0, Math.round(window.innerHeight * 0.8))").catch(() => undefined);
        if (Date.now() - startedAt > options.timeoutMs) break;
      }

      await page.screenshot({ path: path.join(outputRoot, "page.png"), fullPage: true }).catch(() => undefined);
      await fs.writeFile(path.join(outputRoot, "page.html"), await page.content()).catch(() => undefined);
    })(), options.timeoutMs + 5000, `Discovery timed out after ${options.timeoutMs}ms`);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  } finally {
    await browser?.close().catch(() => undefined);
  }

  const productLikeArrays = records.flatMap((record) =>
    findProductLikeArrays(record.json).map((item) => ({
      response_index: record.index,
      response_url: record.url,
      ...item as Record<string, unknown>,
    }))
  );
  const summary = {
    source_url: options.url,
    output_folder: outputRoot,
    timeout_ms: options.timeoutMs,
    network_json_responses: records.length,
    responses: records.map((record) => ({
      index: record.index,
      url: record.url,
      status: record.status,
      resourceType: record.resourceType,
      contentType: record.contentType,
      topLevelKeys: record.topLevelKeys,
      containsArrays: record.containsArrays,
      imageUrlCount: record.imageUrlCount,
      sampleTextFields: record.sampleTextFields,
    })),
    product_like_arrays: productLikeArrays,
    errors,
  };
  await fs.writeFile(path.join(outputRoot, "gxhy1688-network-summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({
    output_folder: outputRoot,
    network_json_responses: records.length,
    product_like_arrays_found: productLikeArrays.length,
    errors,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
