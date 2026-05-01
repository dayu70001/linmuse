# WeCatalog Local Import Test

This importer creates a local review package only. It does not publish products, upload images, change Supabase, change Cloudflare R2, or deploy to Vercel.

## Step 1: Import A 3 Product Test

```bash
npm run import:wecatalog -- --url "https://shop00128866.wecatalog.cn/t/63136SN" --category Apparel --max 3 --debug
```

To visually confirm that Playwright clicks each product card and opens the detail page or modal, run:

```bash
npm run import:wecatalog -- --url "https://shop00128866.wecatalog.cn/t/63136SN" --category Apparel --max 3 --debug --headed
```

Each product exports up to 9 valid product images. If fewer than 9 images are found, the product is marked `needs_review`.

The import step does not use DeepSeek and does not call any translation API. `--translator none` is accepted for compatibility with the test command, but translation is handled separately.

```bash
npm run import:wecatalog -- --url "https://shop00128866.wecatalog.cn/t/63136SN" --category Apparel --max 3 --debug --headed --translator none
```

## Step 2: Translate Exported Products

Translate the already exported `products-import.json` file. This step does not scrape WeCatalog, does not download images, and does not modify image folders.

```bash
DEEPSEEK_API_KEY="YOUR_KEY_HERE" npm run translate:products -- --input "$(ls -td imports/wecatalog/clothing-test-* | head -1)/products-import.json" --provider deepseek
```

## Run A 20 Product Test

```bash
npm run import:wecatalog -- --url "https://shop00128866.wecatalog.cn/t/63136SN" --category Apparel --max 20
```

The script caps `--max` at 20 so it cannot accidentally import the whole album.

The npm command uses Node's built-in TypeScript strip mode so the Playwright
browser code is not transformed by tsx/esbuild before it reaches
`page.evaluate`.

## Output Location

Each run creates a timestamped folder:

```text
imports/wecatalog/clothing-test-YYYY-MM-DD-HH-mm/
```

Inside the folder:

```text
products-import.csv
products-import.json
import-report.json
images/
  LM-APP-0001/
    01.webp
    02.webp
    09.webp
debug/
  network/
    response-001.json
  network-summary.json
  product-discovery.json
  listing-page.png
  listing-mobile-page.png
  listing-with-detected-cards.png
  detected-cards.json
  product-001-before-click.png
  product-001-after-click.png
  product-001-detail.html
  product-001-image-candidates-before-filter.json
  product-001-accepted-images.json
  product-001-rejected-images.json
```

## Review The CSV

Open `products-import.csv` and check:

- `product_code`
- `title_en`
- `description_en`
- `source_title_cn`
- `cleaned_source_title_cn`
- `source_description_cn`
- `cleaned_source_description_cn`
- `image_count`
- `translation_provider`
- `translation_status`
- `status`
- `notes`

All imported products stay as `draft` unless they need manual review. Products with missing images, fewer than 9 real product images, unclear source text, translation fallback/failure, download errors, or risky wording are marked `needs_review`.

For this clothing album, the importer exports the best 9 valid product images from product/detail/gallery areas. It tries to avoid duplicate images, shop avatars, shop covers, banners, logos, QR codes, background images, icons, and other non-product assets. Products with exactly 9 saved images include `9 product images exported` in the notes. Products with fewer than 9 saved images are marked `needs_review`.

The listing cover image is only used as a fallback. If only one image is found, the product is marked `needs_review` with the note: `Only listing cover image found. Product detail gallery was not extracted.`

The importer now tries network/API product discovery before DOM clicking, but it does not trust broad recursive JSON matches by themselves. Network candidates are scored and rejected if they look like WeCatalog template, layout, style, navigation, banner, logo, avatar, cover, QR code, or configuration records. Titles such as `瀑布流`, `商城`, `商城单图列表`, and image URLs under `/album/personal/` are hard rejected and cannot be exported as products.

`network-summary.json` shows each JSON response, top-level keys, image URL counts, sample text fields, and whether candidates from that response were accepted or rejected. `product-discovery.json` separates `valid_product_candidates` from `rejected_template_candidates`, including rejection reasons. `detected-cards.json` records mobile-layout DOM cards with bounding boxes so you can see whether the page exposed real clickable product cards.

## Translation Notes

The importer writes fallback English fields and marks rows with `Translation provider not configured`. Use the separate translation script to call DeepSeek's OpenAI-compatible chat completions API. The script reads only from environment variables:

```text
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

The API key is never hardcoded or printed. DeepSeek output must be strict JSON with `title_en` and `description_en`. The translation script validates that English fields contain no Chinese characters, no `High quality`, and no broken mixed-language fragments. If validation fails, it retries once, then falls back and marks the row `needs_review`.

## Later Supabase Import

After you review and approve the CSV:

1. Upload cleaned product images to Cloudflare R2 or Supabase Storage.
2. Replace local `gallery_images` paths with public image URLs.
3. Insert approved rows into the future products table.
4. Keep `needs_review` rows unpublished until they are cleaned manually.
