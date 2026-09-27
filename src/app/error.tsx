"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-3xl">משהו השתבש</h1>
      <p className="text-ink-soft">אירעה שגיאה בלתי צפויה. אפשר לנסות שוב, ואם הבעיה חוזרת – ליצור איתנו קשר.</p>
      <Button onClick={reset}>ניסיון נוסף</Button>
    </main>
  );
}
