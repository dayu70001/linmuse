import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function importsRoot() {
  return path.resolve(process.cwd(), "imports", "wecatalog");
}

function latestImportFolder() {
  const root = importsRoot();
  if (!existsSync(root)) {
    return "";
  }

  const folders = readdirSync(root)
    .filter((name) => name.startsWith("clothing-test-"))
    .map((name) => path.join(root, name))
    .filter((folder) => statSync(folder).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  return folders[0] || "";
}

function runCommand(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function hasArg(name: string) {
  return process.argv.slice(2).includes(name);
}

function getArgValue(name: string, fallback: string) {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] || fallback : fallback;
}

function productStats(importFolder: string) {
  const reportPath = path.join(importFolder, "import-report.json");
  if (!existsSync(reportPath)) {
    return { totalProducts: 0, totalImages: 0 };
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8")) as {
    total_products_exported?: number;
    total_images_downloaded?: number;
  };
  return {
    totalProducts: report.total_products_exported || 0,
    totalImages: report.total_images_downloaded || 0,
  };
}

function translationStats(translatedJsonPath: string) {
  if (!existsSync(translatedJsonPath)) {
    return { success: 0, failed: 0 };
  }

  const rows = JSON.parse(readFileSync(translatedJsonPath, "utf8")) as Array<{
    translation_status?: string;
  }>;
  return {
    success: rows.filter((row) => row.translation_status === "success").length,
    failed: rows.filter((row) => row.translation_status !== "success").length,
  };
}

async function main() {
  const userArgs = process.argv.slice(2);
  if (userArgs.includes("--help") || userArgs.includes("-h")) {
    console.log('Usage: npm run import:wecatalog:full -- --url "https://..." --category Apparel --max 3 --debug --headed');
    console.log('Batch usage: DEEPSEEK_API_KEY="KEY" npm run import:wecatalog:full -- --url "https://..." --category Apparel --limit-new 100 --skip-existing --max-scan 500');
    console.log("Stability options: --product-timeout-ms 90000 --save-every 1 --resume --resume-from imports/wecatalog/.../import-progress.json --min-images 9");
    console.log("Runs local WeCatalog import, then runs DeepSeek translation when DEEPSEEK_API_KEY is set.");
    return;
  }

  const scraperArgs = ["run", "import:wecatalog", "--", ...userArgs];

  if (!hasArg("--translator")) {
    scraperArgs.push("--translator", "none");
  }

  console.log("Step 1: importing WeCatalog products locally...");
  runCommand("npm", scraperArgs);

  const importFolder = latestImportFolder();
  if (!importFolder) {
    throw new Error("Could not find generated import folder.");
  }

  const inputJson = path.join(importFolder, "products-import.json");
  if (!existsSync(inputJson)) {
    throw new Error(`products-import.json not found in ${importFolder}`);
  }

  let translatedJsonPath = "";
  let translatedCsvPath = "";
  let translatedSuccess = 0;
  let translatedFailed = 0;

  if (!process.env.DEEPSEEK_API_KEY) {
    console.log("Step 2: skipped translation because DEEPSEEK_API_KEY is missing.");
  } else {
    console.log("Step 2: translating exported products with DeepSeek...");
    runCommand("npm", [
      "run",
      "translate:products",
      "--",
      "--input",
      inputJson,
      "--provider",
      "deepseek",
      "--translate-concurrency",
      getArgValue("--translate-concurrency", "3"),
    ]);

    translatedJsonPath = path.join(importFolder, "products-import.translated.json");
    translatedCsvPath = path.join(importFolder, "products-import.translated.csv");
    const stats = translationStats(translatedJsonPath);
    translatedSuccess = stats.success;
    translatedFailed = stats.failed;
  }

  const stats = productStats(importFolder);
  console.log("");
  console.log(`Final output folder: ${importFolder}`);
  console.log(`Total products exported: ${stats.totalProducts}`);
  console.log(`Total images downloaded: ${stats.totalImages}`);
  console.log(`translated_success: ${translatedSuccess}`);
  console.log(`translated_failed: ${translatedFailed}`);
  console.log(`final translated CSV path: ${translatedCsvPath || "not created"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
