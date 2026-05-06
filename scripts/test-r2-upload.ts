import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvLocal, uploadFileToR2 } from "./r2/r2-client.ts";

const localFile = path.resolve(
  process.cwd(),
  "imports/wecatalog/clothing-test-2026-05-05-22-30/images/LM-APP-0657/thumbs/01.webp"
);
const uploadKey = "test/apparel/LM-APP-0657/thumbs/01.webp";

async function main() {
  loadEnvLocal();

  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_PUBLIC_BASE_URL",
  ];
  const missing = required.filter((key) => !process.env[key]);
  console.log(`local file path: ${localFile}`);
  if (missing.length > 0) {
    throw new Error(`Missing R2 env vars in .env.local: ${missing.join(", ")}`);
  }
  console.log("R2 env: present");

  if (!existsSync(localFile)) {
    throw new Error(`Local test file not found: ${localFile}`);
  }

  const uploaded = await uploadFileToR2(localFile, uploadKey);
  console.log(`uploaded key: ${uploaded.key}`);
  console.log(`public URL: ${uploaded.publicUrl}`);
  console.log(`file size: ${uploaded.fileSize}`);
  console.log(`content type: ${uploaded.contentType}`);

  const response = await fetch(uploaded.publicUrl, { method: "GET" });
  console.log(`fetch public URL success: ${response.ok}`);
  console.log(`HTTP status: ${response.status}`);
  console.log(`returned content-type: ${response.headers.get("content-type") || ""}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
