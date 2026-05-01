export type AdminImageRow = {
  key: string;
  label: string;
  section: string;
  image_url: string | null;
  alt_text: string | null;
  sort_order: number | null;
};

export type AdminSettingRow = {
  key: string;
  value: string | null;
  label: string | null;
  section: string | null;
};

export type AdminProductRow = {
  product_code: string;
  slug: string;
  category: string;
  title_en: string;
  main_image_url: string | null;
  main_thumbnail_url: string | null;
  status: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  import_batch_id: string | null;
  imported_at: string | null;
  source_fingerprint: string | null;
  created_at: string | null;
};

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function isSupabaseConfigured() {
  return Boolean(url && anonKey);
}

export async function signInAdmin(email: string, password: string) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.msg || "Login failed");
  }

  localStorage.setItem("lm_admin_access_token", data.access_token);
  localStorage.setItem("lm_admin_refresh_token", data.refresh_token);
  return data;
}

export function getAdminToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("lm_admin_access_token") || "";
}

export function signOutAdmin() {
  localStorage.removeItem("lm_admin_access_token");
  localStorage.removeItem("lm_admin_refresh_token");
}

function authHeaders(token = getAdminToken()) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
  };
}

async function restFetch<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Supabase request failed");
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export async function fetchAdminImages() {
  return restFetch<AdminImageRow[]>("site_images?select=key,label,section,image_url,alt_text,sort_order&order=sort_order.asc");
}

export async function fetchAdminSettings() {
  return restFetch<AdminSettingRow[]>("site_settings?select=key,value,label,section&order=key.asc");
}

export async function fetchAdminProducts() {
  return restFetch<AdminProductRow[]>(
    "products?select=product_code,slug,category,title_en,main_image_url,main_thumbnail_url,status,is_active,is_featured,import_batch_id,imported_at,source_fingerprint,created_at&order=created_at.desc"
  );
}

export async function upsertImageRow(row: AdminImageRow) {
  return restFetch<AdminImageRow[]>("site_images?on_conflict=key", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  });
}

export async function upsertSettingRows(rows: AdminSettingRow[]) {
  return restFetch<AdminSettingRow[]>("site_settings?on_conflict=key", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });
}

export async function updateAdminProduct(
  productCode: string,
  updates: Pick<AdminProductRow, "is_active" | "is_featured"> | Partial<AdminProductRow>
) {
  return restFetch<AdminProductRow[]>(
    `products?product_code=eq.${encodeURIComponent(productCode)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(updates),
    }
  );
}

export async function updateAdminProductsByCodes(
  productCodes: string[],
  updates: Pick<AdminProductRow, "is_active" | "is_featured"> | Partial<AdminProductRow>
) {
  if (productCodes.length === 0) {
    return [];
  }
  const values = productCodes.map((code) => `"${code.replaceAll('"', '\\"')}"`).join(",");
  return restFetch<AdminProductRow[]>(
    `products?product_code=in.(${values})`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(updates),
    }
  );
}

export async function updateAdminProductsByBatch(
  importBatchId: string,
  updates: Pick<AdminProductRow, "is_active" | "is_featured"> | Partial<AdminProductRow>
) {
  return restFetch<AdminProductRow[]>(
    `products?import_batch_id=eq.${encodeURIComponent(importBatchId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(updates),
    }
  );
}

export async function uploadSiteImage(section: string, key: string, file: File) {
  const extension = file.name.split(".").pop() || "jpg";
  const cleanName = `${Date.now()}.${extension.toLowerCase()}`;
  const path = `site/${section.toLowerCase().replaceAll(" ", "-")}/${key}/${cleanName}`;

  const response = await fetch(`${url}/storage/v1/object/site-images/${path}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Image upload failed");
  }

  return `${url}/storage/v1/object/public/site-images/${path}`;
}
