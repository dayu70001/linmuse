"use client";

import { useEffect, useState } from "react";
import { settingSlots } from "@/lib/adminConfig";
import { fetchAdminSettings, type AdminSettingRow, upsertSettingRows } from "@/lib/supabaseRest";

export function SettingsEditor() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const rows = await fetchAdminSettings();
        const data = Object.fromEntries(rows.map((row) => [row.key, row.value || ""]));
        setValues(Object.fromEntries(settingSlots.map((slot) => [slot.key, data[slot.key] || slot.fallback])));
      } catch {
        setValues(Object.fromEntries(settingSlots.map((slot) => [slot.key, slot.fallback])));
      }
    }
    load();
  }, []);

  async function save() {
    setMessage("");
    setError("");
    try {
      const rows: AdminSettingRow[] = settingSlots.map((slot) => ({
        key: slot.key,
        value: values[slot.key] || "",
        label: slot.label,
        section: slot.section,
      }));
      await upsertSettingRows(rows);
      setMessage("Saved. Contact links will use these settings.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save failed");
    }
  }

  return (
    <div className="card p-6">
      <div className="grid gap-4 md:grid-cols-2">
        {settingSlots.map((slot) => (
          <label className="text-sm font-bold text-ink" key={slot.key}>
            {slot.label}
            <input
              className="mt-2 min-h-11 w-full rounded border border-line px-3 text-sm font-normal outline-none focus:border-gold"
              onChange={(event) => setValues((current) => ({ ...current, [slot.key]: event.target.value }))}
              value={values[slot.key] || ""}
            />
          </label>
        ))}
      </div>
      {message ? <p className="mt-4 text-sm font-semibold text-muted">{message}</p> : null}
      {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}
      <button className="btn-primary mt-6" onClick={save} type="button">
        Save
      </button>
    </div>
  );
}
