import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/cn";

/** Shows the effective price and, when discounted, the struck-through list price. */
export function Price({
  price,
  compareAt,
  size = "md",
  className,
}: {
  price: number;
  compareAt?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const onSale = compareAt != null && compareAt > price;
  const sizes = { sm: "text-base", md: "text-lg", lg: "text-2xl" };
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-bold", sizes[size], onSale ? "text-brand-hover" : "text-ink")}>
        {onSale && <span className="sr-only">מחיר מבצע: </span>}
        {formatPrice(price)}
      </span>
      {onSale && (
        <s className="text-sm text-ink-soft">
          <span className="sr-only">במקום </span>
          {formatPrice(compareAt)}
        </s>
      )}
    </span>
  );
}
