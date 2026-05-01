export type ImageSlot = {
  key: string;
  label: string;
  section: string;
  fallback: string;
  altText: string;
  sortOrder: number;
};

export type SettingSlot = {
  key: string;
  label: string;
  section: string;
  fallback: string;
};

export const imageSlots: ImageSlot[] = [
  {
    key: "hero_main_image",
    label: "Homepage Main Image",
    section: "Homepage",
    fallback: "/images/mock/hero-collection.jpg",
    altText: "Neutral fashion product composition for LM Dkbrand",
    sortOrder: 1,
  },
  {
    key: "category_apparel",
    label: "Apparel Category Image",
    section: "Category Images",
    fallback: "/images/mock/category-apparel.jpg",
    altText: "Neutral apparel selection for LM Dkbrand",
    sortOrder: 10,
  },
  {
    key: "category_shoes",
    label: "Shoes Category Image",
    section: "Category Images",
    fallback: "/images/mock/category-shoes.jpg",
    altText: "Curated lifestyle shoes for retail and wholesale",
    sortOrder: 11,
  },
  {
    key: "category_watches",
    label: "Watches Category Image",
    section: "Category Images",
    fallback: "/images/mock/category-watches.jpg",
    altText: "Minimal fashion watches selection",
    sortOrder: 12,
  },
  {
    key: "category_bags",
    label: "Bags Category Image",
    section: "Category Images",
    fallback: "/images/mock/category-bags.jpg",
    altText: "Fashion bags selection for retail buyers",
    sortOrder: 13,
  },
  {
    key: "new_arrival_apparel",
    label: "New Arrival Apparel Image",
    section: "New Arrival Preview Images",
    fallback: "/images/mock/product-apparel-001.jpg",
    altText: "Refined casual apparel preview",
    sortOrder: 20,
  },
  {
    key: "new_arrival_shoes",
    label: "New Arrival Shoes Image",
    section: "New Arrival Preview Images",
    fallback: "/images/mock/product-shoes-001.jpg",
    altText: "Everyday lifestyle sneaker preview",
    sortOrder: 21,
  },
  {
    key: "new_arrival_watches",
    label: "New Arrival Watches Image",
    section: "New Arrival Preview Images",
    fallback: "/images/mock/product-watches-001.jpg",
    altText: "Minimal everyday watch preview",
    sortOrder: 22,
  },
  {
    key: "new_arrival_bags",
    label: "New Arrival Bags Image",
    section: "New Arrival Preview Images",
    fallback: "/images/mock/product-bags-001.jpg",
    altText: "Structured daily tote preview",
    sortOrder: 23,
  },
  {
    key: "factory_01",
    label: "Material Checking Image",
    section: "Factory Direct Images",
    fallback: "/images/mock/factory-production-001.jpg",
    altText: "Factory preparation update",
    sortOrder: 30,
  },
  {
    key: "factory_02",
    label: "Production Updates Image",
    section: "Factory Direct Images",
    fallback: "/images/mock/factory-production-002.jpg",
    altText: "Factory production update",
    sortOrder: 31,
  },
  {
    key: "factory_03",
    label: "Packing Preparation Image",
    section: "Factory Direct Images",
    fallback: "/images/mock/factory-production-003.jpg",
    altText: "Factory packing preparation",
    sortOrder: 32,
  },
  {
    key: "shipping_01",
    label: "Packing Photos Image",
    section: "Shipping Proof Images",
    fallback: "/images/mock/shipping-proof-001.jpg",
    altText: "Packing and shipping proof",
    sortOrder: 40,
  },
  {
    key: "shipping_02",
    label: "Shipping Updates Image",
    section: "Shipping Proof Images",
    fallback: "/images/mock/shipping-proof-002.jpg",
    altText: "Packing and shipping update",
    sortOrder: 41,
  },
  {
    key: "shipping_04",
    label: "Warehouse Updates Image",
    section: "Shipping Proof Images",
    fallback: "/images/mock/factory-production-003.jpg",
    altText: "Warehouse preparation update",
    sortOrder: 43,
  },
  {
    key: "customer_feedback_01",
    label: "Feedback 01",
    section: "Customer Feedback Gallery",
    fallback: "/images/mock/shipping-proof-003.jpg",
    altText: "Buyer feedback with private details hidden",
    sortOrder: 50,
  },
  {
    key: "customer_feedback_02",
    label: "Feedback 02",
    section: "Customer Feedback Gallery",
    fallback: "/images/mock/shipping-proof-001.jpg",
    altText: "Buyer feedback with private details hidden",
    sortOrder: 51,
  },
  {
    key: "customer_feedback_03",
    label: "Feedback 03",
    section: "Customer Feedback Gallery",
    fallback: "/images/mock/shipping-proof-002.jpg",
    altText: "Buyer feedback with private details hidden",
    sortOrder: 52,
  },
  {
    key: "customer_feedback_04",
    label: "Feedback 04",
    section: "Customer Feedback Gallery",
    fallback: "/images/mock/factory-production-001.jpg",
    altText: "Buyer feedback with private details hidden",
    sortOrder: 53,
  },
  {
    key: "customer_feedback_05",
    label: "Feedback 05",
    section: "Customer Feedback Gallery",
    fallback: "/images/mock/factory-production-002.jpg",
    altText: "Buyer feedback with private details hidden",
    sortOrder: 54,
  },
  {
    key: "customer_feedback_06",
    label: "Feedback 06",
    section: "Customer Feedback Gallery",
    fallback: "/images/mock/factory-production-003.jpg",
    altText: "Buyer feedback with private details hidden",
    sortOrder: 55,
  },
];

export const settingSlots: SettingSlot[] = [
  { key: "whatsapp_retail", label: "WhatsApp retail number", section: "Contact", fallback: "" },
  { key: "whatsapp_wholesale", label: "WhatsApp wholesale number", section: "Contact", fallback: "" },
  { key: "whatsapp_after_sales", label: "WhatsApp after-sales number", section: "Contact", fallback: "" },
  { key: "telegram_channel", label: "Telegram channel", section: "Social", fallback: "" },
  { key: "instagram_url", label: "Instagram URL", section: "Social", fallback: "" },
  { key: "facebook_url", label: "Facebook URL", section: "Social", fallback: "" },
  { key: "email", label: "Email", section: "Contact", fallback: "sales@lmdkbrand.com" },
];

export const groupedImageSlots = imageSlots.reduce<Record<string, ImageSlot[]>>((groups, slot) => {
  groups[slot.section] = [...(groups[slot.section] || []), slot];
  return groups;
}, {});
