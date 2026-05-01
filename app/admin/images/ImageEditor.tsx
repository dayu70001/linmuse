"use client";

import { useEffect, useMemo, useState } from "react";
import { groupedImageSlots, imageSlots, type ImageSlot } from "@/lib/adminConfig";
import {
  fetchAdminImages,
  type AdminImageRow,
  uploadSiteImage,
  upsertImageRow,
} from "@/lib/supabaseRest";

type SlotState = {
  currentUrl: string;
  previewUrl: string;
  file?: File;
  status: string;
  error: string;
};

export function ImageEditor() {
  const [rows, setRows] = useState<Record<string, AdminImageRow>>({});
  const [state, setState] = useState<Record<string, SlotState>>({});

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchAdminImages();
        setRows(Object.fromEntries(data.map((row) => [row.key, row])));
      } catch {
        setRows({});
      }
    }
    load();
  }, []);

  const groups = useMemo(() => groupedImageSlots, []);

  function getSlotState(slot: ImageSlot) {
    return (
      state[slot.key] || {
        currentUrl: rows[slot.key]?.image_url || slot.fallback,
        previewUrl: rows[slot.key]?.image_url || slot.fallback,
        status: "",
        error: "",
      }
    );
  }

  function chooseFile(slot: ImageSlot, file?: File) {
    if (!file) {
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setState((current) => ({
      ...current,
      [slot.key]: {
        ...getSlotState(slot),
        previewUrl,
        file,
        status: "Image selected. Click Save to update the website.",
        error: "",
      },
    }));
  }

  async function saveSlot(slot: ImageSlot) {
    const item = getSlotState(slot);
    setState((current) => ({
      ...current,
      [slot.key]: { ...item, status: "Saving...", error: "" },
    }));

    try {
      const imageUrl = item.file
        ? await uploadSiteImage(slot.section, slot.key, item.file)
        : item.currentUrl;

      const [saved] = await upsertImageRow({
        key: slot.key,
        label: slot.label,
        section: slot.section,
        image_url: imageUrl,
        alt_text: slot.altText,
        sort_order: slot.sortOrder,
      });

      setRows((current) => ({ ...current, [slot.key]: saved }));
      setState((current) => ({
        ...current,
        [slot.key]: {
          currentUrl: imageUrl,
          previewUrl: imageUrl,
          status: "Saved. The public website will use this image.",
          error: "",
        },
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        [slot.key]: {
          ...item,
          status: "",
          error: error instanceof Error ? error.message : "Upload failed",
        },
      }));
    }
  }

  return (
    <div className="grid gap-10">
      {Object.entries(groups).map(([section, slots]) => (
        <section key={section}>
          <h2 className="font-serif text-3xl text-ink">{section}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {slots.map((slot) => {
              const item = getSlotState(slot);
              return (
                <article className="card overflow-hidden bg-white" key={slot.key}>
                  <img
                    alt={slot.altText}
                    className="aspect-[4/3] w-full object-cover"
                    src={item.previewUrl}
                  />
                  <div className="p-5">
                    <h3 className="font-serif text-2xl text-ink">{slot.label}</h3>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <label className="btn-secondary cursor-pointer">
                        Replace Image
                        <input
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => chooseFile(slot, event.target.files?.[0])}
                          type="file"
                        />
                      </label>
                      <button className="btn-primary" onClick={() => saveSlot(slot)} type="button">
                        Save
                      </button>
                    </div>
                    {item.status ? <p className="mt-3 text-sm font-semibold text-muted">{item.status}</p> : null}
                    {item.error ? <p className="mt-3 text-sm font-semibold text-red-600">{item.error}</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
