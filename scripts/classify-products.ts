import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

type Category = "Apparel" | "Shoes" | "Bags" | "Watches";

type ProductRow = {
  product_code: string;
  category: string;
  title_en?: string | null;
  title_cn?: string | null;
  source_title_cn?: string | null;
  description_en?: string | null;
  description_cn?: string | null;
  source_description_cn?: string | null;
  main_thumbnail_url?: string | null;
};

type Classification = {
  product_code: string;
  category: Category;
  subcategory: string;
  brand: string;
  model: string;
  gender: string;
  color: string;
  confidence: number;
  reason: string;
  provider: "rules" | "kimi";
  kimi_required: boolean;
  kimi_required_reasons: string[];
};

type Options = {
  category: Category;
  dryRun: boolean;
  provider: string;
  kimiModel: string;
  batchSize: number;
  onlyLowConfidence: boolean;
};

const categories: Category[] = ["Apparel", "Shoes", "Bags", "Watches"];
const LOW_CONFIDENCE_THRESHOLD = 0.7;

function loadEnvLocal(envPath = path.resolve(process.cwd(), ".env.local")) {
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
    // Missing local env is reported when Supabase variables are validated.
  }
}

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function hasFlag(name: string) {
  return process.argv.includes(name);
}

function readOptions(): Options {
  const category = getArg("--category") || "Apparel";
  if (!categories.includes(category as Category)) {
    throw new Error(`--category must be one of: ${categories.join(", ")}`);
  }

  return {
    category: category as Category,
    dryRun: hasFlag("--dry-run"),
    provider: getArg("--provider") || "kimi",
    kimiModel: getArg("--kimi-model") || "tencentcodingplan/kimi-k2.5",
    batchSize: Math.max(1, Number(getArg("--batch-size") || 30) || 30),
    onlyLowConfidence: hasFlag("--only-low-confidence"),
  };
}

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!url || !key) {
    throw new Error("Missing Supabase env vars. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
  }
  return { url, key };
}

function readSourceCacheProducts(category: Category): ProductRow[] {
  const filePath = path.resolve(process.cwd(), `classification-source-cache-${category}.json`);
  if (!existsSync(filePath)) return [];

  try {
    const data = JSON.parse(readFileSync(filePath, "utf8")) as { products?: ProductRow[] };
    return (data.products || []).filter((product) => product.product_code && product.category === category);
  } catch {
    return [];
  }
}

async function fetchProducts(category: Category) {
  const { url, key } = supabaseConfig();
  const select = [
    "product_code",
    "category",
    "title_en",
    "description_en",
    "source_title_cn",
    "source_description_cn",
    "main_thumbnail_url",
  ].join(",");
  const rows: ProductRow[] = [];
  const pageSize = 1000;

  for (let offset = 0; ; offset += pageSize) {
    const response = await fetch(
      `${url}/rest/v1/products?select=${select}&category=eq.${encodeURIComponent(category)}&status=eq.published&is_active=eq.true&order=product_code.asc&offset=${offset}&limit=${pageSize}`,
      {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      },
    );

    if (!response.ok) throw new Error(`Supabase read failed: ${await response.text()}`);

    const batch = (await response.json()) as ProductRow[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }

  const cachePath = path.resolve(process.cwd(), `classification-source-cache-${category}.json`);
  writeFileSync(cachePath, JSON.stringify({ category, cached_at: new Date().toISOString(), products: rows }, null, 2));
  return rows;
}

async function fetchProductsWithCacheFallback(category: Category) {
  try {
    return await fetchProducts(category);
  } catch (error) {
    const cached = readSourceCacheProducts(category);
    if (cached.length > 0) {
      console.warn(`Supabase read failed, using cached classification-source-cache-${category}.json for dry-run only.`);
      return cached;
    }
    throw error;
  }
}

function textOf(product: ProductRow) {
  return [
    product.title_en,
    product.source_title_cn,
    product.title_cn,
    product.description_en,
    product.source_description_cn,
    product.description_cn,
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAny(text: string, rules: Array<[string, RegExp[]]>, fallback: string) {
  for (const [label, patterns] of rules) {
    if (patterns.some((pattern) => pattern.test(text))) return label;
  }
  return fallback;
}

function matchesRule(text: string, label: string) {
  const rule = bagsRules.find(([ruleLabel]) => ruleLabel === label);
  return Boolean(rule && rule[1].some((pattern) => pattern.test(text)));
}

function classifyBagSubcategory(titleText: string, fullText: string) {
  for (const text of [titleText, fullText]) {
    const hasSpeedy = /\bspeedy\s*30?\b|\bspeedy\b/i.test(text);
    const hasTravelSpeedySignal = /\btravel\b|\bkeepall\b|\bbandouli[eè]re\b|旅行|行李/i.test(text);

    if (hasSpeedy && hasTravelSpeedySignal) return "Travel Bags";
    if (matchesRule(text, "Wallets & Cardholders")) return "Wallets & Cardholders";
    if (matchesRule(text, "Travel Bags")) return "Travel Bags";
    if (matchesRule(text, "Crossbody & Shoulder Bags")) return "Crossbody & Shoulder Bags";
    if (matchesRule(text, "Tote Bags")) return "Tote Bags";
    if (matchesRule(text, "Backpacks")) return "Backpacks";
    if (matchesRule(text, "Handbags")) return "Handbags";
    if (/\bbag\b|包/i.test(text)) return "Handbags";
  }
  return "Other Bags";
}

function unknownSubcategoryFor(category: Category) {
  return category === "Apparel"
    ? "Other Apparel"
    : category === "Shoes"
      ? "Other Shoes"
      : category === "Bags"
        ? "Other Bags"
        : "Other / Unknown";
}

function isUnknownSubcategory(subcategory: string) {
  return subcategory.startsWith("Other ") || subcategory === "Other / Unknown";
}

const apparelRules: Array<[string, RegExp[]]> = [
  ["T-Shirts", [/\bt-?shirt\b/i, /\btee\b/i, /短袖|T恤/i]],
  ["Shirts", [/\bshirt\b/i, /衬衣|衬衫/i]],
  ["Hoodies & Sweatshirts", [/\bhoodie\b/i, /\bsweatshirt\b/i, /卫衣/i]],
  ["Shorts", [/\bshorts\b/i, /短裤/i]],
  ["Jackets & Coats", [/\bjacket\b/i, /\bcoat\b/i, /夹克|外套/i]],
  ["Sweaters & Knitwear", [/\bsweater\b/i, /\bknitwear\b/i, /\bknit\s+top\b/i, /毛衣|针织衫|针织上衣/i]],
  ["Pants", [/\bpants\b/i, /\btrousers\b/i, /长裤|(?<!短)裤/i]],
  ["Sets", [/\bset\b/i, /套装|可配套/i]],
];

const shoesRules: Array<[string, RegExp[]]> = [
  ["Sneakers", [/\bsneakers?\b/i, /\btrainers?\b/i, /\brunners?\b/i, /运动鞋|老爹鞋|板鞋|跑鞋/i]],
  ["Slides & Sandals", [/\bslides?\b/i, /\bslippers?\b/i, /\bsandals?\b/i, /拖鞋|凉鞋/i]],
  ["Boots", [/\bboots?\b/i, /靴/i]],
  ["Loafers", [/\bloafers?\b/i, /乐福鞋/i]],
];

const bagsRules: Array<[string, RegExp[]]> = [
  ["Crossbody & Shoulder Bags", [
    /\bcrossbody\b/i,
    /\bshoulder\b/i,
    /\bsaddle\b/i,
    /\bbesace\b/i,
    /\bbaguette\b/i,
    /\bunderarm\b/i,
    /\bhobo\b/i,
    /\bchest\s+bag\b/i,
    /\bwaist\s+bag\b/i,
    /\bbelt\s+bag\b/i,
    /\bbox\s+bag\b/i,
    /\bretro\s+box\s+bag\b/i,
    /\bflap\b/i,
    /\baccordion\s+bag\b/i,
    /\bnolita\b/i,
    /\bmahjong\s+bag\b/i,
    /\brodeo\b/i,
    /\btrail\s+retro\s+box\s+bag\b/i,
    /斜挎|单肩/i,
  ]],
  ["Tote Bags", [
    /\btote\b/i,
    /\bshopping\s+bag\b/i,
    /\bshopper\b/i,
    /\bdrawstring\s+large\s+tote\b/i,
    /\blarge\s+tote\b/i,
    /托特/i,
  ]],
  ["Backpacks", [/\bbackpack\b/i, /双肩包/i]],
  ["Handbags", [
    /\bhandbag\b/i,
    /\btop\s+handle\b/i,
    /\bhandle\s+bag\b/i,
    /\bboston\s+bag\b/i,
    /\bbowling\s+bag\b/i,
    /\bbriefcase\b/i,
    /\bpillow\s+bag\b/i,
    /\bbucket\s+bag\b/i,
    /\btoast\s+bag\b/i,
    /\brogue\s+bag\b/i,
    /\bkelly\b/i,
    /\bbirkin\b/i,
    /\bmanhattan\b/i,
    /\bmarmont\b/i,
    /\bleboy\b/i,
    /\bchanel\s*25\b/i,
    /\bchanel\s*31\b/i,
    /\bemory\b/i,
    /\bkay\s*20\b/i,
    /\bbridget\b/i,
    /\bbucket\b/i,
    /\bmiu\s*miu\s+bucket\b/i,
    /\brhinestone\s+bucket\b/i,
    /\bsmall\s+leather\s+bag\b/i,
    /\bpuzzle\b/i,
    /\bcoussin\b/i,
    /\bside\s+trunk\b/i,
    /\btrunk\s+bag\b/i,
    /\bjumbo\b/i,
    /\bbasket\b/i,
    /\bclutch\b/i,
    /\bpouch\b/i,
    /\bevening\s+bag\b/i,
    /\bspeedy\s*30?\b/i,
    /\bspeedy\b/i,
    /手提/i,
  ]],
  ["Wallets & Cardholders", [/\bwallet\b/i, /\bcard\s*holder\b/i, /\bcardholder\b/i, /\bcoin\s+purse\b/i, /\blong\s+wallet\b/i, /钱包|卡包/i]],
  ["Travel Bags", [/\btravel\b/i, /\bduffle(?:\s+bag)?\b/i, /\bkeepall\b/i, /\bkeepall\s+bandouli[eè]re\b/i, /\bluggage\b/i, /旅行|行李/i]],
];

function classifyWatchSubcategory(titleText: string, fullText: string) {
  const title = titleText || fullText;
  const clearFullWatchModel = /\bdaytona\b|\bsubmariner\b|\bdatejust\b|\btank\b|\bsantos\b|\broyal\s+oak\b|\bnautilus\b|\baquanaut\b/i.test(title);
  const accessorySignal = /\bstrap\b|\bwatch\s+box\b|\bbox\b|表带|配件/i.test(title) ||
    (/\bbracelet\b/i.test(title) && !clearFullWatchModel);

  if (accessorySignal && !clearFullWatchModel) return "Watch Accessories";
  if (/\bdaytona\b|\bchronograph\b|计时|码表/i.test(fullText)) return "Chronograph Watches";
  if (/\bsubmariner\b|\bdiver\b|\bdiving\b|潜水/i.test(fullText)) return "Diver Watches";
  if (/\bdatejust\b|\bdress\b|\bformal\b|\btank\b|\bsantos\b|正装/i.test(fullText)) return "Dress Watches";
  if (/\bsports?\b|\broyal\s+oak\b|\bnautilus\b|\baquanaut\b|运动/i.test(fullText)) return "Sports Watches";
  if (/\bcouple\b|\bpair\b|情侣/i.test(fullText)) return "Couple Watches";
  if (/\bquartz\b|石英/i.test(fullText)) return "Quartz Watches";
  if (/\bautomatic\b|\bmechanical\b|机械|自动机械/i.test(fullText)) return "Automatic Watches";
  return "Other / Unknown";
}

const brandRules: Array<[string, RegExp[]]> = [
  ["LV", [/\bLV\b/i, /Louis\s+Vuitton/i, /路易威登/i]],
  ["Dior", [/\bDior\b/i]],
  ["Prada", [/\bPrada\b/i]],
  ["Gucci", [/\bGucci\b/i, /古驰/i]],
  ["Chanel", [/\bChanel\b/i, /香奈儿/i]],
  ["Loewe", [/\bLoewe\b/i]],
  ["Celine", [/\bCeline\b/i]],
  ["Hermes", [/\bHerm[eè]s\b/i, /爱马仕/i]],
  ["Fendi", [/\bFendi\b/i]],
  ["Balenciaga", [/\bBalenciaga\b/i]],
  ["Amiri", [/\bAmiri\b/i]],
  ["Arcteryx", [/\bArc'?teryx\b/i, /始祖鸟/i]],
  ["Adidas", [/\bAdidas\b/i]],
  ["Nike", [/\bNike\b/i]],
  ["New Balance", [/\bNew\s+Balance\b/i, /\bNB\b/i]],
  ["Coach", [/\bCoach\b/i]],
  ["Tory Burch", [/\bTory\s+Burch\b/i]],
  ["Goyard", [/\bGoyard\b/i]],
  ["MiuMiu", [/\bMiu\s*Miu\b/i]],
  ["Brunello Cucinelli", [/\bBrunello\s+Cucinelli\b/i]],
  ["Loro Piana", [/\bLoro\s+Piana\b/i, /\bLP\b/i]],
  ["Burberry", [/\bBurberry\b/i]],
  ["Moncler", [/\bMoncler\b/i]],
  ["Zegna", [/\bZegna\b/i]],
  ["Bottega", [/\bBottega\b/i]],
  ["YSL", [/\bYSL\b/i, /Saint\s+Laurent/i]],
  ["Valentino", [/\bValentino\b/i]],
  ["Rolex", [/\bRolex\b/i, /劳力士/i]],
  ["Omega", [/\bOmega\b/i, /欧米茄/i]],
  ["Cartier", [/\bCartier\b/i, /卡地亚/i]],
  ["Patek Philippe", [/\bPatek\s+Philippe\b/i, /百达翡丽/i]],
  ["Audemars Piguet", [/\bAudemars\s+Piguet\b/i, /\bAP\b/i, /爱彼/i]],
  ["Richard Mille", [/\bRichard\s+Mille\b/i, /\bRM\b/i, /理查德米勒/i]],
  ["Vacheron Constantin", [/\bVacheron\s+Constantin\b/i, /江诗丹顿/i]],
  ["IWC", [/\bIWC\b/i, /万国/i]],
  ["Jaeger-LeCoultre", [/\bJaeger[-\s]?LeCoultre\b/i, /\bJLC\b/i, /积家/i]],
  ["Panerai", [/\bPanerai\b/i, /沛纳海/i]],
  ["Tudor", [/\bTudor\b/i, /帝舵/i]],
  ["Tag Heuer", [/\bTag\s+Heuer\b/i, /泰格豪雅/i]],
  ["Hublot", [/\bHublot\b/i, /宇舶/i]],
  ["Breitling", [/\bBreitling\b/i, /百年灵/i]],
  ["Longines", [/\bLongines\b/i, /浪琴/i]],
];

const modelRules: Array<[string, RegExp[]]> = [
  ["Trainer", [/\btrainer\b/i]],
  ["Runner", [/\brunner\b/i]],
  ["Tatic", [/\btatic\b/i]],
  ["B30", [/\bB30\b/i]],
  ["B27", [/\bB27\b/i]],
  ["Speedy", [/\bspeedy\b/i]],
  ["Neverfull", [/\bneverfull\b/i]],
  ["Keepall", [/\bkeepall\b/i]],
  ["Puzzle", [/\bpuzzle\b/i]],
  ["Book Tote", [/\bbook\s+tote\b/i]],
  ["Submariner", [/\bsubmariner\b/i]],
  ["Datejust", [/\bdatejust\b/i]],
  ["Daytona", [/\bdaytona\b/i]],
  ["Seamaster", [/\bseamaster\b/i]],
  ["Speedmaster", [/\bspeedmaster\b/i]],
  ["Royal Oak", [/\broyal\s+oak\b/i]],
  ["Nautilus", [/\bnautilus\b/i]],
  ["Aquanaut", [/\baquanaut\b/i]],
  ["Tank", [/\btank\b/i]],
  ["Santos", [/\bsantos\b/i]],
  ["Big Bang", [/\bbig\s+bang\b/i]],
];

function classifyWithRules(product: ProductRow, category: Category): Classification {
  const text = textOf(product);
  const titleText = String(product.title_en || product.source_title_cn || product.title_cn || "")
    .replace(/\s+/g, " ")
    .trim();
  const secondaryTitleText = [product.source_title_cn, product.title_cn]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const lower = text.toLowerCase();
  const subcategory = category === "Apparel"
    ? matchAny(text, apparelRules, "Other Apparel")
    : category === "Shoes"
      ? matchAny(text, shoesRules, "Other Shoes")
      : category === "Bags"
        ? classifyBagSubcategory(titleText, secondaryTitleText || text)
        : classifyWatchSubcategory(titleText, text);
  const brand = matchAny(text, brandRules, "Other / Unknown");
  const model = matchAny(text, modelRules, "Other / Unknown");
  const shortTitle = String(product.title_en || product.source_title_cn || "").trim().length < 12;
  const brandHits = brandRules.filter(([, patterns]) => patterns.some((pattern) => pattern.test(text))).length;
  const modelHits = modelRules.filter(([, patterns]) => patterns.some((pattern) => pattern.test(text))).length;
  const unknownSubcategory = isUnknownSubcategory(subcategory);
  const unknownBrand = brand === "Other / Unknown";
  const conflict = brandHits > 1 || modelHits > 1 || (/\bshoe\b/i.test(lower) && category !== "Shoes");
  let confidence = 0.92;

  if (unknownSubcategory) confidence -= 0.28;
  if (unknownBrand && unknownSubcategory) confidence -= 0.12;
  if (shortTitle) confidence -= 0.12;
  if (conflict) confidence -= 0.25;
  confidence = Math.max(0.1, Math.min(0.99, Number(confidence.toFixed(2))));

  const shortTitleWithUnclearSubcategory = shortTitle && unknownSubcategory;
  const kimiRequiredReasons = [
    unknownSubcategory ? "unknown_subcategory" : "",
    confidence < LOW_CONFIDENCE_THRESHOLD ? "low_confidence" : "",
    conflict ? "rule_conflict" : "",
    shortTitleWithUnclearSubcategory ? "short_title_unclear_subcategory" : "",
  ].filter(Boolean);
  const kimiRequired = kimiRequiredReasons.length > 0;
  const reasons = [
    unknownSubcategory ? "subcategory unknown" : `subcategory matched ${subcategory}`,
    unknownBrand ? "brand unknown" : `brand matched ${brand}`,
    model === "Other / Unknown" ? "model unknown, ignored for Kimi routing" : `model matched ${model}`,
    shortTitle ? "short title" : "",
    conflict ? "keyword conflict" : "",
  ].filter(Boolean);

  return {
    product_code: product.product_code,
    category,
    subcategory,
    brand,
    model,
    gender: "Unisex",
    color: "Other / Unknown",
    confidence,
    reason: reasons.join("; "),
    provider: "rules",
    kimi_required: kimiRequired,
    kimi_required_reasons: kimiRequiredReasons,
  };
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filePath: string, rows: Array<Record<string, unknown>>) {
  const headers = [
    "product_code",
    "category",
    "subcategory",
    "brand",
    "model",
    "gender",
    "color",
    "confidence",
    "provider",
    "kimi_required",
    "kimi_required_reasons",
    "reason",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const label = String(row[key] || "Unknown");
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function sampleBySubcategory(products: ProductRow[], classifications: Classification[]) {
  const byCode = new Map(products.map((product) => [product.product_code, product]));
  const result: Record<string, Array<Record<string, string>>> = {};

  for (const item of classifications) {
    if (!result[item.subcategory]) result[item.subcategory] = [];
    if (result[item.subcategory].length >= 5) continue;
    const product = byCode.get(item.product_code);
    result[item.subcategory].push({
      product_code: item.product_code,
      title: String(product?.title_en || product?.source_title_cn || ""),
    });
  }

  return result;
}

function kimiReasonDistribution(classifications: Classification[]) {
  return classifications.reduce<Record<string, number>>((acc, item) => {
    for (const reason of item.kimi_required_reasons) {
      acc[reason] = (acc[reason] || 0) + 1;
    }
    return acc;
  }, {});
}

function isBrandUnknownOnly(item: Classification) {
  return item.brand === "Other / Unknown" &&
    !isUnknownSubcategory(item.subcategory) &&
    item.confidence >= LOW_CONFIDENCE_THRESHOLD &&
    item.kimi_required_reasons.length === 0;
}

function suspectedMisclassifiedSamples(products: ProductRow[], classifications: Classification[]) {
  const byCode = new Map(products.map((product) => [product.product_code, product]));
  const samples: Array<Record<string, string>> = [];

  for (const item of classifications) {
    const product = byCode.get(item.product_code);
    const text = textOf(product || ({ product_code: item.product_code, category: item.category } as ProductRow));
    const hasShorts = /\bshorts\b|短裤/i.test(text);
    const hasPants = /\bpants\b|\btrousers\b|长裤|(?<!短)裤/i.test(text);
    const hasJacket = /\bjacket\b|\bcoat\b|夹克|外套/i.test(text);
    const hasSweater = /\bsweater\b|\bknitwear\b|\bknit\s+top\b|毛衣|针织衫|针织上衣/i.test(text);
    const hasLooseKnit = /\bknit\b|针织/i.test(text);
    const title = String(product?.title_en || product?.source_title_cn || product?.title_cn || "");
    const hasDaytona = /\bdaytona\b/i.test(text);
    const hasSubmariner = /\bsubmariner\b/i.test(text);
    const hasDatejust = /\bdatejust\b/i.test(text);
    const accessoryOnlyWords = /\bstrap\b|\bwatch\s+box\b|\bbox\b|表带|配件/i.test(title);
    const looksCompleteWatch = /\bdaytona\b|\bsubmariner\b/i.test(title) &&
      (/\bwatch\b|\bautomatic\b|\bmechanical\b|\bsteel\b|\bdial\b|\bcase\b|机械|自动机械/i.test(title));
    const isSuspicious =
      (item.subcategory === "Pants" && hasShorts) ||
      (item.subcategory === "Sweaters & Knitwear" && (hasJacket || (hasLooseKnit && !hasSweater))) ||
      (item.subcategory === "Jackets & Coats" && hasSweater && !hasJacket) ||
      (item.subcategory === "Shorts" && hasPants && !hasShorts) ||
      (item.category === "Watches" && hasDaytona && item.subcategory !== "Chronograph Watches") ||
      (item.category === "Watches" && hasSubmariner && item.subcategory !== "Diver Watches") ||
      (item.category === "Watches" && hasDatejust && !["Dress Watches", "Watch Accessories"].includes(item.subcategory)) ||
      (item.category === "Watches" && item.subcategory === "Watch Accessories" && looksCompleteWatch && !accessoryOnlyWords);

    if (!isSuspicious) continue;
    samples.push({
      product_code: item.product_code,
      subcategory: item.subcategory,
      title: String(product?.title_en || product?.source_title_cn || ""),
      reason: item.reason,
    });
    if (samples.length >= 30) break;
  }

  return samples;
}

const unknownBagKeywordPatterns: Array<[string, RegExp]> = [
  ["basket bag", /\bbasket\s+bag\b/i],
  ["top handle", /\btop\s+handle\b/i],
  ["shopping", /\bshopping\b/i],
  ["shopper", /\bshopper\b/i],
  ["bag", /\bbags?\b/i],
  ["mini", /\bmini\b/i],
  ["small", /\bsmall\b/i],
  ["large", /\blarge\b/i],
  ["size", /\bsize\b/i],
  ["cm", /\bcm\b/i],
  ["chain", /\bchain\b/i],
  ["leather", /\bleather\b/i],
  ["canvas", /\bcanvas\b/i],
  ["denim", /\bdenim\b/i],
  ["bucket", /\bbucket\b/i],
  ["hobo", /\bhobo\b/i],
  ["saddle", /\bsaddle\b/i],
  ["besace", /\bbesace\b/i],
  ["bowling", /\bbowling\b/i],
  ["boston", /\bboston\b/i],
  ["tote", /\btote\b/i],
  ["clutch", /\bclutch\b/i],
  ["pouch", /\bpouch\b/i],
  ["waist", /\bwaist\b/i],
  ["chest", /\bchest\b/i],
  ["crossbody", /\bcrossbody\b/i],
  ["shoulder", /\bshoulder\b/i],
  ["flap", /\bflap\b/i],
  ["box", /\bbox\b/i],
  ["briefcase", /\bbriefcase\b/i],
  ["handle", /\bhandle\b/i],
  ["backpack", /\bbackpack\b/i],
  ["wallet", /\bwallet\b/i],
  ["card", /\bcard\b/i],
  ["keepall", /\bkeepall\b/i],
  ["speedy", /\bspeedy\b/i],
  ["kelly", /\bkelly\b/i],
  ["birkin", /\bbirkin\b/i],
  ["rodeo", /\brodeo\b/i],
  ["drawstring", /\bdrawstring\b/i],
  ["accordion", /\baccordion\b/i],
  ["pillow", /\bpillow\b/i],
  ["baguette", /\bbaguette\b/i],
  ["messenger", /\bmessenger\b/i],
  ["camera", /\bcamera\b/i],
  ["vanity", /\bvanity\b/i],
  ["makeup", /\bmakeup\b/i],
  ["cosmetic", /\bcosmetic\b/i],
  ["beauty", /\bbeauty\b/i],
  ["basket", /\bbasket\b/i],
  ["sling", /\bsling\b/i],
  ["underarm", /\bunderarm\b/i],
];

function titleForProduct(product: ProductRow | undefined) {
  return String(product?.title_en || product?.source_title_cn || product?.title_cn || "");
}

function unknownBagAnalysis(products: ProductRow[], classifications: Classification[]) {
  const byCode = new Map(products.map((product) => [product.product_code, product]));
  const unknownBags = classifications.filter((item) => item.category === "Bags" && isUnknownSubcategory(item.subcategory));
  const keywordFrequency: Record<string, number> = {};
  const titleSamplesByKeyword: Record<string, Array<{ product_code: string; title: string }>> = {};

  for (const item of unknownBags) {
    const product = byCode.get(item.product_code);
    const title = titleForProduct(product);
    for (const [keyword, pattern] of unknownBagKeywordPatterns) {
      if (!pattern.test(title)) continue;
      keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
      if (!titleSamplesByKeyword[keyword]) titleSamplesByKeyword[keyword] = [];
      if (titleSamplesByKeyword[keyword].length < 5) {
        titleSamplesByKeyword[keyword].push({ product_code: item.product_code, title });
      }
    }
  }

  return {
    unknown_keyword_frequency: Object.fromEntries(
      Object.entries(keywordFrequency).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    ),
    unknown_title_samples_by_keyword: Object.fromEntries(
      Object.entries(titleSamplesByKeyword).sort((a, b) => (keywordFrequency[b[0]] || 0) - (keywordFrequency[a[0]] || 0) || a[0].localeCompare(b[0])),
    ),
    unknown_brand_distribution: countBy(unknownBags, "brand"),
    unknown_model_distribution: countBy(unknownBags, "model"),
  };
}

function kimiInput(products: ProductRow[], classifications: Classification[], options: Options) {
  const byCode = new Map(products.map((product) => [product.product_code, product]));
  const targets = classifications
    .filter((item) => item.kimi_required || !options.onlyLowConfidence)
    .filter((item) => item.kimi_required)
    .map((item) => {
      const product = byCode.get(item.product_code);
      return {
        product_code: item.product_code,
        category: item.category,
        title_en: product?.title_en || "",
        title_cn: product?.title_cn || product?.source_title_cn || "",
        description_en: product?.description_en || "",
        description_cn: product?.description_cn || product?.source_description_cn || "",
        main_thumbnail_url: product?.main_thumbnail_url || "",
        current_rule_guess: {
          subcategory: item.subcategory,
          brand: item.brand,
          model: item.model,
          gender: item.gender,
          confidence: item.confidence,
          reason: item.reason,
          kimi_required_reasons: item.kimi_required_reasons,
        },
      };
    });

  const batches = [];
  for (let index = 0; index < targets.length; index += options.batchSize) {
    batches.push({
      batch_index: batches.length + 1,
      model: options.kimiModel,
      expected_output: "strict JSON array of classification objects",
      products: targets.slice(index, index + options.batchSize),
    });
  }

  return {
    provider: options.provider,
    kimi_model: options.kimiModel,
    batch_size: options.batchSize,
    output_format: {
      product_code: "LM-APP-0001",
      category: options.category,
      subcategory: "T-Shirts",
      brand: "LV",
      model: "Other / Unknown",
      gender: "Unisex",
      confidence: 0.86,
      reason: "Title contains short sleeve T-shirt and LV keyword",
    },
    batches,
  };
}

function mergeKimiIfAvailable(category: Category, classifications: Classification[]) {
  const filePath = path.resolve(process.cwd(), `classification-kimi-output-${category}.json`);
  if (!existsSync(filePath)) return classifications;

  const raw = JSON.parse(readFileSync(filePath, "utf8")) as Array<Partial<Classification> & { product_code: string }>;
  const byCode = new Map(raw.map((item) => [item.product_code, item]));
  return classifications.map((item) => {
    const kimi = byCode.get(item.product_code);
    if (!kimi) return item;
    return {
      ...item,
      subcategory: kimi.subcategory || item.subcategory,
      brand: kimi.brand || item.brand,
      model: kimi.model || item.model,
      gender: kimi.gender || item.gender,
      color: kimi.color || item.color,
      confidence: typeof kimi.confidence === "number" ? kimi.confidence : item.confidence,
      reason: kimi.reason || item.reason,
      provider: "kimi" as const,
      kimi_required: false,
      kimi_required_reasons: [],
    };
  });
}

async function main() {
  loadEnvLocal();
  const options = readOptions();
  if (!options.dryRun) {
    throw new Error("This script currently supports --dry-run only. It will not write Supabase product data.");
  }

  const products = await fetchProductsWithCacheFallback(options.category);
  const ruleClassifications = products.map((product) => classifyWithRules(product, options.category));
  const finalClassifications = mergeKimiIfAvailable(options.category, ruleClassifications);
  const lowConfidence = finalClassifications.filter((item) => item.confidence < LOW_CONFIDENCE_THRESHOLD);
  const unknown = finalClassifications.filter((item) => isUnknownSubcategory(item.subcategory));
  const kimiRequired = ruleClassifications.filter((item) => item.kimi_required);
  const ruleConfident = ruleClassifications.filter((item) => !item.kimi_required);
  const brandUnknown = finalClassifications.filter((item) => item.brand === "Other / Unknown");
  const brandUnknownOnly = ruleClassifications.filter(isBrandUnknownOnly);
  const kimiRequiredDueToBrandOnly = ruleClassifications.filter((item) =>
    item.brand === "Other / Unknown" &&
    item.kimi_required &&
    item.kimi_required_reasons.length === 1 &&
    item.kimi_required_reasons[0] === "unknown_brand"
  );
  const bagsUnknownAnalysis = options.category === "Bags" ? unknownBagAnalysis(products, finalClassifications) : {};
  const kimiInputData = kimiInput(products, ruleClassifications, options);

  const dryRunJson = path.resolve(process.cwd(), `classification-dry-run-${options.category}.json`);
  const dryRunCsv = path.resolve(process.cwd(), `classification-dry-run-${options.category}.csv`);
  const kimiInputPath = path.resolve(process.cwd(), `classification-kimi-input-${options.category}.json`);
  const finalJson = path.resolve(process.cwd(), `classification-final-${options.category}.json`);
  const finalCsv = path.resolve(process.cwd(), `classification-final-${options.category}.csv`);

  const summary = {
    category: options.category,
    dry_run: true,
    total_products: products.length,
    subcategory_identified: finalClassifications.length - unknown.length,
    unknown_subcategory: unknown.length,
    brand_distribution: countBy(finalClassifications, "brand"),
    model_distribution: countBy(finalClassifications, "model"),
    low_confidence: lowConfidence.length,
    low_confidence_threshold: LOW_CONFIDENCE_THRESHOLD,
    brand_unknown_count: brandUnknown.length,
    kimi_required_due_to_brand_only_count: kimiRequiredDueToBrandOnly.length,
    kimi_skipped_brand_unknown_count: brandUnknownOnly.length,
    rule_confident_count: ruleConfident.length,
    kimi_required_count: kimiRequired.length,
    kimi_required_reasons: kimiReasonDistribution(kimiRequired),
    samples_by_subcategory: sampleBySubcategory(products, finalClassifications),
    suspected_misclassified_samples: suspectedMisclassifiedSamples(products, finalClassifications),
    unknown_samples: unknown.slice(0, 30).map((item) => ({
      product_code: item.product_code,
      title: products.find((product) => product.product_code === item.product_code)?.title_en || "",
      reason: item.reason,
    })),
    ...bagsUnknownAnalysis,
    kimi_required: kimiRequired.length,
    kimi_input_file: kimiInputPath,
    provider_strategy: "No direct Tencent/Kimi connector is available in this Codex environment, so low-confidence inputs are exported for tencentcodingplan/kimi-k2.5.",
    output_json: dryRunJson,
    output_csv: dryRunCsv,
  };

  writeFileSync(kimiInputPath, JSON.stringify(kimiInputData, null, 2));
  writeFileSync(dryRunJson, JSON.stringify({ summary, classifications: finalClassifications }, null, 2));
  writeCsv(dryRunCsv, finalClassifications);

  if (existsSync(path.resolve(process.cwd(), `classification-kimi-output-${options.category}.json`))) {
    writeFileSync(finalJson, JSON.stringify(finalClassifications, null, 2));
    writeCsv(finalCsv, finalClassifications);
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
