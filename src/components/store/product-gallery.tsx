"use client";

import { useState } from "react";
import { ProductImage } from "./product-image";
import { cn } from "@/lib/cn";

export function ProductGallery({ images, name }: { images: { id: string; url: string; alt: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];
  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-3xl border border-line bg-sand">
        <ProductImage src={current?.url ?? null} alt={current?.alt ?? name} sizes="(min-width:1024px) 50vw, 100vw" priority />
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto" aria-label="תמונות נוספות">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`תמונה ${i + 1} מתוך ${images.length}`}
                aria-pressed={i === active}
                className={cn("relative block size-20 overflow-hidden rounded-xl border-2 bg-sand", i === active ? "border-teal" : "border-transparent")}
              >
                <ProductImage src={img.url} alt="" sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
