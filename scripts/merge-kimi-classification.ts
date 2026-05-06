import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Category = "Apparel" | "Shoes" | "Bags";

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
  provider?: string;
  kimi_required?: boolean;
  kimi_required_reasons?: string[];
  needs_review?: boolean;
  review_reason?: string;
};

type KimiOutputRow = {
  product_code: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  gender: string;
  color: string;
  confidence: number;
  reason: string;
  validation_warnings: string[];
};

const categories: Category[] = ["Apparel", "Shoes", "Bags"];

const allowedSubcategories: Record<Category, string[]> = {
  Apparel: [
    "T-Shirts",
    "Shirts",
    "Hoodies & Sweatshirts",
    "Sweaters & Knitwear",
    "Jackets & Coats",
    "Pants",
    "Shorts",
    "Sets",
    "Other Apparel",
    "Other / Unknown",
  ],
  Shoes: [
    "Sneakers",
    "Slides & Sandals",
    "Boots",
    "Loafers",
    "Other Shoes",
    "Other / Unknown",
  ],
  Bags: [
    "Crossbody & Shoulder Bags",
    "Tote Bags",
    "Backpacks",
    "Handbags",
    "Wallets & Cardholders",
    "Travel Bags",
    "Other Bags",
    "Other / Unknown",
  ],
};

function getArg(name: string) {
  const index = process.argv.indexOf(name);
  if (index === -1) return "";
  return process.argv[index + 1] || "";
}

function targetCategories() {
  const category = getArg("--category");
  if (!category) return categories;
  if (!categories.includes(category as Category)) {
    throw new Error(`--category must be one of: ${categories.join(", ")}`);
  }
  return [category as Category];
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function flattenKimiInputProductCodes(filePath: string) {
  const data = readJson<{
    batches?: Array<{
      products?: Array<{ product_code?: string }>;
    }>;
  }>(filePath);

  return new Set(
    (data.batches || [])
      .flatMap((batch) => batch.products || [])
      .map((product) => String(product.product_code || "").trim())
      .filter(Boolean),
  );
}

function loadKimiOutput(category: Category, inputCodes: Set<string>) {
  const filePath = path.resolve(process.cwd(), `classification-kimi-output-${category}.json`);
  const invalidRows: Array<{ product_code?: string; reason: string }> = [];
  const rowsByCode = new Map<string, KimiOutputRow>();
  const duplicates: string[] = [];

  if (!existsSync(filePath)) {
    console.log(`missing classification-kimi-output-${category}.json`);
    return {
      rowsByCode,
      invalidRows,
      duplicates,
      missingOutputFile: true,
      outputCount: 0,
    };
  }

  let rows: unknown;
  try {
    rows = readJson<unknown>(filePath);
  } catch (error) {
    invalidRows.push({ reason: `invalid_json: ${error instanceof Error ? error.message : String(error)}` });
    return { rowsByCode, invalidRows, duplicates, missingOutputFile: false, outputCount: 0 };
  }

  if (!Array.isArray(rows)) {
    invalidRows.push({ reason: "kimi_output_must_be_json_array" });
    return { rowsByCode, invalidRows, duplicates, missingOutputFile: false, outputCount: 0 };
  }

  rows.forEach((raw, index) => {
    const row = raw as Partial<KimiOutputRow>;
    const productCode = String(row.product_code || "").trim();
    const errors: string[] = [];

    if (!productCode) errors.push("missing_product_code");
    if (productCode && !inputCodes.has(productCode)) errors.push("product_code_not_in_kimi_input");
    if (productCode && rowsByCode.has(productCode)) errors.push("duplicate_product_code");
    if (row.category !== category) errors.push("category_mismatch");
    if (!row.subcategory || !allowedSubcategories[category].includes(String(row.subcategory))) {
      errors.push("invalid_subcategory");
    }
    if (typeof row.confidence !== "number" || row.confidence < 0 || row.confidence > 1) {
      errors.push("invalid_confidence");
    }

    const validationWarnings = [
      !row.brand ? "missing_brand" : "",
      !row.model ? "missing_model" : "",
      !row.gender ? "missing_gender" : "",
      !row.color ? "missing_color" : "",
      !row.reason ? "missing_reason" : "",
    ].filter(Boolean);

    if (errors.length > 0) {
      invalidRows.push({ product_code: productCode || `row_${index + 1}`, reason: errors.join(",") });
      if (errors.includes("duplicate_product_code") && productCode) duplicates.push(productCode);
      return;
    }

    rowsByCode.set(productCode, {
      product_code: productCode,
      category,
      subcategory: String(row.subcategory),
      brand: String(row.brand || "Other / Unknown"),
      model: String(row.model || "Other / Unknown"),
      gender: String(row.gender || "Unisex"),
      color: String(row.color || "Other / Unknown"),
      confidence: row.confidence as number,
      reason: String(row.reason || ""),
      validation_warnings: validationWarnings,
    });
  });

  return {
    rowsByCode,
    invalidRows,
    duplicates,
    missingOutputFile: false,
    outputCount: rows.length,
  };
}

function isOtherSubcategory(category: Category, subcategory: string) {
  return subcategory.includes("Other / Unknown") ||
    subcategory === `Other ${category === "Apparel" ? "Apparel" : category === "Shoes" ? "Shoes" : "Bags"}`;
}

function reviewReasonsForKimiRow(category: Category, row: KimiOutputRow) {
  return [
    row.confidence < 0.7 ? "kimi_confidence_below_0_7" : "",
    row.subcategory.includes("Other / Unknown") ? "kimi_subcategory_other_unknown" : "",
    isOtherSubcategory(category, row.subcategory) ? "kimi_subcategory_other_bucket" : "",
    row.brand === "Other / Unknown" && row.confidence < 0.75 ? "kimi_brand_unknown_low_confidence" : "",
    !row.reason.trim() ? "kimi_reason_empty" : "",
    ...row.validation_warnings.map((warning) => `kimi_${warning}`),
  ].filter(Boolean);
}

function countBy(rows: Classification[], key: keyof Classification) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const label = String(row[key] || "Unknown");
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

function csvEscape(value: unknown) {
  const text = Array.isArray(value) ? value.join("|") : String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(filePath: string, rows: Classification[]) {
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
    "needs_review",
    "review_reason",
    "reason",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape((row as Record<string, unknown>)[header])).join(","));
  }
  writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function mergeCategory(category: Category) {
  const dryRunPath = path.resolve(process.cwd(), `classification-dry-run-${category}.json`);
  const kimiInputPath = path.resolve(process.cwd(), `classification-kimi-input-${category}.json`);
  const finalJsonPath = path.resolve(process.cwd(), `classification-final-${category}.json`);
  const finalCsvPath = path.resolve(process.cwd(), `classification-final-${category}.csv`);

  if (!existsSync(dryRunPath)) throw new Error(`missing classification-dry-run-${category}.json`);
  if (!existsSync(kimiInputPath)) throw new Error(`missing classification-kimi-input-${category}.json`);

  const dryRun = readJson<{ classifications?: Classification[] }>(dryRunPath);
  const classifications = dryRun.classifications || [];
  const kimiInputCodes = flattenKimiInputProductCodes(kimiInputPath);
  const kimi = loadKimiOutput(category, kimiInputCodes);
  const missingFromKimiOutput = [...kimiInputCodes].filter((code) => !kimi.rowsByCode.has(code));

  const merged = classifications.map((item) => {
    if (!kimiInputCodes.has(item.product_code)) {
      return {
        ...item,
        provider: item.provider || "rules",
        needs_review: false,
      };
    }

    const kimiRow = kimi.rowsByCode.get(item.product_code);
    if (!kimiRow) {
      return {
        ...item,
        provider: item.provider || "rules",
        needs_review: true,
        review_reason: kimi.missingOutputFile ? "missing_kimi_output_file" : "missing_from_kimi_output",
      };
    }

    const reviewReasons = reviewReasonsForKimiRow(category, kimiRow);
    return {
      ...item,
      subcategory: kimiRow.subcategory,
      brand: kimiRow.brand || item.brand,
      model: kimiRow.model || item.model,
      gender: kimiRow.gender || item.gender,
      color: kimiRow.color || item.color,
      confidence: kimiRow.confidence,
      reason: kimiRow.reason,
      provider: "kimi",
      kimi_required: false,
      kimi_required_reasons: [],
      needs_review: reviewReasons.length > 0,
      review_reason: reviewReasons.join(","),
    };
  });

  const kimiMerged = merged.filter((item) => item.provider === "kimi");
  const summary = {
    category,
    total_products: classifications.length,
    deterministic_count: classifications.filter((item) => !kimiInputCodes.has(item.product_code)).length,
    kimi_input_count: kimiInputCodes.size,
    kimi_output_count: kimi.outputCount,
    merged_count: merged.length,
    needs_review_count: merged.filter((item) => item.needs_review).length,
    missing_from_kimi_output_count: missingFromKimiOutput.length,
    invalid_kimi_output_count: kimi.invalidRows.length,
    kimi_low_confidence_count: kimiMerged.filter((item) => item.confidence < 0.7).length,
    kimi_other_unknown_count: kimiMerged.filter((item) => isOtherSubcategory(category, item.subcategory)).length,
    needs_review_after_kimi_count: kimiMerged.filter((item) => item.needs_review).length,
    subcategory_distribution: countBy(merged, "subcategory"),
    brand_distribution: countBy(merged, "brand"),
    missing_from_kimi_output: missingFromKimiOutput,
    invalid_kimi_output: kimi.invalidRows,
    duplicate_kimi_product_codes: kimi.duplicates,
    output_json: finalJsonPath,
    output_csv: finalCsvPath,
  };

  writeFileSync(finalJsonPath, JSON.stringify({ summary, classifications: merged }, null, 2));
  writeCsv(finalCsvPath, merged);

  return summary;
}

function main() {
  const summaries = targetCategories().map(mergeCategory);
  console.log(JSON.stringify({ summaries }, null, 2));
}

main();
