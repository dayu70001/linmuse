import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type Category = "Apparel" | "Shoes" | "Bags";

type BatchIndexItem = {
  category: Category;
  batch_no: string;
  count: number;
  input_json: string;
  prompt_txt: string;
  expected_output_json: string;
};

type Options = {
  category: Category | "all";
  limitBatches: number | null;
  resume: boolean;
  dryRun: boolean;
};

type KimiConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxOutputTokens: number;
};

const indexPath = path.resolve(process.cwd(), "classification-kimi-batches/kimi-batch-index.json");
const categories: Array<Category | "all"> = ["Apparel", "Shoes", "Bags", "all"];

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
    // Missing .env.local is handled by required env validation.
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
  const category = getArg("--category") || "all";
  if (!categories.includes(category as Category | "all")) {
    throw new Error("--category must be Apparel, Shoes, Bags, or all");
  }

  const limitRaw = getArg("--limit-batches");
  const limitBatches = limitRaw ? Math.max(1, Number(limitRaw) || 1) : null;

  return {
    category: category as Category | "all",
    limitBatches,
    resume: hasFlag("--resume"),
    dryRun: hasFlag("--dry-run"),
  };
}

function readConfig(): KimiConfig {
  const apiKey = process.env.TENCENT_CODING_PLAN_API_KEY || "";
  const baseUrl = (process.env.KIMI_CLASSIFY_BASE_URL || "").replace(/\/+$/, "");
  const model = process.env.KIMI_CLASSIFY_MODEL || "tencentcodingplan/kimi-k2.5";
  const maxOutputTokens = Math.max(1, Number(process.env.KIMI_CLASSIFY_MAX_OUTPUT_TOKENS || 8192) || 8192);

  if (!apiKey) {
    throw new Error("Missing TENCENT_CODING_PLAN_API_KEY. Add it to .env.local; do not paste the key into chat.");
  }
  if (!baseUrl) {
    throw new Error("Missing KIMI_CLASSIFY_BASE_URL. Add it to .env.local, for example the provider base URL without /chat/completions.");
  }

  return { apiKey, baseUrl, model, maxOutputTokens };
}

function readBatchIndex() {
  if (!existsSync(indexPath)) throw new Error("missing classification-kimi-batches/kimi-batch-index.json");
  const items = JSON.parse(readFileSync(indexPath, "utf8")) as BatchIndexItem[];
  if (!Array.isArray(items)) throw new Error("kimi-batch-index.json must be a JSON array");
  return items;
}

function selectBatches(items: BatchIndexItem[], options: Options) {
  const filtered = options.category === "all"
    ? items
    : items.filter((item) => item.category === options.category);
  return options.limitBatches ? filtered.slice(0, options.limitBatches) : filtered;
}

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

function parseJsonArray(text: string) {
  const cleaned = stripCodeFence(text);
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("response_json_is_not_array");
  }
  return parsed;
}

function outputIsValidArray(filePath: string) {
  if (!existsSync(filePath)) return false;
  try {
    parseJsonArray(readFileSync(filePath, "utf8"));
    return true;
  } catch {
    return false;
  }
}

function sidecarPath(outputJsonPath: string, suffix: string) {
  return outputJsonPath.replace(/\.output\.json$/i, suffix);
}

async function callKimi(promptText: string, config: KimiConfig) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: "You classify products. Return JSON array only. No markdown.",
        },
        {
          role: "user",
          content: promptText,
        },
      ],
      temperature: 0,
      max_tokens: config.maxOutputTokens,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`http_${response.status}: ${responseText.slice(0, 1000)}`);
  }

  let data: {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`invalid_api_json: ${responseText.slice(0, 1000)}`);
  }

  const content = data.choices?.[0]?.message?.content || "";
  if (!content.trim()) {
    throw new Error("empty_message_content");
  }
  return content;
}

async function runBatch(batch: BatchIndexItem, config: KimiConfig) {
  const promptPath = path.resolve(process.cwd(), batch.prompt_txt);
  const outputPath = path.resolve(process.cwd(), batch.expected_output_json);
  const rawPath = sidecarPath(outputPath, ".raw.txt");
  const errorPath = sidecarPath(outputPath, ".error.json");

  const promptText = readFileSync(promptPath, "utf8");
  const startedAt = new Date().toISOString();
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    let content = "";
    try {
      content = await callKimi(promptText, config);
      const parsed = parseJsonArray(content);
      writeFileSync(outputPath, `${JSON.stringify(parsed, null, 2)}\n`);
      console.log(`OK ${batch.category} batch ${batch.batch_no}: ${batch.expected_output_json}`);
      return { ok: true, attempts: attempt };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (content && (message.includes("response_json_is_not_array") || message.includes("Unexpected token"))) {
        writeFileSync(rawPath, content);
      }
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
      }
    }
  }

  const failedAt = new Date().toISOString();
  const errorMessage = lastError instanceof Error ? lastError.message : String(lastError);
  writeFileSync(errorPath, `${JSON.stringify({
    category: batch.category,
    batch_no: batch.batch_no,
    prompt_txt: batch.prompt_txt,
    expected_output_json: batch.expected_output_json,
    started_at: startedAt,
    failed_at: failedAt,
    error: errorMessage,
  }, null, 2)}\n`);
  console.log(`FAILED ${batch.category} batch ${batch.batch_no}: ${errorMessage}`);
  return { ok: false, attempts: 3, error: errorMessage };
}

async function main() {
  loadEnvLocal();
  const options = readOptions();
  const batches = selectBatches(readBatchIndex(), options);

  if (options.dryRun) {
    console.log(JSON.stringify({
      dry_run: true,
      selected_batches: batches.length,
      batches: batches.map((batch) => ({
        category: batch.category,
        batch_no: batch.batch_no,
        count: batch.count,
        prompt_txt: batch.prompt_txt,
        expected_output_json: batch.expected_output_json,
      })),
      required_env_vars: [
        "TENCENT_CODING_PLAN_API_KEY",
        "KIMI_CLASSIFY_BASE_URL",
      ],
      optional_env_vars: [
        "KIMI_CLASSIFY_MODEL",
        "KIMI_CLASSIFY_MAX_OUTPUT_TOKENS",
      ],
    }, null, 2));
    return;
  }

  const config = readConfig();
  const toRun = options.resume
    ? batches.filter((batch) => !outputIsValidArray(path.resolve(process.cwd(), batch.expected_output_json)))
    : batches;

  console.log(`selected batches: ${batches.length}`);
  console.log(`batches to run: ${toRun.length}`);

  const results = [];
  for (const batch of toRun) {
    results.push(await runBatch(batch, config));
  }

  const ok = results.filter((result) => result.ok).length;
  console.log(JSON.stringify({
    selected_batches: batches.length,
    processed_batches: toRun.length,
    succeeded: ok,
    failed: results.length - ok,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
