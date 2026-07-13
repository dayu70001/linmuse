export const SITE_URL = "https://linmuse.com";
export const SITE_NAME = "LM Dkbrand";

export function safeAbsoluteUrl(value: string | null | undefined) {
  const text = String(value || "").trim();
  if (!text) return undefined;

  try {
    return new URL(text, SITE_URL).toString();
  } catch {
    return undefined;
  }
}

export function buildCanonical(path: string) {
  return new URL(path, SITE_URL).toString();
}

function cleanJsonLd(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cleanJsonLd).filter((item) => item !== undefined && item !== null && item !== "");
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, cleanJsonLd(item)] as const)
        .filter(([, item]) => item !== undefined && item !== null && item !== ""),
    );
  }

  return value;
}

export function jsonLdStringify(data: unknown) {
  return JSON.stringify(cleanJsonLd(data)).replace(/</g, "\\u003c");
}

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildCanonical(item.path),
    })),
  };
}

export type FaqItem = {
  question: string;
  answer: string;
};

export function buildFaqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
