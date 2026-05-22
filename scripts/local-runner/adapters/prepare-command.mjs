import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { repoRoot, saveState } from "../state.mjs";

const d1Database = "linmuse-products-staging";

const categoryPrefixes = {
  Apparel: "LM-APP",
  Bags: "LM-BAG",
  Shoes: "LM-SHO",
  Accessories: "LM-ACC",
  Watches: "LM-WAT",
};

const categoryPath = {
  Apparel: "apparel",
  Bags: "bags",
  Shoes: "shoes",
  Accessories: "accessories",
  Watches: "watches",
};

export function buildPrepareCommand(state) {
  const output = path.join(state.RUN_DIR, "ready", "products-import.ready-official-codes.json");
  const args = ["scripts/local-runner/adapters/prepare-command.mjs", "--prepare", path.join(state.RUN_DIR, "state.json")];
  return {
    command: "node",
    args,
    input: state.TRANSLATED_JSON || state.CLEANED_JSON || state.UNIQUE_JSON || state.REAL_JSON || "",
    output,
    display: `node ${args.map((item) => JSON.stringify(item)).join(" ")}`,
  };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function asArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // Plain delimited paths are common in older exports.
    }
    return trimmed.split("|").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function uniqueExistingFiles(files) {
  return [...new Set(files.filter(Boolean))]
    .filter((file) => fs.existsSync(file) && fs.statSync(file).isFile() && isImageFile(file))
    .sort();
}

function textValue(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function quoteSql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function parseWranglerJson(raw) {
  const text = String(raw || "");
  const firstArray = text.indexOf("[");
  const firstObject = text.indexOf("{");
  const starts = [firstArray, firstObject].filter((index) => index >= 0).sort((a, b) => a - b);
  if (!starts.length) throw new Error(`Cannot parse wrangler JSON output: ${text.slice(0, 300)}`);
  return JSON.parse(text.slice(starts[0]));
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: repoRoot, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function findWranglerCommand() {
  const localWrangler = path.join(repoRoot, "node_modules", ".bin", "wrangler");
  if (fs.existsSync(localWrangler)) return { command: localWrangler, argsPrefix: [], source: "node_modules/.bin/wrangler" };

  const pathDirs = String(process.env.PATH || "").split(path.delimiter).filter(Boolean);
  for (const dir of pathDirs) {
    const candidate = path.join(dir, "wrangler");
    if (fs.existsSync(candidate)) return { command: candidate, argsPrefix: [], source: "PATH wrangler" };
  }

  const npxCommand = pathDirs.map((dir) => path.join(dir, "npx")).find((candidate) => fs.existsSync(candidate));
  if (npxCommand) return { command: npxCommand, argsPrefix: ["--no-install", "wrangler"], source: "npx --no-install wrangler" };

  return null;
}

function buildD1MaxCodeQuery(category, prefix) {
  const startIndex = prefix.length + 2;
  return `
SELECT product_code
FROM products
WHERE category=${quoteSql(category)}
  AND status='published'
  AND is_active=1
  AND product_code LIKE ${quoteSql(`${prefix}-%`)}
ORDER BY CAST(substr(product_code, ${startIndex}) AS INTEGER) DESC
LIMIT 1;
`.trim();
}

async function readD1MaxCode(category, prefix) {
  const sql = buildD1MaxCodeQuery(category, prefix);
  const wrangler = findWranglerCommand();
  if (!wrangler) {
    const error = new Error("本地未找到 wrangler，无法只读查询 D1 最大编号；请在本机终端运行或安装/配置 wrangler。");
    error.code = "missing_wrangler";
    throw error;
  }
  const args = [...wrangler.argsPrefix, "d1", "execute", d1Database, "--remote", "--json", "--command", sql];
  const result = await runCommand(wrangler.command, args);
  if (result.code !== 0) {
    const error = [result.stdout, result.stderr].filter(Boolean).join("\n");
    if (/could not determine executable|npm error code ENOTFOUND|registry\.npmjs\.org|getaddrinfo ENOTFOUND/i.test(error)) {
      const wrapped = new Error("本地未找到可用 wrangler，无法只读查询 D1 最大编号；请在本机终端运行或安装/配置 wrangler。");
      wrapped.code = "missing_wrangler";
      throw wrapped;
    }
    throw new Error(error || `D1 readonly max query failed with exit code ${result.code}`);
  }
  const parsed = parseWranglerJson(result.stdout || result.stderr);
  const rows = Array.isArray(parsed) ? parsed[0]?.results || [] : parsed?.results || [];
  return {
    maxCode: rows[0]?.product_code || "",
    query: sql,
    wranglerSource: wrangler.source,
    raw: parsed,
  };
}

function productNumber(productCode, prefix) {
  const match = String(productCode || "").match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`));
  return match ? Number(match[1]) : 0;
}

function formatCode(prefix, number) {
  return `${prefix}-${String(number).padStart(4, "0")}`;
}

function isImageFile(file) {
  return /\.(webp|jpg|jpeg|png)$/i.test(file);
}

function resolveLocalFile(rawPath, realDir) {
  if (!rawPath) return null;
  const raw = String(rawPath);
  if (/^https?:\/\//i.test(raw)) return null;
  const candidates = [];
  if (path.isAbsolute(raw)) candidates.push(raw);
  candidates.push(raw);
  candidates.push(path.join(repoRoot, raw));
  candidates.push(path.join(realDir, raw));
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function scanDir(dir) {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  return fs.readdirSync(dir)
    .sort()
    .map((name) => path.join(dir, name))
    .filter((file) => fs.statSync(file).isFile() && isImageFile(file));
}

function imageFolderDirs(product, realDir, kind) {
  const rawFolder = textValue(product.image_folder);
  if (!rawFolder) return [];
  const folders = [];
  const folder = path.isAbsolute(rawFolder) ? rawFolder : path.join(realDir, rawFolder);
  folders.push(path.join(folder, kind));
  folders.push(path.join(folder, kind === "display" ? "images" : "thumbs"));
  folders.push(path.join(realDir, "images", rawFolder, kind));
  folders.push(path.join(realDir, "images", rawFolder, kind === "display" ? "images" : "thumbs"));
  folders.push(path.join(repoRoot, rawFolder, kind));
  folders.push(path.join(repoRoot, rawFolder, kind === "display" ? "images" : "thumbs"));
  return [...new Set(folders)];
}

function codeDirs(realDir, oldCode, slug, kind) {
  const codes = [oldCode, slug].filter(Boolean);
  const dirs = [];
  for (const code of codes) {
    dirs.push(path.join(realDir, "images", code, kind));
    dirs.push(path.join(realDir, "images", code, kind === "display" ? "images" : "thumbs"));
  }
  return [...new Set(dirs)];
}

function scanImageDirs(dirs) {
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    const files = scanDir(dir);
    if (files.length) return files;
  }
  return [];
}

function collectPathValues(product, keys) {
  const values = [];
  for (const key of keys) values.push(...asArray(product[key]));
  return values;
}

function localFilesFromValues(values, realDir) {
  return uniqueExistingFiles(values.map((value) => resolveLocalFile(value, realDir)).filter(Boolean));
}

function remoteValues(values) {
  return values.filter((value) => /^https?:\/\//i.test(String(value || "")));
}

function imageCandidates(product, realDir, oldCode, kind) {
  const slug = textValue(product.slug);
  const displayLocalKeys = ["local_display_image_paths", "display_image_paths"];
  const thumbLocalKeys = ["local_thumbnail_image_paths", "thumbnail_image_paths", "thumb_image_paths"];
  const displayFallbackKeys = ["display_images", "local_image_paths", "image_paths", "main_image", "gallery_images", "gallery_image_urls", "image_urls", "images"];
  const thumbFallbackKeys = ["main_thumbnail", "gallery_thumbnails", "gallery_thumbnail_urls", "thumbnail_urls", "thumbs"];
  const localKeys = kind === "display" ? displayLocalKeys : thumbLocalKeys;
  const fallbackKeys = kind === "display" ? displayFallbackKeys : thumbFallbackKeys;
  const attemptedImageSources = [];
  const imageNeedsDownload = [];

  const localValues = collectPathValues(product, localKeys);
  attemptedImageSources.push({ type: "local_path_fields", kind, keys: localKeys, values: localValues.slice(0, 20) });
  const localFiles = localFilesFromValues(localValues, realDir);
  imageNeedsDownload.push(...remoteValues(localValues));
  if (localFiles.length) return { files: localFiles, attemptedImageSources, imageNeedsDownload };

  const folderDirs = imageFolderDirs(product, realDir, kind);
  attemptedImageSources.push({ type: "image_folder", kind, dirs: folderDirs });
  const folderFiles = scanImageDirs(folderDirs);
  if (folderFiles.length) return { files: folderFiles, attemptedImageSources, imageNeedsDownload };

  const oldCodeDirs = codeDirs(realDir, oldCode, slug, kind);
  attemptedImageSources.push({ type: "old_code_or_slug", kind, oldCode, slug, dirs: oldCodeDirs });
  const codeFiles = scanImageDirs(oldCodeDirs);
  if (codeFiles.length) return { files: codeFiles, attemptedImageSources, imageNeedsDownload };

  const fallbackValues = collectPathValues(product, fallbackKeys);
  attemptedImageSources.push({ type: "fallback_image_fields", kind, keys: fallbackKeys, values: fallbackValues.slice(0, 20) });
  const fallbackFiles = localFilesFromValues(fallbackValues, realDir);
  imageNeedsDownload.push(...remoteValues(fallbackValues));
  if (fallbackFiles.length) return { files: fallbackFiles, attemptedImageSources, imageNeedsDownload };

  return { files: [], attemptedImageSources, imageNeedsDownload: [...new Set(imageNeedsDownload)] };
}

function classifyBrand(text, existing) {
  const current = textValue(existing);
  if (current && !["Unknown", "Other / Unknown", "Other"].includes(current)) return current;
  const rules = [
    [/louis vuitton|\blv\b|路易威登/i, "Louis Vuitton"],
    [/ysl|saint laurent|圣罗兰/i, "Saint Laurent"],
    [/miu ?miu|miumiu|缪缪/i, "Miu Miu"],
    [/herm[eè]s|爱马仕/i, "Hermes"],
    [/gucci|古驰|cucci/i, "Gucci"],
    [/dior|迪奥|d家/i, "Dior"],
    [/chanel|香奈儿|小香/i, "Chanel"],
    [/prada|普拉达/i, "Prada"],
    [/celine|赛琳/i, "Celine"],
    [/loewe|罗意威/i, "Loewe"],
    [/balenciaga|巴黎世家/i, "Balenciaga"],
    [/fendi|芬迪/i, "Fendi"],
    [/goyard|戈雅/i, "Goyard"],
    [/burberry|巴宝莉/i, "Burberry"],
    [/moncler|蒙口/i, "Moncler"],
    [/nike/i, "Nike"],
    [/adidas/i, "Adidas"],
    [/rolex|劳力士/i, "Rolex"],
    [/cartier|卡地亚/i, "Cartier"],
    [/omega|欧米茄/i, "Omega"],
    [/audemars|爱彼/i, "Audemars Piguet"],
    [/patek|百达翡丽/i, "Patek Philippe"],
    [/richard mille|理查/i, "Richard Mille"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] || "Other / Unknown";
}

function classifySubcategory(category, text, existing) {
  const current = textValue(existing);
  if (current && !["Unknown", "Other / Unknown", "Other", category].includes(current)) return current;
  if (category === "Accessories") {
    if (/necklace|项链|吊坠/i.test(text)) return "Necklaces";
    if (/bracelet|手链|手镯/i.test(text)) return "Bracelets";
    if (/ring|戒指/i.test(text)) return "Rings";
    if (/earring|耳环|耳钉/i.test(text)) return "Earrings";
    if (/sunglasses|glasses|墨镜|眼镜/i.test(text)) return "Sunglasses";
    if (/belt|腰带/i.test(text)) return "Belts";
    if (/hat|cap|帽/i.test(text)) return "Hats & Caps";
    if (/scarf|围巾|丝巾/i.test(text)) return "Scarves";
    if (/keychain|挂件|钥匙扣/i.test(text)) return "Keychains";
    return "Other Accessories";
  }
  if (category === "Bags") {
    if (/wallet|cardholder|card holder|钱包|卡包/i.test(text)) return "Wallets & Cardholders";
    if (/backpack|双肩/i.test(text)) return "Backpacks";
    if (/keepall|travel|duffle|旅行/i.test(text)) return "Travel Bags";
    if (/tote|托特|neverfull/i.test(text)) return "Tote Bags";
    if (/crossbody|斜挎/i.test(text)) return "Crossbody Bags";
    if (/shoulder|腋下/i.test(text)) return "Shoulder Bags";
    return "Handbags";
  }
  if (category === "Shoes") {
    if (/runner|running|跑鞋/i.test(text)) return "Running Shoes";
    if (/slide|sandal|拖鞋|凉鞋/i.test(text)) return "Slides & Sandals";
    if (/loafer|乐福/i.test(text)) return "Loafers";
    if (/boot|靴/i.test(text)) return "Boots";
    return "Sneakers";
  }
  if (category === "Watches") {
    if (/chrono|daytona|计时/i.test(text)) return "Chronograph Watches";
    if (/diver|submariner|潜水/i.test(text)) return "Diver Watches";
    if (/dress|datejust/i.test(text)) return "Dress Watches";
    if (/quartz|石英/i.test(text)) return "Quartz Watches";
    return "Automatic Watches";
  }
  if (/t-?shirt|tee|短袖|t恤/i.test(text)) return "T-Shirts";
  if (/hoodie|卫衣/i.test(text)) return "Hoodies";
  if (/jacket|夹克|外套/i.test(text)) return "Jackets";
  if (/sweater|knit|毛衣|针织/i.test(text)) return "Sweaters";
  if (/pants|trousers|裤/i.test(text)) return "Pants";
  if (/shorts|短裤/i.test(text)) return "Shorts";
  if (/shirt|衬衫/i.test(text)) return "Shirts";
  if (/set|套装/i.test(text)) return "Tracksuits";
  return "Apparel";
}

function classifyGender(text, existing) {
  const current = textValue(existing);
  if (current && !["Unknown", "Other / Unknown", "Other"].includes(current)) return current;
  if (/women|female|女士|女款|女/i.test(text)) return "Women";
  if (/men|male|男士|男款|男/i.test(text)) return "Men";
  return "Unisex";
}

function classifyColor(text, existing) {
  const current = textValue(existing);
  if (current && !["Unknown", "Other / Unknown", "Other"].includes(current)) return current;
  const rules = [
    [/black|黑/i, "Black"],
    [/white|白/i, "White"],
    [/blue|蓝/i, "Blue"],
    [/green|绿/i, "Green"],
    [/gray|grey|灰/i, "Gray"],
    [/brown|棕|咖/i, "Brown"],
    [/red|红/i, "Red"],
    [/pink|粉/i, "Pink"],
    [/beige|米|杏/i, "Beige"],
    [/yellow|黄/i, "Yellow"],
    [/gold|金/i, "Gold"],
    [/silver|银/i, "Silver"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] || "Other / Unknown";
}

function textForRisk(product) {
  return [
    product.title,
    product.title_cn,
    product.description,
    product.description_cn,
    product.cleaned_source_title_cn,
    product.cleaned_source_description_cn,
    product.title_en,
    product.description_en,
  ].map((value) => String(value || "")).join(" ");
}

function hasChinese(text) {
  return /[\u3400-\u9fff]/u.test(text);
}

function hasEmoji(text) {
  return /[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}]/u.test(text);
}

function snippet(text, index = 0) {
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + 120);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function publishFieldProblems(product, productCode) {
  const problems = [];
  for (const field of ["title", "title_en", "description", "description_en"]) {
    const value = String(product[field] || "");
    const chineseIndex = value.search(/[\u3400-\u9fff]/u);
    if (chineseIndex >= 0) {
      problems.push({
        product_code: productCode,
        field,
        reason: "publish_field_contains_chinese",
        snippet: snippet(value, chineseIndex),
      });
    }
    const emojiIndex = value.search(/[\u{1f300}-\u{1faff}\u{2600}-\u{27bf}]/u);
    if (emojiIndex >= 0) {
      problems.push({
        product_code: productCode,
        field,
        reason: "publish_field_contains_emoji",
        snippet: snippet(value, emojiIndex),
      });
    }
  }
  return problems;
}

async function finishFailure(state, report, status = "failed") {
  writeJson(path.join(state.RUN_DIR, "reports", "prepare-report.json"), report);
  await saveState({
    ...state,
    status,
    currentStep: "prepare",
    failedStep: "prepare",
    failureSummary: report.failureSummary || "prepare 失败。",
    lastReport: "prepare-report.json",
    nextAdvice: report.failureSummary || "查看 prepare-report.json。",
  });
}

async function runPrepare(statePath) {
  const state = readJson(statePath);
  const input = state.TRANSLATED_JSON || state.CLEANED_JSON || state.UNIQUE_JSON || state.REAL_JSON || "";
  const output = path.join(state.RUN_DIR, "ready", "products-import.ready-official-codes.json");
  const reportPath = path.join(state.RUN_DIR, "reports", "prepare-report.json");
  const category = state.category;
  const prefix = categoryPrefixes[category];
  const rule = state.config?.categoryRules?.[category] || {};
  const minImages = Number(rule.minImages || (category === "Accessories" ? 4 : 9));
  const maxImages = Number(rule.maxImages || 9);
  const readyImageDir = path.join(state.RUN_DIR, "ready", "images");
  const baseReport = {
    input,
    output,
    category,
    prefix,
    previous_max: "",
    previousMaxCode: "",
    start_code: "",
    startCode: "",
    end_code: "",
    endCode: "",
    total: 0,
    numberingSource: "d1_frontend_products_max_code",
    filesPlanned: 0,
    imageProblemsCount: 0,
    imageProblems: [],
    missingRequiredCount: 0,
    missingRequired: [],
    riskyTextCount: 0,
    publishFieldProblemsCount: 0,
    publishFieldProblems: [],
    importedAtFirst: "",
    importedAtLast: "",
    d1ReadOnlyQuery: "",
    didReadD1: false,
    didReadSupabase: false,
    didWriteD1: false,
    didUploadR2: false,
  };

  if (!prefix) {
    await finishFailure(state, { ...baseReport, failureSummary: `未知 category，无法生成 prefix：${category}` });
    process.exit(1);
  }

  if (!input || !fs.existsSync(input)) {
    await finishFailure(state, { ...baseReport, failureSummary: `输入 JSON 不存在：${input}` });
    process.exit(1);
  }

  let maxResult;
  try {
    maxResult = await readD1MaxCode(category, prefix);
  } catch (error) {
    await finishFailure(state, {
      ...baseReport,
      detectedReason: "d1_readonly_query_failed",
      d1ReadOnlyQuery: buildD1MaxCodeQuery(category, prefix),
      failureSummary: `D1 只读查询最大编号失败：${error instanceof Error ? error.message : String(error)}`,
    }, "blocked");
    process.exit(2);
  }

  const products = readJson(input);
  if (!Array.isArray(products) || products.length === 0) {
    await finishFailure(state, { ...baseReport, d1ReadOnlyQuery: maxResult.query, failureSummary: "输入 JSON 没有产品数组。" });
    process.exit(1);
  }

  fs.rmSync(readyImageDir, { recursive: true, force: true });
  fs.mkdirSync(readyImageDir, { recursive: true });

  const previousNumber = productNumber(maxResult.maxCode, prefix);
  const now = Date.now();
  const ready = [];
  const imageProblems = [];
  const missingRequired = [];
  const publishProblems = [];
  let filesPlanned = 0;

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const oldCode = textValue(product.product_code, product.code, `index_${index + 1}`);
    const newCode = formatCode(prefix, previousNumber + index + 1);
    const text = textForRisk(product);
    const displayResult = imageCandidates(product, state.REAL_DIR, oldCode, "display");
    const thumbResult = imageCandidates(product, state.REAL_DIR, oldCode, "thumbs");
    const displayPaths = displayResult.files.slice(0, maxImages);
    let thumbPaths = thumbResult.files.slice(0, maxImages);
    if (!thumbPaths.length && displayPaths.length) thumbPaths = [...displayPaths];
    const imageCount = Math.min(displayPaths.length, thumbPaths.length, maxImages);
    const attemptedImageSources = [
      ...displayResult.attemptedImageSources,
      ...thumbResult.attemptedImageSources,
    ];
    const imageNeedsDownload = [...new Set([...displayResult.imageNeedsDownload, ...thumbResult.imageNeedsDownload])];
    const imageProblemDetail = {
      product_code: oldCode,
      oldCode,
      newCode,
      attemptedImageSources,
      foundDisplayCount: displayPaths.length,
      foundThumbCount: thumbPaths.length,
      expectedDisplayCount: `${minImages}-${maxImages}`,
      expectedThumbCount: `${minImages}-${maxImages}`,
      imageNeedsDownload,
      reason: "",
    };

    if (displayPaths.length < minImages || displayPaths.length > maxImages) {
      imageProblems.push({ ...imageProblemDetail, reason: `display paths ${displayPaths.length}, expected ${minImages}-${maxImages}` });
    }
    if (thumbPaths.length < minImages || thumbPaths.length > maxImages) {
      imageProblems.push({ ...imageProblemDetail, reason: `thumb paths ${thumbPaths.length}, expected ${minImages}-${maxImages}` });
    }

    const destDisplay = path.join(readyImageDir, newCode, "display");
    const destThumbs = path.join(readyImageDir, newCode, "thumbs");
    fs.mkdirSync(destDisplay, { recursive: true });
    fs.mkdirSync(destThumbs, { recursive: true });

    for (let n = 1; n <= imageCount; n += 1) {
      const displaySrc = displayPaths[n - 1];
      const thumbSrc = thumbPaths[n - 1];
      const name = `${String(n).padStart(2, "0")}.webp`;
      if (displaySrc && fs.existsSync(displaySrc)) fs.copyFileSync(displaySrc, path.join(destDisplay, name));
      else imageProblems.push({ ...imageProblemDetail, reason: `missing display ${n}` });
      if (thumbSrc && fs.existsSync(thumbSrc)) fs.copyFileSync(thumbSrc, path.join(destThumbs, name));
      else imageProblems.push({ ...imageProblemDetail, reason: `missing thumb ${n}` });
    }

    filesPlanned += imageCount * 2;
    const importedAt = new Date(now - index * 1000).toISOString();
    const localDisplay = Array.from({ length: imageCount }, (_, i) => path.join(destDisplay, `${String(i + 1).padStart(2, "0")}.webp`));
    const localThumbs = Array.from({ length: imageCount }, (_, i) => path.join(destThumbs, `${String(i + 1).padStart(2, "0")}.webp`));

    const prepared = {
      ...product,
      original_collection_code: oldCode,
      product_code: newCode,
      slug: newCode.toLowerCase(),
      category,
      source_label: state.presetKey,
      subcategory: textValue(product.subcategory) || classifySubcategory(category, text, product.subcategory),
      brand: classifyBrand(text, product.brand),
      model: textValue(product.model),
      gender: classifyGender(text, product.gender),
      color: classifyColor(text, product.color),
      status: "published",
      is_active: true,
      imported_at: importedAt,
      import_batch_id: textValue(product.import_batch_id) || `${state.presetKey}-${new Date(now).toISOString().slice(0, 10)}`,
      image_count: imageCount,
      main_image: localDisplay[0] || "",
      gallery_images: localDisplay,
      main_thumbnail: localThumbs[0] || "",
      gallery_thumbnails: localThumbs,
      display_image_paths: localDisplay,
      local_display_image_paths: localDisplay,
      thumbnail_image_paths: localThumbs,
      local_thumbnail_image_paths: localThumbs,
    };

    for (const key of ["product_code", "category", "source_fingerprint", "imported_at"]) {
      if (!textValue(prepared[key])) missingRequired.push(`${newCode}: missing ${key}`);
    }
    if (!textValue(prepared.source_url, prepared.source_product_url, prepared.source_album_url)) {
      missingRequired.push(`${newCode}: missing source_url/source_product_url/source_album_url`);
    }
    publishProblems.push(...publishFieldProblems(prepared, newCode));

    ready.push(prepared);
  }

  const report = {
    ...baseReport,
    previous_max: maxResult.maxCode || null,
    previousMaxCode: maxResult.maxCode || null,
    start_code: ready[0]?.product_code || "",
    startCode: ready[0]?.product_code || "",
    end_code: ready.at(-1)?.product_code || "",
    endCode: ready.at(-1)?.product_code || "",
    total: ready.length,
    numberingSource: `D1 ${d1Database} products.category=${category} status=published is_active=1 max product_code`,
    filesPlanned,
    imageProblemsCount: imageProblems.length,
    imageProblems: imageProblems.slice(0, 100),
    missingRequiredCount: missingRequired.length,
    missingRequired: missingRequired.slice(0, 100),
    riskyTextCount: 0,
    publishFieldProblemsCount: publishProblems.length,
    publishFieldProblems: publishProblems.slice(0, 100),
    importedAtFirst: ready[0]?.imported_at || "",
    importedAtLast: ready.at(-1)?.imported_at || "",
    d1ReadOnlyQuery: maxResult.query,
    didReadD1: true,
  };

  writeJson(output, ready);
  writeJson(reportPath, report);

  if (!report.start_code || !report.end_code) {
    await finishFailure(state, { ...report, failureSummary: "无法生成 product_code。" });
    process.exit(1);
  }
  if (imageProblems.length || missingRequired.length || publishProblems.length) {
    await finishFailure(state, { ...report, failureSummary: "prepare 产物检查失败，请查看 prepare-report.json。" });
    process.exit(1);
  }

  await saveState({
    ...state,
    status: "success",
    currentStep: "prepare",
    completedSteps: [...new Set([...(state.completedSteps || []), "prepare"])],
    failedStep: "",
    failureSummary: "",
    READY_JSON: output,
    ready_json: output,
    startCode: report.start_code,
    endCode: report.end_code,
    start_code: report.start_code,
    end_code: report.end_code,
    filesPlanned,
    lastReport: "prepare-report.json",
    nextAdvice: "下一步：D1 写入前检查。",
  });

  console.log(JSON.stringify(report, null, 2));
}

if (process.argv[2] === "--prepare") {
  runPrepare(process.argv[3]).catch(async (error) => {
    const statePath = process.argv[3];
    const state = statePath && fs.existsSync(statePath) ? readJson(statePath) : null;
    if (state) {
      await finishFailure(state, {
        input: state.TRANSLATED_JSON || state.CLEANED_JSON || state.UNIQUE_JSON || state.REAL_JSON || "",
        output: path.join(state.RUN_DIR, "ready", "products-import.ready-official-codes.json"),
        category: state.category,
        prefix: categoryPrefixes[state.category] || "",
        previous_max: "",
        previousMaxCode: "",
        start_code: "",
        startCode: "",
        end_code: "",
        endCode: "",
        total: 0,
        numberingSource: "d1_frontend_products_max_code",
        filesPlanned: 0,
        imageProblemsCount: 0,
        imageProblems: [],
        missingRequiredCount: 0,
        missingRequired: [],
        riskyTextCount: 0,
        publishFieldProblemsCount: 0,
        publishFieldProblems: [],
        importedAtFirst: "",
        importedAtLast: "",
        d1ReadOnlyQuery: "",
        didReadD1: false,
        didReadSupabase: false,
        didWriteD1: false,
        didUploadR2: false,
        failureSummary: error instanceof Error ? error.message : String(error),
      });
    }
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
