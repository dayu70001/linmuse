"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { FeedbackImage } from "@/components/FeedbackGallery";

export function ShippingProofFeedbackGallery({ images }: { images: FeedbackImage[] }) {
  const [visibleCount, setVisibleCount] = useState(6);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const visibleImages = images.slice(0, visibleCount);
  const activeImage = activeIndex === null ? null : images[activeIndex];

  function close() {
    setActiveIndex(null);
  }

  function move(direction: -1 | 1) {
    setActiveIndex((current) => {
      if (current === null) return current;
      return (current + direction + images.length) % images.length;
    });
  }

  function getShowMoreCount() {
    return window.matchMedia("(min-width: 768px)").matches ? 3 : 2;
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:gap-4">
        {visibleImages.map((image, index) => (
          <button
            className="group rounded-xl border border-line/70 bg-white p-1.5 text-left transition hover:border-gold sm:p-2"
            key={`${image.src}-${index}`}
            onClick={() => setActiveIndex(index)}
            type="button"
          >
            <span className="block rounded-lg bg-paper p-1.5">
              <img
                alt={image.alt}
                className="h-52 w-full rounded-md object-contain transition group-hover:scale-[1.005] sm:h-80 lg:h-[420px]"
                decoding="async"
                loading="lazy"
                src={image.src}
              />
            </span>
          </button>
        ))}
      </div>

      {visibleCount < images.length ? (
        <div className="mt-7 flex justify-center">
          <button
            className="btn-secondary"
            onClick={() => setVisibleCount((count) => Math.min(count + getShowMoreCount(), images.length))}
            type="button"
          >
            Show More Feedback
          </button>
        </div>
      ) : null}

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
