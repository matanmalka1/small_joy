import Image from "next/image";
import { cn } from "@/lib/cn";

/** Product/category image with a graceful placeholder. SVGs are served as-is. */
export function ProductImage({
  src,
  alt,
  sizes,
  priority,
  className,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) {
    return (
      <div className={cn("grid size-full place-items-center bg-sand text-ink-soft", className)} role="img" aria-label={alt}>
        <svg viewBox="0 0 24 24" className="size-10 opacity-50" aria-hidden="true">
          <path d="M4 5h16v14H4z M4 15l5-5 4 4 3-3 4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={src.endsWith(".svg")}
      className={cn("object-cover", className)}
    />
  );
}
