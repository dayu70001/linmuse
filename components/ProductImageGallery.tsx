"use client";

import { X } from "lucide-react";
import { useState } from "react";

export function ProductImageGallery({
  images,
  thumbnailImages,
  title,
}: {
  images: string[];
  thumbnailImages?: string[];
  title: string;
}) {
  const cleanImages = Array.from(new Set(images.filter(Boolean)));
  const cleanThumbnails = thumbnailImages?.filter(Boolean) || [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const activeImage = cleanImages[activeIndex] || cleanImages[0];

  if (!activeImage) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        className="group relative block w-full overflow-hidden rounded-lg bg-paper"
        onClick={() => setLightboxOpen(true)}
        aria-label="Open product image"
      >
        <img
          src={activeImage}
          alt={title}
          className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          loading="eager"
          decoding="async"
          sizes="(min-width: 1024px) 52vw, 100vw"
        />
        <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-ink">
          {activeIndex + 1} / {cleanImages.length}
        </span>
      </button>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {cleanImages.map((image, index) => (
          <button
            type="button"
            key={`${image}-${index}`}
            onClick={() => setActiveIndex(index)}
            className={`shrink-0 rounded-md border p-0.5 transition ${
              index === activeIndex ? "border-gold" : "border-line hover:border-gold/60"
            }`}
            aria-label={`View product image ${index + 1}`}
          >
            <img
              src={cleanThumbnails[index] || image}
              alt={title}
              className="h-16 w-16 rounded object-cover sm:h-20 sm:w-20"
              loading="lazy"
              decoding="async"
              sizes="80px"
            />
          </button>
        ))}
      </div>

      {lightboxOpen ? (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white p-2 text-ink"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close image preview"
          >
            <X size={20} />
          </button>
          <img
            src={activeImage}
            alt={title}
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
