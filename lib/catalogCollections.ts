import type { BreadcrumbItem, FaqItem } from "@/lib/seo";

export type CatalogCollectionSection = {
  heading: string;
  paragraphs: string[];
};

export type CatalogCollectionConfig = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  category: string;
  subcategories: string[];
  breadcrumbs: BreadcrumbItem[];
  wholesalePage: { href: string; label: string };
  catalogPage: { href: string; label: string };
  sections: CatalogCollectionSection[];
  faqs: FaqItem[];
  sitemap: boolean;
};

const configs = {
  "wholesale-t-shirts": {
    slug: "wholesale-t-shirts",
    title: "Wholesale T-Shirts Collection | LM Dkbrand",
    description: "Browse wholesale T-shirts by product code, compare current styles, and confirm fabric, sizing, color, print, and quantity details before ordering.",
    h1: "Wholesale T-Shirts",
    eyebrow: "Apparel collection",
    intro: "Browse current T-shirts classified in the Apparel catalog under the formal T-Shirts subcategory. The products below are loaded from the live catalog, so buyers can review available product codes before asking about sizes, colors, materials, quantities, and destination-specific shipping options.",
    category: "Apparel",
    subcategories: ["T-Shirts"],
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Catalog", path: "/catalog" },
      { name: "Wholesale T-Shirts", path: "/catalog/wholesale-t-shirts" },
    ],
    wholesalePage: { href: "/wholesale-clothing", label: "Wholesale Clothing Supplier" },
    catalogPage: { href: "/catalog?category=Apparel&subcategory=T-Shirts", label: "Open the Apparel Catalog Filter" },
    sections: [
      {
        heading: "Review Fabric and Construction",
        paragraphs: [
          "A T-shirt order should start with the exact product code rather than a general description. Similar silhouettes can use different fabric weights, blends, finishes, necklines, or construction details. Save the codes for the styles you want to compare, then ask which material and product details are currently available for each one.",
          "If fabric weight, stretch, texture, or care requirements matter to your customers, include those questions before confirming a quantity. Product photographs help narrow the choice, but they do not replace confirmation of the details that influence fit, handling, and everyday wear.",
        ],
      },
      {
        heading: "Plan Sizes, Colors, and Decoration Details",
        paragraphs: [
          "Prepare a size and color breakdown for every selected product code. Do not assume two T-shirts use the same measurements simply because their visual shape is similar. General sizing notes may be available in a listing, while precise measurements or current size availability should be confirmed before the order is finalized.",
          "For printed, graphic, embroidered, or otherwise decorated styles, confirm the visible design and placement for the exact item under review. This collection intentionally uses only the formal T-Shirts classification and does not automatically mix in the separate T-Shirts & Polos subcategory.",
        ],
      },
      {
        heading: "Build a Testable T-Shirt Assortment",
        paragraphs: [
          "A first assortment can combine a limited number of product codes across selected sizes and colors. Testing a focused range makes it easier to compare customer response, fit feedback, and repeat demand without treating every style as equally proven from the start.",
          "Keep a record of the product code, size mix, color mix, and quantity ordered. When a style performs well, that record provides a clear starting point for a repeat inquiry. Availability still needs to be reconfirmed because catalog products and quantities can change over time.",
        ],
      },
    ],
    faqs: [
      { question: "Are polos included in this T-shirt collection?", answer: "No. This page uses only the formal T-Shirts subcategory and does not automatically include products classified as T-Shirts & Polos." },
      { question: "How should I ask about T-shirt sizing?", answer: "Save the product code and request the available size range, sizing notes, and any measurements needed for that exact style before confirming quantities." },
      { question: "Can I use the products below to prepare a mixed order?", answer: "You can shortlist multiple visible product codes and send the desired size, color, and quantity breakdown for an availability check before ordering." },
    ],
    sitemap: true,
  },
  "wholesale-jackets-coats": {
    slug: "wholesale-jackets-coats",
    title: "Wholesale Jackets & Coats Collection | LM Dkbrand",
    description: "Browse wholesale jackets and coats from two formal Apparel subcategories and confirm season, material, sizing, construction, and quantities by product code.",
    h1: "Wholesale Jackets & Coats",
    eyebrow: "Outerwear collection",
    intro: "This combined outerwear collection brings together products formally classified as Jackets and as Jackets & Coats. It does not change the underlying classifications: the live results merge both approved subcategories so buyers can compare relevant outer layers in one place while retaining the exact product code for every inquiry.",
    category: "Apparel",
    subcategories: ["Jackets", "Jackets & Coats"],
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Catalog", path: "/catalog" },
      { name: "Wholesale Jackets & Coats", path: "/catalog/wholesale-jackets-coats" },
    ],
    wholesalePage: { href: "/wholesale-clothing", label: "Wholesale Clothing Supplier" },
    catalogPage: { href: "/catalog?category=Apparel", label: "Browse the Apparel Catalog" },
    sections: [
      {
        heading: "Match Outerwear to Season and Use",
        paragraphs: [
          "Jackets and coats can serve different climates, seasons, and customer needs, so the product code must stay attached to every question. A lightweight layer, structured jacket, insulated coat, or transitional outer piece may require different material, lining, closure, and care checks even when the product photographs appear similar.",
          "Before selecting quantities, decide whether the assortment is intended for mild weather, colder conditions, everyday layering, or a more formal use. Ask for the details available for each shortlisted code rather than assuming that every item in a combined outerwear collection provides the same level of warmth or protection.",
        ],
      },
      {
        heading: "Confirm Material, Lining, and Construction",
        paragraphs: [
          "Outerwear quality and handling depend on more than the exterior appearance. Confirm the available material information, lining, closure type, pockets, trims, and any care notes that affect how the garment should be presented or maintained. If a specific construction detail is essential, include it in the inquiry before the order is confirmed.",
          "Photographs can support an initial comparison, but exact color, texture, and finish can vary by screen and product. Request clarification for the current product code and batch when those details influence your buying decision.",
        ],
      },
      {
        heading: "Prepare an Outerwear Size Plan",
        paragraphs: [
          "Jackets and coats are often worn over other clothing, so buyers may need to consider layering as well as body measurements. Prepare a size breakdown for each code and ask whether style-specific measurements or fitting notes are available. Do not transfer the size assumptions from one outerwear product to another without confirmation.",
          "For a first order, a focused range can help evaluate construction, fit, customer response, and seasonal suitability. Keep the product codes and size mix in the order record, then reconfirm availability before planning any repeat or larger quantity.",
        ],
      },
    ],
    faqs: [
      { question: "Why does this page combine two subcategories?", answer: "The catalog currently uses the formal subcategories Jackets and Jackets & Coats. This page merges their live results for browsing without changing the stored product classifications." },
      { question: "How do I compare warmth or seasonality?", answer: "Shortlist the exact product codes and ask for available material, lining, construction, and season-related details before choosing quantities." },
      { question: "Are the displayed products guaranteed to remain available?", answer: "No. The list reflects current catalog results, while availability and quantities must be confirmed for the selected product codes before ordering." },
    ],
    sitemap: true,
  },
  "wholesale-sneakers": {
    slug: "wholesale-sneakers",
    title: "Wholesale Sneakers Collection | LM Dkbrand",
    description: "Browse wholesale sneakers from the formal Sneakers subcategory and confirm size runs, materials, fit notes, colorways, and quantities by product code.",
    h1: "Wholesale Sneakers",
    eyebrow: "Shoes collection",
    intro: "Browse live shoe products formally classified under Sneakers. Each card links to an actual product detail page and keeps the product code visible, giving buyers a precise reference for size-range, color, material, construction, quantity, and destination inquiries.",
    category: "Shoes",
    subcategories: ["Sneakers"],
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Catalog", path: "/catalog" },
      { name: "Wholesale Sneakers", path: "/catalog/wholesale-sneakers" },
    ],
    wholesalePage: { href: "/wholesale-shoes", label: "Wholesale Shoes Supplier" },
    catalogPage: { href: "/catalog?category=Shoes&subcategory=Sneakers", label: "Open the Sneakers Catalog Filter" },
    sections: [
      {
        heading: "Start with the Exact Sneaker Style",
        paragraphs: [
          "Sneaker sourcing is sensitive to fit, construction, and size availability. Save the product code for each style instead of relying on a general description or screenshot alone. The code allows the current size range, colorway, material notes, and other product-specific details to be checked against the correct listing.",
          "Visual similarities do not guarantee identical fit or construction. Two products may differ in sole profile, upper material, lining, closure, or intended everyday use, so any essential detail should be confirmed before quantities are finalized.",
        ],
      },
      {
        heading: "Plan a Practical Size Run",
        paragraphs: [
          "A wholesale sneaker order usually needs a considered size mix rather than one repeated size. Prepare the preferred size run for each product code and ask which sizes are currently available. If measurements or fitting notes are needed, request them for the exact style under consideration.",
          "Demand can differ across customer groups, so a first size run should reflect the audience you already serve or want to test. Record the sizes that sell and those that remain, then use that evidence to adjust a future inquiry rather than automatically repeating the same breakdown.",
        ],
      },
      {
        heading: "Test Before Expanding Quantity",
        paragraphs: [
          "When fit, finish, or material is especially important, starting with a limited quantity can provide a direct product check before a larger commitment. A test does not guarantee future stock, but it can clarify whether a style matches the expectations of the buyer and their customers.",
          "Keep the product code, selected sizes, colors, quantity, and order date in a simple purchasing record. For a repeat order, send the same code and updated requirements so current availability can be confirmed again.",
        ],
      },
    ],
    faqs: [
      { question: "How do I confirm a sneaker size run?", answer: "Send the product code with your preferred sizes and quantities, then ask for current size availability and any style-specific fitting notes before confirming the order." },
      { question: "Can I compare several sneaker styles?", answer: "Yes. Save the visible product codes and prepare the size and quantity requirements for each style so they can be checked separately." },
      { question: "Does this page include every type of shoe?", answer: "No. It uses only products formally classified in the Shoes category and Sneakers subcategory." },
    ],
    sitemap: true,
  },
  "wholesale-handbags": {
    slug: "wholesale-handbags",
    title: "Wholesale Handbags Collection | LM Dkbrand",
    description: "Browse wholesale handbags by product code and confirm dimensions, materials, hardware, closures, internal structure, colors, and quantities before ordering.",
    h1: "Wholesale Handbags",
    eyebrow: "Bags collection",
    intro: "Browse current products formally classified as Handbags in the Bags catalog. Use the live product cards to create a shortlist, then confirm dimensions, materials, hardware, internal layout, color options, quantities, and shipping details for the exact codes you select.",
    category: "Bags",
    subcategories: ["Handbags"],
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Bags Catalog", path: "/catalog/bags" },
      { name: "Wholesale Handbags", path: "/catalog/wholesale-handbags" },
    ],
    wholesalePage: { href: "/wholesale-bags", label: "Wholesale Bags Supplier" },
    catalogPage: { href: "/catalog?category=Bags&subcategory=Handbags", label: "Open the Handbags Catalog Filter" },
    sections: [
      {
        heading: "Compare Dimensions and Carrying Use",
        paragraphs: [
          "Handbag photographs do not always communicate scale, so dimensions should be part of the product-code inquiry. Consider what the intended customer needs to carry, whether the shape should hold its structure, and how the bag is expected to move between daily, work, occasion, or display use.",
          "If capacity or proportions are essential, request the available measurements for the exact code. Avoid assuming that two visually similar handbags provide the same interior space or handle drop.",
        ],
      },
      {
        heading: "Check Materials, Hardware, and Closures",
        paragraphs: [
          "A useful handbag comparison includes the exterior material, lining, handles, straps, closure, feet, zippers, fasteners, and other visible hardware. Ask which details are available for the current product and whether any removable or adjustable components are included.",
          "Color and finish can appear different across screens and lighting. When a specific shade, texture, or hardware tone matters, raise that requirement before confirming a larger quantity and request current product information where available.",
        ],
      },
      {
        heading: "Plan a Balanced Handbag Selection",
        paragraphs: [
          "A mixed first selection can compare different sizes, shapes, and practical uses without assuming one handbag format will suit every customer. Keep the assortment focused enough that sales and feedback can be tied back to the individual product codes.",
          "Record the code, color, quantity, and relevant product notes for every ordered style. That record supports accurate replenishment inquiries and helps prevent visually similar products from being confused when the catalog changes.",
        ],
      },
    ],
    faqs: [
      { question: "What handbag details should I confirm before ordering?", answer: "Confirm the exact product code, dimensions, material information, hardware, closure, internal layout, colors, quantity, and destination requirements relevant to your order." },
      { question: "Are all bags shown on this page handbags?", answer: "The live list is restricted to products formally stored in the Bags category with the Handbags subcategory." },
      { question: "How do I prepare a handbag shortlist?", answer: "Open the relevant product pages, save each product code, and note the preferred color and quantity before requesting an availability check." },
    ],
    sitemap: true,
  },
  "wholesale-tote-bags": {
    slug: "wholesale-tote-bags",
    title: "Wholesale Tote Bags Collection | LM Dkbrand",
    description: "Browse wholesale tote bags and confirm capacity, dimensions, materials, handles, closures, internal features, colors, and quantities by product code.",
    h1: "Wholesale Tote Bags",
    eyebrow: "Bags collection",
    intro: "Browse live products formally classified as Tote Bags. Each product code provides a precise reference for confirming capacity, dimensions, material, handle construction, closure, internal organization, color, quantity, and destination-specific shipping options.",
    category: "Bags",
    subcategories: ["Tote Bags"],
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Bags Catalog", path: "/catalog/bags" },
      { name: "Wholesale Tote Bags", path: "/catalog/wholesale-tote-bags" },
    ],
    wholesalePage: { href: "/wholesale-bags", label: "Wholesale Bags Supplier" },
    catalogPage: { href: "/catalog?category=Bags&subcategory=Tote+Bags", label: "Open the Tote Bags Catalog Filter" },
    sections: [
      {
        heading: "Choose Capacity for the Intended Use",
        paragraphs: [
          "Tote bags can serve everyday carrying, work, travel, shopping, gifting, or display needs, but the same label can cover very different sizes and structures. Begin by defining the intended use, then compare the visible product codes and request dimensions for the styles that fit that purpose.",
          "Capacity should be evaluated together with the opening, base, side structure, and interior. A broad exterior does not necessarily indicate the same usable space as another tote, especially when closures, compartments, or structured panels affect the inside.",
        ],
      },
      {
        heading: "Confirm Material, Handles, and Closure",
        paragraphs: [
          "Ask about the available exterior and lining information, handle construction, handle drop, removable straps, closure type, and internal pockets for the exact product code. These details influence comfort, durability, organization, and how the item should be presented to customers.",
          "If a tote is expected to carry heavier everyday items, make that use clear in the inquiry rather than inferring performance from a photograph. Product suitability and current details need to be checked for the selected style before quantity is confirmed.",
        ],
      },
      {
        heading: "Build a Tote Bag Test Range",
        paragraphs: [
          "A first assortment can compare a few capacities, materials, and handle formats across a controlled number of product codes. This creates useful sales and customer feedback without spreading the opening order across too many near-duplicate choices.",
          "Keep a record of code, color, quantity, dimensions, and any confirmed features. If a tote performs well, use that record for the next availability check. The live catalog can change, so a prior purchase should not be treated as a permanent inventory guarantee.",
        ],
      },
    ],
    faqs: [
      { question: "How can I judge tote bag capacity?", answer: "Use the exact product code and request available dimensions and internal details; photographs alone may not show scale or usable capacity accurately." },
      { question: "What handle details should I check?", answer: "Confirm handle construction and drop, and ask whether any additional removable or adjustable strap is included for the selected product code." },
      { question: "Does this collection include other bag types?", answer: "No. The dynamic list uses the formal Bags category and Tote Bags subcategory only." },
    ],
    sitemap: true,
  },
  "wholesale-crossbody-bags": {
    slug: "wholesale-crossbody-bags",
    title: "Wholesale Crossbody Bags Collection | LM Dkbrand",
    description: "Browse wholesale crossbody bags and confirm dimensions, strap adjustment, materials, closures, compartments, colors, and quantities by product code.",
    h1: "Wholesale Crossbody Bags",
    eyebrow: "Bags collection",
    intro: "Browse current products formally classified as Crossbody Bags. The live collection keeps each product code connected to its detail page so buyers can confirm dimensions, materials, strap configuration, closure, compartments, colors, quantities, and destination requirements for the styles they shortlist.",
    category: "Bags",
    subcategories: ["Crossbody Bags"],
    breadcrumbs: [
      { name: "Home", path: "/" },
      { name: "Bags Catalog", path: "/catalog/bags" },
      { name: "Wholesale Crossbody Bags", path: "/catalog/wholesale-crossbody-bags" },
    ],
    wholesalePage: { href: "/wholesale-bags", label: "Wholesale Bags Supplier" },
    catalogPage: { href: "/catalog?category=Bags&subcategory=Crossbody+Bags", label: "Open the Crossbody Bags Catalog Filter" },
    sections: [
      {
        heading: "Compare Size and Everyday Function",
        paragraphs: [
          "Crossbody bags range from compact essentials carriers to larger everyday formats. Decide what the target customer needs to carry, then request dimensions for the exact product codes under review. Images can help compare shape, but they may not provide a reliable sense of scale or interior capacity.",
          "Consider access as well as size. The opening, compartment layout, and closure can affect how the bag works in daily use, so these features should be checked before deciding that two similar silhouettes serve the same purpose.",
        ],
      },
      {
        heading: "Check Strap, Closure, and Materials",
        paragraphs: [
          "Strap length and adjustment influence where a crossbody bag sits and which customers it may suit. Ask whether the strap is adjustable or removable and request any available length information when that detail matters. Confirm the closure and relevant hardware for the same product code.",
          "Material, lining, edge finish, zippers, fasteners, and hardware tone can also affect the selection. Raise any essential requirement before confirming quantities instead of relying on the appearance of a screen image alone.",
        ],
      },
      {
        heading: "Select Styles Without Unnecessary Duplication",
        paragraphs: [
          "When building a crossbody assortment, compare size, structure, closure, and intended use rather than selecting many products with nearly identical functions. A focused opening range makes it easier to understand which formats customers actually prefer.",
          "Save the code, color, quantity, and confirmed details for every chosen style. These records support accurate repeat inquiries and reduce the risk of confusing similar products. Availability still needs to be checked again when a new order is prepared.",
        ],
      },
    ],
    faqs: [
      { question: "What should I confirm about a crossbody strap?", answer: "Ask whether the strap is adjustable or removable and request any available length or drop information for the exact product code." },
      { question: "How do I compare internal capacity?", answer: "Request dimensions and available compartment details for each shortlisted product rather than estimating capacity from photographs alone." },
      { question: "Which products appear in this collection?", answer: "Only live products formally classified in the Bags category and Crossbody Bags subcategory are requested for this page." },
    ],
    sitemap: true,
  },
} satisfies Record<string, CatalogCollectionConfig>;

export type CatalogCollectionSlug = keyof typeof configs;

export function getCatalogCollection(slug: CatalogCollectionSlug) {
  return configs[slug];
}

export const catalogCollections = Object.values(configs);
