import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { canonicalizeBrand } from "../lib/catalogTaxonomy.ts";

type ProductRow = Record<string, unknown> & {
  product_code: string;
  category?: string;
  title_en?: string;
  description_en?: string;
  source_title_cn?: string;
  source_description_cn?: string;
  cleaned_source_title_cn?: string;
  cleaned_source_description_cn?: string;
  image_folder?: string;
  main_image?: string;
  gallery_images?: string;
  main_thumbnail?: string;
  gallery_thumbnails?: string;
};

type Classification = {
  subcategory: string;
  brand: string;
  model: string;
  gender: string;
  color: string;
};

const batchDir = path.resolve(process.cwd(), "imports/wecatalog/clothing-test-2026-05-07-15-44");
const defaultInput = path.join(batchDir, "products-import.cleaned.translated.resolved.json");
const outputFile = path.join(batchDir, "products-import.ready-maFjsFK-bags-official-codes.json");
const lastFile = path.resolve(process.cwd(), ".last-maFjsFK-bags-ready-file");
const category = "Bags";
const prefix = "LM-BAG";

function loadEnvLocal(envPath = path.resolve(process.cwd(), ".env.local")) {
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ""), key };
}

function parseBagNumber(productCode: string) {
  const match = /^LM-BAG-(\d{4,})$/.exec(String(productCode || "").trim());
  return match ? Number(match[1]) : 0;
}

function formatProductCode(number: number) {
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

function collectCodes(value: unknown, out: string[]) {
  if (!value) return;
  if (typeof value === "string") {
    if (/^LM-BAG-\d{4,}$/.test(value)) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectCodes(item, out));
    return;
  }
  if (typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectCodes(item, out));
  }
}

function localMaxBagNumber() {
  const codes: string[] = [];

  try {
    const importsRoot = path.resolve(process.cwd(), "imports/wecatalog");
    for (const dir of readdirSync(importsRoot, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      if (path.resolve(importsRoot, dir.name) === batchDir) continue;
      const report = path.join(importsRoot, dir.name, "import-to-supabase-report.json");
      if (!existsSync(report)) continue;
      collectCodes(JSON.parse(readFileSync(report, "utf8")), codes);
    }
  } catch {
    // Local report fallback is best effort only.
  }

  try {
    const finalBags = path.resolve(process.cwd(), "classification-final-Bags.json");
    if (existsSync(finalBags)) collectCodes(JSON.parse(readFileSync(finalBags, "utf8")), codes);
  } catch {
    // Local report fallback is best effort only.
  }

  return Math.max(0, ...codes.map(parseBagNumber));
}

async function fetchCurrentMaxBagNumber() {
  const config = supabaseConfig();
  if (!config) {
    return { max: localMaxBagNumber(), source: "local_reports_no_supabase_env" };
  }

  const { url, key } = config;
  const query = new URL(`${url}/rest/v1/products`);
  query.searchParams.set("select", "product_code");
  query.searchParams.set("category", `eq.${category}`);
  query.searchParams.set("product_code", "like.LM-BAG-*");
  query.searchParams.set("limit", "10000");

  const response = await fetch(query, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!response.ok) throw new Error(`Supabase read failed: ${await response.text()}`);

  const rows = await response.json() as Array<{ product_code?: string }>;
  return { max: Math.max(0, ...rows.map((row) => parseBagNumber(row.product_code || ""))), source: "supabase" };
}

function textFor(product: ProductRow) {
  return [
    product.title_en,
    product.description_en,
    product.source_title_cn,
    product.cleaned_source_title_cn,
    product.source_description_cn,
    product.cleaned_source_description_cn,
  ].map((value) => String(value || "")).join(" ");
}

function includesAny(text: string, patterns: Array<string | RegExp>) {
  return patterns.some((pattern) => typeof pattern === "string" ? text.includes(pattern.toLowerCase()) : pattern.test(text));
}

function classifyBrand(text: string) {
  const rules: Array<[string, Array<string | RegExp>]> = [
    ["Miu Miu", ["miu miu", "miumiu", /miu\s*miu/i]],
    ["Saint Laurent", ["saint laurent", "ysl"]],
    ["Louis Vuitton", ["louis vuitton", "lv"]],
    ["Bottega Veneta", ["bottega veneta", "bottega"]],
    ["Dior", ["dior"]],
    ["Hermes", ["hermes", "hermès"]],
    ["Chanel", ["chanel"]],
    ["Gucci", ["gucci"]],
    ["Prada", ["prada"]],
    ["Celine", ["celine", "céline"]],
    ["Loewe", ["loewe"]],
    ["Balenciaga", ["balenciaga"]],
    ["Fendi", ["fendi"]],
    ["Goyard", ["goyard"]],
  ];
  return canonicalizeBrand(rules.find(([, patterns]) => includesAny(text, patterns))?.[0] || "") || "Other / Unknown";
}

function classifyModel(text: string) {
  const rules: Array<[string, Array<string | RegExp>]> = [
    ["C'est Dior", ["c'est dior", "cest dior", "c’est dior"]],
    ["Lady Dior", ["lady dior"]],
    ["Dior Caro", ["dior caro", "caro"]],
    ["LE 37", ["le 37", "le37"]],
    ["Book Tote", ["book tote"]],
    ["Neverfull", ["neverfull"]],
    ["Speedy", ["speedy"]],
    ["Keepall", ["keepall"]],
    ["Puzzle", ["puzzle"]],
    ["Birkin", ["birkin"]],
    ["Kelly", ["kelly"]],
    ["LouLou", ["loulou", "lou lou"]],
    ["Saddle", ["saddle", "马鞍"]],
    ["Jackie", ["jackie"]],
    ["Marmont", ["marmont"]],
  ];
  return rules.find(([, patterns]) => includesAny(text, patterns))?.[0] || "Other / Unknown";
}

function classifySubcategory(text: string) {
  if (includesAny(text, ["wallet", "card holder", "cardholder", "coin purse", "钱包", "卡包"])) return "Wallets & Small Leather Goods";
  if (includesAny(text, ["backpack", "双肩", "双肩包"])) return "Backpacks";
  if (includesAny(text, ["clutch", "pouch", "evening bag", "手拿"])) return "Clutches";
  if (includesAny(text, ["bucket", "水桶"])) return "Bucket Bags";
  if (includesAny(text, ["book tote", "tote", "shopping bag", "shopper", "托特"])) return "Tote Bags";
  if (includesAny(text, ["saddle", "马鞍"])) return "Saddle Bags";
  if (includesAny(text, ["crossbody", "斜挎", "messenger"])) return "Crossbody Bags";
  if (includesAny(text, ["shoulder", "underarm", "hobo", "单肩", "腋下"])) return "Shoulder Bags";
  if (includesAny(text, ["handbag", "top handle", "handle bag", "birkin", "kelly", "lady dior", "speedy", "jackie", "marmont", "手提"])) return "Handbags";
  return "Bags";
}

function classifyColor(text: string) {
  const rules: Array<[string, Array<string | RegExp>]> = [
    ["Black", ["black", "黑"]],
    ["White", ["white", "白"]],
    ["Brown", ["brown", "咖啡", "棕"]],
    ["Beige", ["beige", "米", "杏", "khaki", "卡其"]],
    ["Red", ["red", "红"]],
    ["Pink", ["pink", "粉"]],
    ["Blue", ["blue", "蓝"]],
    ["Green", ["green", "绿"]],
    ["Gray", ["gray", "grey", "灰"]],
    ["Gold", ["gold", "金"]],
    ["Silver", ["silver", "银"]],
    ["Yellow", ["yellow", "黄"]],
    ["Purple", ["purple", "紫"]],
    ["Orange", ["orange", "橙"]],
  ];
  return rules.find(([, patterns]) => includesAny(text, patterns))?.[0] || "Other / Unknown";
}

function classifyProduct(product: ProductRow): Classification {
  const text = textFor(product).toLowerCase();
  return {
    subcategory: classifySubcategory(text),
    brand: classifyBrand(text),
    model: classifyModel(text),
    gender: "Unisex",
    color: classifyColor(text),
  };
}

function replaceCodeInValue(value: unknown, oldCode: string, newCode: string) {
  if (typeof value !== "string") return value;
  return value.replaceAll(`images/${oldCode}`, `images/${newCode}`).replaceAll(oldCode.toLowerCase(), newCode.toLowerCase()).replaceAll(oldCode, newCode);
}

function rewriteProductPaths(product: ProductRow, oldCode: string, newCode: string) {
  const next: ProductRow = { ...product };
  for (const key of Object.keys(next)) {
    next[key] = replaceCodeInValue(next[key], oldCode, newCode);
  }
  next.image_folder = `images/${newCode}`;
  next.main_image = `images/${newCode}/display/01.webp`;
  next.gallery_images = Array.from({ length: 9 }, (_, index) => `images/${newCode}/display/${String(index + 1).padStart(2, "0")}.webp`).join("|");
  next.main_thumbnail = `images/${newCode}/thumbs/01.webp`;
  next.gallery_thumbnails = Array.from({ length: 9 }, (_, index) => `images/${newCode}/thumbs/${String(index + 1).padStart(2, "0")}.webp`).join("|");
  next.image_count = 9;
  return next;
}

function copyImageFolder(oldCode: string, newCode: string) {
  const source = path.join(batchDir, "images", oldCode);
  const target = path.join(batchDir, "images", newCode);
  if (!existsSync(source)) throw new Error(`Missing source image folder: ${source}`);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true, force: true });
}

function countBy(rows: ProductRow[], key: string) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const label = String(row[key] || "Other / Unknown");
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  loadEnvLocal();
  const input = process.argv.includes("--input")
    ? process.argv[process.argv.indexOf("--input") + 1]
    : defaultInput;
  const inputPath = path.resolve(process.cwd(), input);
  const rows = JSON.parse(readFileSync(inputPath, "utf8")) as ProductRow[];
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`No products found in ${inputPath}`);

  const maxBag = await fetchCurrentMaxBagNumber();
  const startNumber = maxBag.max + 1;
  const ready = rows.map((product, index) => {
    const oldCode = String(product.product_code || "");
    const newCode = formatProductCode(startNumber + index);
    copyImageFolder(oldCode, newCode);
    const classification = classifyProduct(product);
    return {
      ...rewriteProductPaths(product, oldCode, newCode),
      product_code: newCode,
      slug: newCode.toLowerCase(),
      category,
      ...classification,
    };
  });

  writeFileSync(outputFile, `${JSON.stringify(ready, null, 2)}\n`);
  writeFileSync(lastFile, `${outputFile}\n`);

  const summary = {
    input_file: inputPath,
    ready_file: outputFile,
    max_bag_number_source: maxBag.source,
    max_bag_number: maxBag.max,
    products: ready.length,
    product_code_start: ready[0]?.product_code || "",
    product_code_end: ready[ready.length - 1]?.product_code || "",
    classification: {
      subcategory: countBy(ready, "subcategory"),
      brand: countBy(ready, "brand"),
      model: countBy(ready, "model"),
      gender: countBy(ready, "gender"),
      color: countBy(ready, "color"),
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
