"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refreshes the server-rendered status while waiting for the payment webhook. */
export function PaymentStatusPoller({ maxSeconds = 60 }: { maxSeconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      if (Date.now() - started > maxSeconds * 1000) clearInterval(id);
      else router.refresh();
    }, 2500);
    return () => clearInterval(id);
  }, [router, maxSeconds]);
  return null;
}
