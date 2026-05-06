const fs = require("fs");

const files = process.argv.slice(2);

if (!files.length) {
  console.error("用法: node scripts/clean-product-text.cjs <json file> [more json files]");
  process.exit(1);
}

// 价格 emoji 先替换成 P，其他 emoji 再删除
const emojiRegex = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D]/gu;

function cleanText(value) {
  if (typeof value !== "string") return value;

  return value
    // 中文价格词统一成 P
    .replace(/出厂价\s*[💰💵💲]?/g, "P")
    .replace(/实价\s*[💰💵💲]?/g, "P")
    .replace(/实价/g, "P")

    // 英文价格词统一成 P
    .replace(/Factory\s*Price/gi, "P")
    .replace(/[💰💵💲]/g, "P")

    // 不需要的调整词
    .replace(/Price\s*Adjustment/gi, "")
    .replace(/价格调整/g, "")

    // 其他 emoji 全部删除，例如 👨🏻 👫 🔥 ✅ 等
    .replace(emojiRegex, "")

    .replace(/\s+/g, " ")
    .trim();
}

function cleanAny(value) {
  if (Array.isArray(value)) return value.map(cleanAny);

  if (value && typeof value === "object") {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = cleanAny(val);
    }
    return out;
  }

  return cleanText(value);
}

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log("跳过不存在:", file);
    continue;
  }

  const backup = `${file}.backup-before-price-emoji-clean`;
  fs.copyFileSync(file, backup);

  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  const cleaned = cleanAny(data);

  fs.writeFileSync(file, JSON.stringify(cleaned, null, 2));

  console.log("已清理:", file);
  console.log("备份:", backup);
}
