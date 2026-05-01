import fs from "node:fs/promises";
import path from "node:path";

type ProductRow = Record<string, unknown> & {
  product_code: string;
  source_title_cn?: string;
  source_description_cn?: string;
  title_en?: string;
  description_en?: string;
  notes?: string;
  status?: "draft" | "needs_review";
  translation_provider?: string;
  translation_status?: string;
};

type CliOptions = {
  input: string;
  provider: "deepseek";
  model: string;
};

const fallbackDescription =
  "Selected apparel style available for retail and wholesale orders. Please contact us with product code, size, color, and destination for details.";

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

const csvColumns = [
  "product_code",
  "slug",
  "category",
  "subcategory",
  "source_title_cn",
  "title_source_cn",
  "cleaned_source_title_cn",
  "source_description_cn",
  "description_source_cn",
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

const invalidTranslationPattern =
  /[\u4e00-\u9fff]|High quality|shorts裤|ssspring|breathablecomfortable|featurescasualcut|版本|体现/i;

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const getValue = (name: string) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : undefined;
  };
  const input = getValue("--input");
  if (!input) {
    throw new Error('Missing --input "imports/wecatalog/.../products-import.json"');
  }
  const provider = getValue("--provider") || "deepseek";
  if (provider !== "deepseek") {
    throw new Error('Only --provider deepseek is supported for now');
  }
  return {
    input,
    provider: "deepseek",
    model: getValue("--model") || process.env.DEEPSEEK_MODEL || "deepseek-chat",
  };
}

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

function removeHighQualityPhrase(text: string) {
  return cleanText(text.replace(/高品质/g, ""));
}

function extractTitleSource(sourceTitle: string) {
  const cleaned = removeHighQualityPhrase(sourceTitle);
  const firstSegment = cleanText(cleaned.split(/[，。！!;；\n\r]/)[0] || "");
  if (firstSegment.length >= 8) {
    return firstSegment;
  }
  return Array.from(cleaned).slice(0, 60).join("").trim();
}

function fallbackTitle(sourceText: string) {
  if (/短袖/.test(sourceText) && /短裤/.test(sourceText) && /套装/.test(sourceText)) return "Short Sleeve & Shorts Set";
  if (/套装/.test(sourceText)) return "Casual Apparel Set";
  if (/T恤|t恤|短袖/i.test(sourceText)) return "Short Sleeve Top";
  if (/外套|夹克/.test(sourceText)) return "Jacket";
  if (/卫衣/.test(sourceText)) return "Hoodie";
  if (/长裤|裤子|休闲裤|短裤/.test(sourceText)) return "Pants";
  if (/衬衫/.test(sourceText)) return "Shirt";
  return "Short Sleeve & Shorts Set";
}

function detectRiskyTerms(...texts: string[]) {
  const combined = texts.join(" ").toLowerCase();
  return riskyTerms.filter((term) => combined.includes(term.toLowerCase()));
}

function csvEscape(value: unknown) {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function toCsv(rows: ProductRow[]) {
  return [
    csvColumns.join(","),
    ...rows.map((row) => csvColumns.map((column) => csvEscape(row[column])).join(",")),
  ].join("\n");
}

function titleLooksTooLong(titleEn: string) {
  const wordCount = titleEn.split(/\s+/).filter(Boolean).length;
  return wordCount > 24 || /breathable and comfortable|refined details|soft hand feel|flattering fit|available for retail/i.test(titleEn);
}

function validateTranslation(titleEn: string, descriptionEn: string) {
  if (!titleEn || !descriptionEn) return false;
  if (titleLooksTooLong(titleEn)) return false;
  return !invalidTranslationPattern.test(`${titleEn} ${descriptionEn}`);
}

function parseTranslationJson(content: string) {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as { title_en?: unknown; description_en?: unknown };
  return {
    title_en: cleanText(String(parsed.title_en || "")),
    description_en: cleanText(String(parsed.description_en || "")),
  };
}

function messages(titleSource: string, descriptionSource: string, strict = false) {
  return [
    {
      role: "system",
      content: [
        "Translate the Chinese apparel product title and description into clean natural English.",
        "Return JSON only.",
        "No Chinese characters in English fields.",
        'Do not include "High quality".',
        "Do not translate 高品质.",
        "Keep brand words if they appear in the source because this is only local testing.",
        "Keep useful details like P210, 2026SS, M-3XL, fabric, fit, style, and set information.",
        "Translate title_source_cn into a concise product title.",
        "Translate description_source_cn into a readable product description.",
        "title_en must be short and should not include long marketing clauses.",
        "description_en can include the full product details.",
        "title_en should be a direct clean translation of title_source_cn.",
        "Do not replace title with vague generic names like Relaxed Fit Pants or Minimal Casual Apparel.",
        "Do not put description phrases in title_en, such as breathable and comfortable, refined details, soft hand feel, flattering fit, or available for retail.",
        "description_en should be readable English.",
        "Do not invent details.",
        "Return JSON only.",
        strict ? "The previous output failed validation. Return cleaner English only with no broken mixed text." : "",
      ].filter(Boolean).join(" "),
    },
    {
      role: "user",
      content: JSON.stringify({
        title_source_cn: titleSource,
        description_source_cn: descriptionSource,
        required_json_shape: { title_en: "...", description_en: "..." },
      }),
    },
  ];
}

async function translateWithDeepSeek(titleSource: string, descriptionSource: string, options: CliOptions, strict = false) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: messages(titleSource, descriptionSource, strict),
    }),
  });
  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}`);
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseTranslationJson(data.choices?.[0]?.message?.content || "");
}

async function translateProduct(product: ProductRow, options: CliOptions): Promise<ProductRow> {
  const sourceTitle = cleanText(String(product.source_title_cn || ""));
  const sourceDescription = cleanText(String(product.source_description_cn || sourceTitle || ""));
  const titleSource = extractTitleSource(sourceTitle);
  const descriptionSource = removeHighQualityPhrase(sourceDescription || sourceTitle);
  const fallback = {
    title_en: fallbackTitle(titleSource),
    description_en: fallbackDescription,
  };
  let translated = fallback;
  let translationStatus = "failed";

  try {
    const first = await translateWithDeepSeek(titleSource, descriptionSource, options);
    if (validateTranslation(first.title_en, first.description_en)) {
      translated = first;
      translationStatus = "success";
    } else {
      const retry = await translateWithDeepSeek(titleSource, descriptionSource, options, true);
      if (validateTranslation(retry.title_en, retry.description_en)) {
        translated = retry;
        translationStatus = "success";
      } else {
        translationStatus = "failed";
      }
    }
  } catch {
    translationStatus = "failed";
  }

  const terms = detectRiskyTerms(sourceTitle, sourceDescription);
  const noteParts = [
    String(product.notes || ""),
    terms.length > 0 ? `risky terms: ${terms.join(", ")}` : "",
    translationStatus === "failed" ? "DeepSeek translation failed" : "",
  ].filter(Boolean);

  return {
    ...product,
    title_source_cn: titleSource,
    cleaned_source_title_cn: titleSource,
    description_source_cn: descriptionSource,
    cleaned_source_description_cn: descriptionSource,
    title_en: translated.title_en,
    description_en: translated.description_en,
    translation_provider: options.provider,
    translation_status: translationStatus,
    status: terms.length > 0 || translationStatus === "failed" || product.status === "needs_review" ? "needs_review" : "draft",
    notes: Array.from(new Set(noteParts.join("; ").split("; ").filter(Boolean))).join("; "),
  };
}

async function main() {
  const options = parseArgs();
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }
  const inputPath = path.resolve(options.input);
  const raw = await fs.readFile(inputPath, "utf8");
  const products = JSON.parse(raw) as ProductRow[];
  const translated: ProductRow[] = [];
  for (const product of products) {
    translated.push(await translateProduct(product, options));
  }

  const outputJson = inputPath.replace(/\.json$/i, ".translated.json");
  const outputCsv = inputPath.replace(/\.json$/i, ".translated.csv");
  await fs.writeFile(outputJson, JSON.stringify(translated, null, 2));
  await fs.writeFile(outputCsv, `${toCsv(translated)}\n`);

  console.log(JSON.stringify({
    input: inputPath,
    output_json: outputJson,
    output_csv: outputCsv,
    total_products: translated.length,
    translated_success: translated.filter((item) => item.translation_status === "success").length,
    translated_failed: translated.filter((item) => item.translation_status === "failed").length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
