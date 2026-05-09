export const ALL_CATEGORY = "All";

export const CATEGORY_DISPLAY_ORDER = [
  "Apparel",
  "Shoes",
  "Watches",
  "Bags",
  "Accessories",
  "Towels",
  "Jewelry",
  "Scarves",
  "Home Goods",
];

export const MOBILE_PRIMARY_CATEGORIES = [
  ALL_CATEGORY,
  "Apparel",
  "Shoes",
  "Watches",
  "Bags",
  "Accessories",
];

export const HOME_FEATURED_CATEGORIES = [
  "Apparel",
  "Shoes",
  "Watches",
  "Bags",
  "Accessories",
];

const HIDDEN_VALUES = new Set([
  "",
  "all",
  "other / unknown",
  "other apparel",
  "other shoes",
  "other bags",
  "selected apparel",
  "selected shoes",
  "selected bags",
]);

const SUBCATEGORY_DISPLAY_ORDER: Record<string, string[]> = {
  Apparel: [
    "T-Shirts",
    "Shirts",
    "Shorts",
    "Pants",
    "Jackets & Coats",
    "Hoodies & Sweatshirts",
    "Sweaters & Knitwear",
  ],
  Shoes: [
    "Sneakers",
    "High Heels",
    "Flats",
    "Sandals",
    "Slides",
    "Slides & Sandals",
    "Loafers",
    "Boots",
    "Trainers",
    "Running Shoes",
    "Formal Shoes",
  ],
  Bags: [
    "Handbags",
    "Crossbody & Shoulder Bags",
    "Tote Bags",
    "Travel Bags",
    "Backpacks",
    "Wallets & Cardholders",
  ],
  Watches: [
    "Automatic Watches",
    "Quartz Watches",
    "Chronograph Watches",
    "Diver Watches",
    "Dress Watches",
    "Sports Watches",
    "Couple Watches",
    "Watch Accessories",
  ],
  Accessories: [
    "Jewelry",
    "Belts",
    "Scarves",
    "Sunglasses",
    "Hats",
    "Towels",
  ],
};

const BRAND_ALIAS_MAP: Record<string, string[]> = {
  "Louis Vuitton": ["Louis Vuitton", "LV", "Lv", "lv", "louis vuitton", "路易威登"],
  "Saint Laurent": ["Saint Laurent", "YSL", "Yves Saint Laurent", "ysl", "圣罗兰"],
  "Miu Miu": ["Miu Miu", "Miumiu", "MIUMIU", "miu miu", "miumiu", "缪缪"],
  Hermes: ["Hermes", "Hermès", "HERMES", "hermes", "爱马仕"],
  Dior: ["Dior", "DIOR", "dior", "D家", "迪奥"],
  Chanel: ["Chanel", "CHANEL", "chanel", "香奈儿"],
  Gucci: ["Gucci", "GUCCI", "gucci"],
  Fendi: ["Fendi", "FENDI", "fendi"],
  Celine: ["Celine", "Céline", "CELINE", "celine"],
  Loewe: ["Loewe", "LOEWE", "loewe"],
  Goyard: ["Goyard", "GOYARD", "goyard"],
  Balenciaga: ["Balenciaga", "BALENCIAGA", "balenciaga"],
  Prada: ["Prada", "PRADA", "prada"],
  "Bottega Veneta": ["Bottega Veneta", "Bottega", "BOTTEGA VENETA", "bottega veneta", "bottega"],
  "Tory Burch": ["Tory Burch", "TORY BURCH", "tory burch"],
  "Alexander Wang": ["Alexander Wang", "ALEXANDER WANG", "alexander wang"],
  Nike: ["Nike", "NIKE", "nike"],
  Adidas: ["Adidas", "ADIDAS", "adidas"],
  "New Balance": ["New Balance", "NEW BALANCE", "new balance", "NB"],
  Asics: ["Asics", "ASICS", "asics"],
  Rolex: ["Rolex", "ROLEX", "rolex"],
  "Audemars Piguet": ["Audemars Piguet", "AP", "AUDEMARS PIGUET", "audemars piguet"],
  Cartier: ["Cartier", "CARTIER", "cartier"],
};

export function cleanTaxonomyValue(value: string | null | undefined) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function isVisibleTaxonomyValue(value: string | null | undefined) {
  const text = cleanTaxonomyValue(value);
  return Boolean(text && !HIDDEN_VALUES.has(text.toLowerCase()));
}

function brandKey(value: string | null | undefined) {
  return cleanTaxonomyValue(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s._-]+/g, "");
}

const BRAND_CANONICAL_BY_ALIAS = new Map(
  Object.entries(BRAND_ALIAS_MAP).flatMap(([canonical, aliases]) =>
    aliases.map((alias) => [brandKey(alias), canonical] as const),
  ),
);

export function canonicalizeBrand(value: string | null | undefined) {
  const text = cleanTaxonomyValue(value);
  if (!isVisibleTaxonomyValue(text)) return "";
  return BRAND_CANONICAL_BY_ALIAS.get(brandKey(text)) || text;
}

export function getBrandAliases(canonicalBrand: string | null | undefined) {
  const canonical = canonicalizeBrand(canonicalBrand);
  if (!canonical) return [];
  return Array.from(new Set([canonical, ...(BRAND_ALIAS_MAP[canonical] || [])].map(cleanTaxonomyValue).filter(Boolean)));
}

export function getBrandFilterValues(value: string | null | undefined) {
  return getBrandAliases(value);
}

export function sortBrands(brands: string[]) {
  return [...new Set(brands.map(canonicalizeBrand).filter(isVisibleTaxonomyValue))].sort((a, b) => a.localeCompare(b));
}

export function isAllowedSubcategoryForCategory(category: string | null | undefined, value: string | null | undefined) {
  const cleanCategory = cleanTaxonomyValue(category);
  const cleanValue = cleanTaxonomyValue(value);

  if (!isVisibleTaxonomyValue(cleanValue)) return false;

  const knownOwners = Object.entries(SUBCATEGORY_DISPLAY_ORDER)
    .filter(([, styles]) => styles.includes(cleanValue))
    .map(([owner]) => owner);

  // If this style is already known to belong to another category,
  // do not allow it to leak into the current category.
  // Example: Pants belongs to Apparel, so it must not appear under Shoes.
  if (knownOwners.length > 0) return knownOwners.includes(cleanCategory);

  // Future valid styles are allowed by default.
  // Example: if Shoes later gets "High Tops" or "Formal Sandals" from real data,
  // the UI does not need to be rebuilt.
  return true;
}

export function categoryLabel(category: string) {
  return category === ALL_CATEGORY ? ALL_CATEGORY : cleanTaxonomyValue(category) || "Products";
}

export function stylesLabel(category: string) {
  const label = categoryLabel(category);
  return `${label} styles`;
}

export function allStylesLabel(category: string) {
  const label = categoryLabel(category);
  return `All ${label}`;
}

export function sortCategories(categories: string[]) {
  const unique = [...new Set(categories.map(cleanTaxonomyValue).filter(isVisibleTaxonomyValue))];
  return unique.sort((a, b) => {
    const aIndex = CATEGORY_DISPLAY_ORDER.indexOf(a);
    const bIndex = CATEGORY_DISPLAY_ORDER.indexOf(b);
    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }
    return a.localeCompare(b);
  });
}

export function sortSubcategories(category: string, subcategories: string[]) {
  const order = SUBCATEGORY_DISPLAY_ORDER[category] || [];
  const unique = [...new Set(
    subcategories
      .map(cleanTaxonomyValue)
      .filter((value) => isAllowedSubcategoryForCategory(category, value))
  )];

  return unique.sort((a, b) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex !== -1 || bIndex !== -1) {
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    }

    return a.localeCompare(b);
  });
}
