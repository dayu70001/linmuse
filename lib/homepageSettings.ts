// Homepage settings — single JSON file in R2.
// R2 key:  site/home/homepage-settings.json
//
// Public page reads prefer the CDN JSON with short Next.js revalidation.
// Admin API routes still use direct R2 helpers for fresh reads/writes.
// NO Supabase. NO D1.

import { getR2Json, readCdnJson } from "@/lib/r2Upload";

// ---------------------------------------------------------------------------
// Slot definitions — safe to import on client
// ---------------------------------------------------------------------------

export type HomeImageSlot = {
  key: string;     // flat settings key stored in JSON
  r2Key: string;   // actual R2 object key
  label: string;
  section: string;
  fallback: string;
};

export const HOME_IMAGE_SLOTS: HomeImageSlot[] = [
  { key: "home_img_hero",                  r2Key: "site/home/hero.webp",              label: "Hero Image",       section: "Hero",           fallback: "/images/mock/hero-collection.jpg"       },
  { key: "home_img_category_apparel",      r2Key: "site/home/category-apparel.webp",  label: "Apparel Category", section: "Categories",     fallback: "/images/mock/category-apparel.jpg"      },
  { key: "home_img_category_shoes",        r2Key: "site/home/category-shoes.webp",    label: "Shoes Category",   section: "Categories",     fallback: "/images/mock/category-shoes.jpg"        },
  { key: "home_img_category_watches",      r2Key: "site/home/category-watches.webp",  label: "Watches Category", section: "Categories",     fallback: "/images/mock/category-watches.jpg"      },
  { key: "home_img_category_bags",         r2Key: "site/home/category-bags.webp",     label: "Bags Category",    section: "Categories",     fallback: "/images/mock/category-bags.jpg"         },
  { key: "home_img_factory_01",            r2Key: "site/home/factory-01.webp",        label: "Factory Photo 1",  section: "Factory Direct", fallback: "/images/mock/factory-production-001.jpg"},
  { key: "home_img_factory_02",            r2Key: "site/home/factory-02.webp",        label: "Factory Photo 2",  section: "Factory Direct", fallback: "/images/mock/factory-production-002.jpg"},
  { key: "home_img_factory_03",            r2Key: "site/home/factory-03.webp",        label: "Factory Photo 3",  section: "Factory Direct", fallback: "/images/mock/factory-production-003.jpg"},
  { key: "home_img_shipping_proof_01",     r2Key: "site/home/shipping-proof-01.webp", label: "Shipping Proof 1", section: "Shipping Proof", fallback: "/images/mock/shipping-proof-001.jpg"    },
  { key: "home_img_shipping_proof_02",     r2Key: "site/home/shipping-proof-02.webp", label: "Shipping Proof 2", section: "Shipping Proof", fallback: "/images/mock/shipping-proof-002.jpg"    },
  { key: "home_img_shipping_proof_03",     r2Key: "site/home/shipping-proof-03.webp", label: "Shipping Proof 3", section: "Shipping Proof", fallback: "/images/mock/shipping-proof-003.jpg"    },
  { key: "home_img_shipping_proof_04",     r2Key: "site/home/shipping-proof-04.webp", label: "Shipping Proof 4", section: "Shipping Proof", fallback: "/images/mock/factory-production-001.jpg"},
  // ── Shipping Proof PAGE (/shipping-proof) ───────────────────────────────
  { key: "shipping_proof_img_01", r2Key: "site/shipping-proof/proof-01.webp", label: "Proof Page — Packing Photos",     section: "Shipping Proof Page", fallback: "/images/mock/shipping-proof-001.jpg"     },
  { key: "shipping_proof_img_02", r2Key: "site/shipping-proof/proof-02.webp", label: "Proof Page — Shipping Updates",   section: "Shipping Proof Page", fallback: "/images/mock/shipping-proof-002.jpg"     },
  { key: "shipping_proof_img_03", r2Key: "site/shipping-proof/proof-03.webp", label: "Proof Page — Warehouse Updates",  section: "Shipping Proof Page", fallback: "/images/mock/factory-production-003.jpg" },
  { key: "shipping_proof_img_04", r2Key: "site/shipping-proof/proof-04.webp", label: "Proof Page — Feedback Photo 1",  section: "Shipping Proof Page", fallback: "/images/mock/factory-production-001.jpg" },
  { key: "shipping_proof_img_05", r2Key: "site/shipping-proof/proof-05.webp", label: "Proof Page — Feedback Photo 2",  section: "Shipping Proof Page", fallback: "/images/mock/factory-production-002.jpg" },
  { key: "shipping_proof_img_06", r2Key: "site/shipping-proof/proof-06.webp", label: "Proof Page — Feedback Photo 3",  section: "Shipping Proof Page", fallback: "/images/mock/shipping-proof-003.jpg"     },
  { key: "shipping_proof_img_07", r2Key: "site/shipping-proof/proof-07.webp", label: "Proof Page — Feedback Photo 4",  section: "Shipping Proof Page", fallback: "/images/mock/hero-apparel-1.jpg"          },
  { key: "shipping_proof_img_08", r2Key: "site/shipping-proof/proof-08.webp", label: "Proof Page — Feedback Photo 5",  section: "Shipping Proof Page", fallback: "/images/mock/hero-shoes-1.jpg"            },
  { key: "shipping_proof_img_09", r2Key: "site/shipping-proof/proof-09.webp", label: "Proof Page — Feedback Photo 6",  section: "Shipping Proof Page", fallback: "/images/mock/product-watches-001.jpg"     },
];

export type HomeFeaturedSlot = {
  key: string;
  category: string;
  label: string;
  fallback: string;
};

export const HOME_FEATURED_SLOTS: HomeFeaturedSlot[] = [
  { key: "home_featured_apparel_code", category: "Apparel", label: "Apparel Product Code", fallback: "LM-APP-0158" },
  { key: "home_featured_shoes_code",   category: "Shoes",   label: "Shoes Product Code",   fallback: "LM-SHO-0157" },
  { key: "home_featured_watches_code", category: "Watches", label: "Watches Product Code", fallback: "LM-WAT-0181" },
  { key: "home_featured_bags_code",    category: "Bags",    label: "Bags Product Code",    fallback: "LM-BAG-0195" },
];

export type HomeSocialSlot = {
  key: string;
  label: string;
  placeholder: string;
};

export const HOME_SOCIAL_SLOTS: HomeSocialSlot[] = [
  { key: "home_link_telegram",       label: "Telegram Channel URL",     placeholder: "https://t.me/..."                  },
  { key: "home_link_whatsapp",       label: "WhatsApp Group URL",       placeholder: "https://chat.whatsapp.com/..."     },
  { key: "home_link_instagram",      label: "Instagram URL",            placeholder: "https://instagram.com/..."         },
  { key: "home_link_facebook",       label: "Facebook URL",             placeholder: "https://facebook.com/..."          },
  { key: "home_contact_email",       label: "Contact Email",            placeholder: "sales@example.com"                 },
  { key: "home_whatsapp_retail",     label: "WhatsApp Retail No.",      placeholder: "+86 ... (with country code)"       },
  { key: "home_whatsapp_wholesale",  label: "WhatsApp Wholesale No.",   placeholder: "+86 ... (with country code)"       },
];

// All keys writable by the homepage admin
export const HOME_ALLOWED_KEYS = new Set([
  ...HOME_IMAGE_SLOTS.map((s) => s.key),
  ...HOME_FEATURED_SLOTS.map((s) => s.key),
  ...HOME_SOCIAL_SLOTS.map((s) => s.key),
  "shippingProofFeedbackGallery",
]);

// r2Key → settings key  (upload route updates JSON after each image upload)
export const R2_KEY_TO_SETTINGS_KEY = new Map(HOME_IMAGE_SLOTS.map((s) => [s.r2Key, s.key]));

// Allowed R2 image keys (strict upload allowlist)
export const ALLOWED_R2_KEYS = new Set(HOME_IMAGE_SLOTS.map((s) => s.r2Key));

// ---------------------------------------------------------------------------
// R2 JSON location
// ---------------------------------------------------------------------------

export const SETTINGS_R2_KEY = "site/home/homepage-settings.json";
const HOMEPAGE_SETTINGS_REVALIDATE_SECONDS = 30;

export function settingsPublicUrl(): string {
  const base = (process.env.R2_PUBLIC_BASE_URL || "https://img.linmuse.com").replace(/\/$/, "");
  return `${base}/${SETTINGS_R2_KEY}`;
}

// ---------------------------------------------------------------------------
// Server-side types
// ---------------------------------------------------------------------------

export type HomepageSettings = {
  /** Flat map: settings key → URL (R2 or fallback) */
  images: Record<string, string>;
  /** Flat map: settings key → product code */
  featuredCodes: Record<string, string>;
  social: {
    telegram:          string;
    whatsapp:          string;
    instagram:         string;
    facebook:          string;
    email:             string;
    whatsappRetail:    string;
    whatsappWholesale: string;
  };
  shippingProofFeedbackGallery: ShippingProofFeedbackItem[];
};

export type ShippingProofFeedbackItem = {
  id: string;
  url: string;
  r2Key: string;
  label: string;
  order: number;
  visible: boolean;
};

/**
 * Server-side: fetch public settings from the CDN cache first, then fall back
 * to SigV4-signed direct R2 GET if the public read fails.
 * Never throws — falls back to local mock images on any error.
 */
export async function getHomepageSettings(): Promise<HomepageSettings> {
  const raw = await readHomepageSettingsRaw();

  const images: Record<string, string> = {};
  for (const slot of HOME_IMAGE_SLOTS) {
    const value = raw[slot.key];
    images[slot.key] = typeof value === "string" && value ? value : slot.fallback;
  }

  const featuredCodes: Record<string, string> = {};
  for (const slot of HOME_FEATURED_SLOTS) {
    const value = raw[slot.key];
    featuredCodes[slot.key] = typeof value === "string" && value ? value : slot.fallback;
  }

  const storedGallery = Array.isArray(raw.shippingProofFeedbackGallery)
    ? raw.shippingProofFeedbackGallery
    : [];
  const shippingProofFeedbackGallery = storedGallery
    .map((item, index): ShippingProofFeedbackItem | null => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const url = typeof row.url === "string" ? row.url : "";
      if (!url) return null;
      return {
        id: typeof row.id === "string" && row.id ? row.id : `feedback-${index + 1}`,
        url,
        r2Key: typeof row.r2Key === "string" ? row.r2Key : "",
        label: typeof row.label === "string" && row.label ? row.label : `Customer feedback ${index + 1}`,
        order: Number.isFinite(Number(row.order)) ? Number(row.order) : index + 1,
        visible: row.visible !== false,
      };
    })
    .filter((item): item is ShippingProofFeedbackItem => Boolean(item))
    .sort((a, b) => a.order - b.order);

  return {
    images,
    featuredCodes,
    social: {
      telegram:          getString(raw, "home_link_telegram"),
      whatsapp:          getString(raw, "home_link_whatsapp"),
      instagram:         getString(raw, "home_link_instagram"),
      facebook:          getString(raw, "home_link_facebook"),
      email:             getString(raw, "home_contact_email"),
      whatsappRetail:    getString(raw, "home_whatsapp_retail"),
      whatsappWholesale: getString(raw, "home_whatsapp_wholesale"),
    },
    shippingProofFeedbackGallery,
  };
}

async function readHomepageSettingsRaw(): Promise<Record<string, unknown>> {
  const cdnRaw = await readCdnJson<unknown>(
    settingsPublicUrl(),
    HOMEPAGE_SETTINGS_REVALIDATE_SECONDS,
  );
  if (isRecord(cdnRaw)) return cdnRaw;

  const r2Raw = await getR2Json<unknown>(SETTINGS_R2_KEY);
  if (isRecord(r2Raw)) return r2Raw;

  return {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getString(raw: Record<string, unknown>, key: string) {
  const value = raw[key];
  return typeof value === "string" ? value : "";
}
