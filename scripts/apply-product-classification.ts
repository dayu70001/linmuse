import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Args = {
  dryRun: boolean;
  apply: boolean;
  input: string;
  category: string;
  limit: number | null;
};

type ClassificationRow = {
  product_code: string;
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  gender: string;
  color: string;
  needs_review?: boolean;
};

type ProductRow = {
  product_code: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  gender: string | null;
  color: string | null;
};

type UpdatePayload = {
  subcategory: string;
  brand: string;
  model: string;
  gender: string;
  color: string;
};

type Plan = {
  product_code: string;
  category: string;
  current: ProductRow;
  planned: UpdatePayload;
  would_update_fields: string[];
};

const allowedUpdateFields = ["subcategory", "brand", "model", "gender", "color"];
const reportJsonPath = path.resolve(process.cwd(), "classification-apply-dry-run-report.json");
const reportCsvPath = path.resolve(process.cwd(), "classification-apply-dry-run.csv");

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
    // Required Supabase variables are validated separately.
  }
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const read = (name: string) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] || "" : "";
  };
  const limitRaw = read("--limit");
  return {
    dryRun: argv.includes("--dry-run"),
    apply: argv.includes("--apply"),
    input: read("--input"),
    category: read("--category"),
    limit: limitRaw ? Math.max(1, Number(limitRaw) || 1) : null,
  } satisfies Args;
}

function readSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const missing = [
    !url ? "SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL" : "",
    !key ? "SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY" : "",
  ].filter(Boolean);
  if (missing.length > 0) throw new Error(`Missing Supabase env vars: ${missing.join(", ")}`);
  return { url: url.replace(/\/+$/, ""), key };
}

function readInputRows(input: string) {
  if (!input) {
    throw new Error("Missing --input classification-final-Apparel.json,classification-final-Shoes.json,classification-final-Bags.json");
  }

  const rows: ClassificationRow[] = [];
  for (const item of input.split(",").map((value) => value.trim()).filter(Boolean)) {
    const filePath = path.resolve(process.cwd(), item);
    const data = JSON.parse(readFileSync(filePath, "utf8")) as { classifications?: ClassificationRow[] };
    rows.push(...(data.classifications || []));
  }
  return rows;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function inFilterValues(values: string[]) {
  return values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",");
}

async function fetchProducts(productCodes: string[]) {
  const { url, key } = readSupabaseConfig();
  const rows: ProductRow[] = [];
  const chunkSize = 100;

  for (let index = 0; index < productCodes.length; index += chunkSize) {
    const chunk = productCodes.slice(index, index + chunkSize);
    const query = new URL(`${url}/rest/v1/products`);
    query.searchParams.set("select", allowedUpdateFields.concat("product_code").join(","));
    query.searchParams.set("product_code", `in.(${inFilterValues(chunk)})`);
    query.searchParams.set("limit", String(chunk.length));

    let response: Response;
    try {
      response = await fetch(query, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
        },
      });
    } catch (error) {
      throw new Error(`Supabase read failed before dry-run report could be generated: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (!response.ok) {
      throw new Error(`Supabase read failed: ${await response.text()}`);
    }

    rows.push(...((await response.json()) as ProductRow[]));
  }

  return rows;
}

async function patchProduct(productCode: string, payload: UpdatePayload) {
  const { url, key } = readSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/products?product_code=eq.${encodeURIComponent(productCode)}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function payloadFor(row: ClassificationRow): UpdatePayload {
  return {
    subcategory: row.subcategory || "Other / Unknown",
    brand: row.brand || "Other / Unknown",
    model: row.model || "Other / Unknown",
    gender: row.gender || "Unisex",
    color: row.color || "Other / Unknown",
  };
}

function diffFields(product: ProductRow, payload: UpdatePayload) {
  return allowedUpdateFields.filter((field) => {
    const key = field as keyof UpdatePayload;
    return String(product[key] || "") !== String(payload[key] || "");
  });
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
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

function writeCsv(filePath: string, rows: Array<Record<string, unknown>>) {
  const headers = [
    "product_code",
    "category",
    "would_update_fields",
    "current_subcategory",
    "planned_subcategory",
    "current_brand",
    "planned_brand",
    "current_model",
    "planned_model",
    "current_gender",
    "planned_gender",
    "current_color",
    "planned_color",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function readyRowsForArgs(rows: ClassificationRow[], args: Args) {
  let readyRows = rows.filter((row) => row.needs_review !== true);
  if (args.category) {
    readyRows = readyRows.filter((row) => row.category === args.category);
  }
  if (args.limit) {
    readyRows = readyRows.slice(0, args.limit);
  }
  return readyRows;
}

async function buildPlans(readyRows: ClassificationRow[]) {
  const readyCodes = unique(readyRows.map((row) => row.product_code).filter(Boolean));
  const products = await fetchProducts(readyCodes);
  const productByCode = new Map(products.map((product) => [product.product_code, product]));
  const missingProducts = readyCodes.filter((code) => !productByCode.has(code));
  const plans = readyRows.flatMap((row) => {
    const product = productByCode.get(row.product_code);
    if (!product) return [];
    const payload = payloadFor(row);
    const wouldUpdateFields = diffFields(product, payload);
    return [{
      product_code: row.product_code,
      category: row.category,
      current: product,
      planned: payload,
      would_update_fields: wouldUpdateFields,
    }];
  });
  const unexpectedUpdateFields = unique(
    plans.flatMap((plan) => plan.would_update_fields).filter((field) => !allowedUpdateFields.includes(field)),
  );
  return { plans, missingProducts, unexpectedUpdateFields };
}

function limitLabel(limit: number | null) {
  return limit ? `limit${limit}` : "all";
}

function backupPathFor(category: string, limit: number | null) {
  return path.resolve(process.cwd(), `classification-apply-before-backup-${category}-${limitLabel(limit)}.json`);
}

function applyReportPathFor(category: string, limit: number | null) {
  return path.resolve(process.cwd(), `classification-apply-${category}-${limitLabel(limit)}-report.json`);
}

function assertOnlyAllowedPayloadFields(payload: UpdatePayload) {
  const fields = Object.keys(payload);
  const unexpected = fields.filter((field) => !allowedUpdateFields.includes(field));
  if (unexpected.length > 0) {
    throw new Error(`Unexpected update fields: ${unexpected.join(", ")}`);
  }
}

async function runApply(args: Args, plans: Plan[]) {
  if (!args.category) {
    throw new Error("Missing --category. Apply requires --category Apparel, Shoes, or Bags.");
  }

  const categoryPlans = plans.filter((plan) => plan.category === args.category);
  const backupFile = backupPathFor(args.category, args.limit);
  const reportFile = applyReportPathFor(args.category, args.limit);
  const backupRows = categoryPlans.map((plan) => ({
    product_code: plan.product_code,
    subcategory: plan.current.subcategory,
    brand: plan.current.brand,
    model: plan.current.model,
    gender: plan.current.gender,
    color: plan.current.color,
  }));

  writeFileSync(backupFile, `${JSON.stringify(backupRows, null, 2)}\n`);

  const failedUpdates: Array<{ product_code: string; error: string }> = [];
  const updatedProductCodes: string[] = [];

  for (const plan of categoryPlans) {
    try {
      assertOnlyAllowedPayloadFields(plan.planned);
      await patchProduct(plan.product_code, plan.planned);
      updatedProductCodes.push(plan.product_code);
      console.log(`updated ${plan.product_code}`);
    } catch (error) {
      failedUpdates.push({
        product_code: plan.product_code,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const verifyRows = await fetchProducts(updatedProductCodes);
  const verifyByCode = new Map(verifyRows.map((row) => [row.product_code, row]));
  const failedVerifications: Array<{ product_code: string; field?: string; expected?: string; actual?: string; error: string }> = [];

  for (const plan of categoryPlans.filter((item) => updatedProductCodes.includes(item.product_code))) {
    const verified = verifyByCode.get(plan.product_code);
    if (!verified) {
      failedVerifications.push({ product_code: plan.product_code, error: "missing_after_update" });
      continue;
    }
    for (const field of allowedUpdateFields) {
      const key = field as keyof UpdatePayload;
      const expected = String(plan.planned[key] || "");
      const actual = String(verified[key] || "");
      if (expected !== actual) {
        failedVerifications.push({ product_code: plan.product_code, field, expected, actual, error: "verification_mismatch" });
      }
    }
  }

  const report = {
    category: args.category,
    limit: args.limit,
    products_attempted: categoryPlans.length,
    products_updated: updatedProductCodes.length,
    products_verified: updatedProductCodes.length - unique(failedVerifications.map((item) => item.product_code)).length,
    failed_updates: failedUpdates,
    failed_verifications: failedVerifications,
    updated_product_codes: updatedProductCodes,
    backup_file: backupFile,
  };

  writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, report_file: reportFile }, null, 2));
}

async function main() {
  loadEnvLocal();
  const args = parseArgs();
  if (args.apply && !args.category) {
    throw new Error("Missing --category. Apply requires --category Apparel, Shoes, or Bags.");
  }
  if (!args.dryRun && !args.apply) {
    throw new Error("Use --dry-run to generate a plan, or --apply with --category to PATCH classification fields.");
  }

  const inputRows = readInputRows(args.input);
  const readyRows = args.apply ? readyRowsForArgs(inputRows, args) : inputRows.filter((row) => row.needs_review !== true);
  const skippedRows = inputRows.filter((row) => row.needs_review === true);
  const { plans, missingProducts, unexpectedUpdateFields } = await buildPlans(readyRows);

  if (unexpectedUpdateFields.length > 0) {
    throw new Error(`Unexpected update fields: ${unexpectedUpdateFields.join(", ")}`);
  }

  if (args.apply) {
    await runApply(args, plans);
    return;
  }

  const csvRows = plans.map((plan) => ({
    product_code: plan.product_code,
    category: plan.category,
    would_update_fields: plan.would_update_fields,
    current_subcategory: plan.current.subcategory,
    planned_subcategory: plan.planned.subcategory,
    current_brand: plan.current.brand,
    planned_brand: plan.planned.brand,
    current_model: plan.current.model,
    planned_model: plan.planned.model,
    current_gender: plan.current.gender,
    planned_gender: plan.planned.gender,
    current_color: plan.current.color,
    planned_color: plan.planned.color,
  }));

  const report = {
    dry_run: true,
    total_input_products: inputRows.length,
    ready_to_apply_count: readyRows.length,
    skipped_needs_review_count: skippedRows.length,
    missing_products_count: missingProducts.length,
    products_planned_count: plans.length,
    unexpected_update_fields: unexpectedUpdateFields,
    unexpected_update_fields_count: unexpectedUpdateFields.length,
    category_counts: countBy(readyRows, "category"),
    subcategory_distribution: countBy(readyRows, "subcategory"),
    brand_distribution: countBy(readyRows, "brand"),
    missing_products: missingProducts,
    sample_updates: csvRows.filter((row) => row.would_update_fields.length > 0).slice(0, 30),
    skipped_needs_review_samples: skippedRows.slice(0, 30).map((row) => ({
      product_code: row.product_code,
      category: row.category,
      subcategory: row.subcategory,
      brand: row.brand,
    })),
    output_json: reportJsonPath,
    output_csv: reportCsvPath,
  };

  writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  writeCsv(reportCsvPath, csvRows);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
