import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { saveState } from "../state.mjs";

const defaultWorkerBase = "https://linmuse-catalog-api-staging.linmusedkbrand2026.workers.dev";

export function buildWorkerVerifyCommand(state) {
  const args = ["scripts/local-runner/adapters/worker-verify-command.mjs", "--verify-worker", path.join(state.RUN_DIR, "state.json")];
  return { command: "node", args, display: `node ${args.map((item) => JSON.stringify(item)).join(" ")}` };
}

function readJson(file) {
  return JSON.parse(fsSync.readFileSync(file, "utf8"));
}

async function writeJson(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function productCodeNumber(code) {
  const match = String(code || "").match(/^LM-(APP|BAG|SHO|ACC|WAT)-(\d+)$/);
  return match ? Number(match[2]) : 0;
}

function catalogOrderOk(products, expectedTopCode) {
  if (!Array.isArray(products) || !products.length) return false;
  if (products[0]?.product_code !== expectedTopCode) return false;
  for (let index = 1; index < products.length; index += 1) {
    if (productCodeNumber(products[index - 1]?.product_code) < productCodeNumber(products[index]?.product_code)) return false;
  }
  return true;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { ok: response.ok, status: response.status, url, json, text: text.slice(0, 3000) };
}

async function runWorkerVerify(statePath) {
  const state = readJson(statePath);
  const reportPath = path.join(state.RUN_DIR, "reports", "worker-verify-report.json");
  const workerBase = String(state.config?.workerApiBase || process.env.PRODUCT_API_BASE || defaultWorkerBase).replace(/\/+$/, "");
  const startCode = state.start_code || state.startCode;
  const endCode = state.end_code || state.endCode || startCode;
  const category = state.category;
  const report = {
    workerBase,
    startCode,
    endCode,
    category,
    checks: {},
    didWriteD1: false,
    didWriteSupabase: false,
    didUploadR2: false,
  };

  const fail = async (summary, exitCode = 1, status = "failed") => {
    report.failureSummary = summary;
    await writeJson(reportPath, report);
    await saveState({ ...state, status, currentStep: "worker-verify", failedStep: "worker-verify", failureSummary: summary, lastReport: "worker-verify-report.json" });
    process.exit(exitCode);
  };

  if (!state.D1_WRITE_DONE || !(state.completedSteps || []).includes("write-d1")) await fail("D1 写入未完成，不能执行 Worker 验证。", 1, "blocked");
  if (!startCode || !endCode || !category) await fail("缺少 start_code/end_code/category，不能执行 Worker 验证。");

  report.checks.health = await fetchJson(`${workerBase}/health`);
  report.checks.startProduct = await fetchJson(`${workerBase}/product/${encodeURIComponent(startCode)}`);
  report.checks.endProduct = await fetchJson(`${workerBase}/product/${encodeURIComponent(endCode)}`);
  report.checks.catalog = await fetchJson(`${workerBase}/catalog?category=${encodeURIComponent(category)}&page=1&pageSize=10`);

  const startProduct = report.checks.startProduct.json;
  const endProduct = report.checks.endProduct.json;
  const catalogProducts = report.checks.catalog.json?.products || [];
  const catalog_order_ok = catalogOrderOk(catalogProducts, endCode);
  const startGalleryThumbs = asArray(startProduct?.gallery_thumbnail_urls);
  const startGalleryImages = asArray(startProduct?.gallery_image_urls);
  const endGalleryThumbs = asArray(endProduct?.gallery_thumbnail_urls);
  const endGalleryImages = asArray(endProduct?.gallery_image_urls);
  const allImageUrls = [
    startProduct?.main_thumbnail_url,
    startProduct?.main_image_url,
    endProduct?.main_thumbnail_url,
    endProduct?.main_image_url,
    ...startGalleryThumbs,
    ...startGalleryImages,
    ...endGalleryThumbs,
    ...endGalleryImages,
  ].filter(Boolean);
  const problems = [];
  if (!report.checks.health.ok || report.checks.health.json?.ok !== true) problems.push("health failed");
  if (!report.checks.startProduct.ok || startProduct?.product_code !== startCode) problems.push("START_CODE product not found");
  if (!report.checks.endProduct.ok || endProduct?.product_code !== endCode) problems.push("END_CODE product not found");
  if (!startProduct?.seo_content) problems.push("START_CODE missing seo_content");
  if (!endProduct?.seo_content) problems.push("END_CODE missing seo_content");
  if (!report.checks.catalog.ok) problems.push("catalog failed");
  if (!catalog_order_ok) problems.push("catalog first page is not sorted by product_code descending with END_CODE first");
  if (!startGalleryThumbs.length || !startGalleryImages.length || !endGalleryThumbs.length || !endGalleryImages.length) problems.push("missing gallery URLs");
  if (allImageUrls.some((url) => !String(url).startsWith("https://img.linmuse.com/"))) problems.push("non R2 image URL");
  report.catalog_order_ok = catalog_order_ok;
  report.catalogFirstPageCodes = catalogProducts.map((item) => item.product_code).filter(Boolean);
  report.problems = problems;
  report.gallery = {
    startGalleryThumbnails: startGalleryThumbs.length,
    startGalleryImages: startGalleryImages.length,
    endGalleryThumbnails: endGalleryThumbs.length,
    endGalleryImages: endGalleryImages.length,
  };

  if (problems.length) await fail(`Worker 验证失败：${problems.join("；")}`);

  await writeJson(reportPath, report);
  await saveState({
    ...state,
    status: "completed",
    currentStep: "worker-verify",
    completedSteps: [...new Set([...(state.completedSteps || []), "worker-verify"])],
    failedStep: "",
    failureSummary: "",
    workerVerified: true,
    WORKER_VERIFIED: true,
    lastReport: "worker-verify-report.json",
    nextAdvice: `上架完成 / Listing completed：${startCode} 到 ${endCode}`,
  });
}

if (process.argv[2] === "--verify-worker") {
  runWorkerVerify(process.argv[3]).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
