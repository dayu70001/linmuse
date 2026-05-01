"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";

export type FeedbackImage = {
  src: string;
  alt: string;
};

export function FeedbackGallery({ images }: { images: FeedbackImage[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? null : images[activeIndex];

  function close() {
    setActiveIndex(null);
  }

  function move(direction: -1 | 1) {
    setActiveIndex((current) => {
      if (current === null) {
        return current;
      }
      return (current + direction + images.length) % images.length;
    });
  }

  return (
    <>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {images.map((image, index) => (
          <button
            className="group rounded-xl border border-line/70 bg-white p-2 text-left transition hover:border-gold"
            key={`${image.src}-${index}`}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <span className="block rounded-lg bg-paper p-1.5">
              <img
                alt={image.alt}
                className="h-auto w-full rounded-md object-contain transition group-hover:scale-[1.005]"
                decoding="async"
                loading="lazy"
                src={image.src}
              />
            </span>
          </button>
        ))}
      </div>

      {activeImage ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[100] overflow-y-auto bg-ink/85 p-4"
          role="dialog"
        >
          <button
            aria-label="Close"
            className="fixed right-4 top-4 z-[110] flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink"
            onClick={close}
            type="button"
          >
            <X size={22} />
          </button>
          {images.length > 1 ? (
            <button
              aria-label="Previous image"
              className="fixed left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink sm:flex"
              onClick={() => move(-1)}
              type="button"
            >
              <ChevronLeft size={22} />
            </button>
          ) : null}
          <div className="mx-auto flex min-h-full w-full items-start justify-center py-14">
            <img
              alt={activeImage.alt}
              className="h-auto w-full max-w-[520px] rounded-xl bg-white object-contain p-2"
              src={activeImage.src}
            />
          </div>
          {images.length > 1 ? (
            <button
              aria-label="Next image"
              className="fixed right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-ink sm:flex"
              onClick={() => move(1)}
              type="button"
            >
              <ChevronRight size={22} />
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
