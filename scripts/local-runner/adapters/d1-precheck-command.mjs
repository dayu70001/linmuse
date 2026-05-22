export function buildD1QueryCommand(sql) {
  const args = ["wrangler", "d1", "execute", "linmuse-products-staging", "--remote", "--json", "--command", sql];
  return { command: "npx", args, display: `npx ${args.map((item) => JSON.stringify(item)).join(" ")}` };
}

export function sqlIn(field, values) {
  const escaped = values.map((value) => `'${String(value).replaceAll("'", "''")}'`).join(",");
  return `SELECT product_code, category, source_fingerprint FROM products WHERE ${field} IN (${escaped});`;
}

if (process.argv[2]?.startsWith("--")) {
  const mode = process.argv[2];
  const stateFile = process.argv[3];
  const { promises: fs } = await import("node:fs");
  const path = await import("node:path");
  const { spawn } = await import("node:child_process");
  const { loadState, saveState, writeJson, repoRoot } = await import("../state.mjs");
  const state = await loadState(path.basename(path.dirname(stateFile)));
  const input = mode === "--fingerprint-check" ? state.UNIQUE_JSON : state.READY_JSON;
  if (!input) throw new Error("Missing input JSON for D1 check.");
  const rows = JSON.parse(await fs.readFile(input, "utf8"));
  const values = mode === "--fingerprint-check"
    ? [...new Set(rows.map((row) => row.source_fingerprint).filter(Boolean))]
    : rows.map((row) => row.product_code).filter(Boolean);
  const field = mode === "--fingerprint-check" ? "source_fingerprint" : "product_code";
  const found = [];
  const errors = [];
  const run = (command, args) => new Promise((resolve) => {
    const child = spawn(command, args, { cwd: repoRoot, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("close", (code) => resolve({ code, output }));
  });
  const parse = (text) => {
    const raw = String(text || "");
    const starts = [raw.indexOf("["), raw.indexOf("{")].filter((index) => index >= 0).sort((a, b) => a - b);
    if (!starts.length) return null;
    try { return JSON.parse(raw.slice(starts[0])); } catch { return null; }
  };
  for (let i = 0; i < values.length; i += 40) {
    const sql = sqlIn(field, values.slice(i, i + 40));
    const cmd = buildD1QueryCommand(sql);
    const result = await run(cmd.command, cmd.args);
    if (result.code !== 0) errors.push({ code: result.code, output: result.output.slice(-4000) });
    const parsed = parse(result.output);
    const rowsOut = Array.isArray(parsed) ? parsed.flatMap((item) => item?.results || item?.result || []) : [];
    found.push(...rowsOut);
  }
  const reportName = mode === "--fingerprint-check" ? "d1-fingerprint-check-report.json" : "d1-precheck-report.json";
  const report = {
    mode,
    input,
    checked: values.length,
    foundCount: found.length,
    queryErrorCount: errors.length,
    duplicateProductCodes: mode === "--precheck" ? found.map((row) => row.product_code).filter(Boolean) : [],
    didReadD1: true,
    didWriteD1: false,
    found,
    errors
  };
  await writeJson(path.join(state.RUN_DIR, "reports", reportName), report);
  if (found.length || errors.length) {
    await saveState({ ...state, status: "blocked", failedStep: mode === "--fingerprint-check" ? "d1-fingerprint-check" : "d1-precheck", failureSummary: `D1 只读检查阻断：found=${found.length}, errors=${errors.length}`, lastReport: reportName });
    process.exit(1);
  }
  const stepId = mode === "--fingerprint-check" ? "d1-fingerprint-check" : "d1-precheck";
  await saveState({
    ...state,
    status: "success",
    currentStep: stepId,
    completedSteps: [...new Set([...(state.completedSteps || []), stepId])],
    failedStep: "",
    failureSummary: "",
    lastReport: reportName,
    lastD1PrecheckAt: mode === "--precheck" ? new Date().toISOString() : state.lastD1PrecheckAt,
    nextAdvice: mode === "--precheck" ? "下一步：上传 R2 图片。此步骤会真实上传图片，只在确认后点击运行。" : "下一步：清理文字。"
  });
}
