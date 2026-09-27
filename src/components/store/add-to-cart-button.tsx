"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addToCartAction } from "@/actions/cart";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

export function AddToCartButton({
  variantId,
  quantity = 1,
  disabled,
  label = "הוספה לסל",
  size = "md",
  className,
  productName,
}: {
  variantId: string | null;
  quantity?: number;
  disabled?: boolean;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  productName?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      size={size}
      className={className}
      disabled={disabled || pending || !variantId}
      aria-busy={pending}
      aria-label={productName ? `${label} – ${productName}` : undefined}
      onClick={() =>
        variantId &&
        start(async () => {
          const res = await addToCartAction({ variantId, quantity });
          if (res.ok) {
            toast(res.message ?? "נוסף לסל");
            router.refresh();
          } else toast(res.error, "error");
        })
      }
    >
      {pending ? <Spinner /> : <CartIcon />}
      {label}
    </Button>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2" />
      <circle cx="10" cy="20" r="1.3" />
      <circle cx="17" cy="20" r="1.3" />
    </svg>
  );
}
