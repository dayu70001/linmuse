import { imageSlots, settingSlots } from "@/lib/adminConfig";

type ImageRow = {
  key: string;
  image_url: string | null;
  alt_text: string | null;
};

type SettingRow = {
  key: string;
  value: string | null;
};

export type SiteImageMap = Record<string, { url: string; alt: string }>;
export type SiteSettingsMap = Record<string, string>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && anonKey);
}

async function supabaseSelect<T>(table: string, columns: string): Promise<T[]> {
  if (!hasSupabaseConfig()) {
    return [];
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=${columns}`, {
      headers: {
        apikey: anonKey || "",
        Authorization: `Bearer ${anonKey}`,
      },
      next: { revalidate: 30 },
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as T[];
  } catch {
    return [];
  }
}

export async function getSiteImages(): Promise<SiteImageMap> {
  const rows = await supabaseSelect<ImageRow>("site_images", "key,image_url,alt_text");
  const data = new Map(rows.map((row) => [row.key, row]));

  return Object.fromEntries(
    imageSlots.map((slot) => {
      const row = data.get(slot.key);
      return [
        slot.key,
        {
          url: row?.image_url || slot.fallback,
          alt: row?.alt_text || slot.altText,
        },
      ];
    })
  );
}

export async function getSiteSettings(): Promise<SiteSettingsMap> {
  const rows = await supabaseSelect<SettingRow>("site_settings", "key,value");
  const data = new Map(rows.map((row) => [row.key, row.value || ""]));

  return Object.fromEntries(
    settingSlots.map((slot) => [slot.key, data.get(slot.key) || slot.fallback])
  );
}

export function getSetting(settings: SiteSettingsMap, key: string) {
  return settings[key] || "";
}

export function getImage(images: SiteImageMap, key: string) {
  return images[key] || { url: "", alt: "" };
}
