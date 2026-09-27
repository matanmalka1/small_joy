import Link from "next/link";
import { cn } from "@/lib/cn";

/** Server-rendered pagination; builds links by replacing the `page` param. */
export function Pagination({
  page,
  totalPages,
  basePath,
  params,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(totalPages, page + 2); p++) pages.push(p);
  const item = "grid h-10 min-w-10 place-items-center rounded-xl border border-line px-3 text-sm font-semibold";
  return (
    <nav aria-label="עימוד" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={href(page - 1)} className={cn(item, "bg-surface hover:bg-sand")} rel="prev">
          הקודם
        </Link>
      )}
      {pages.map((p) =>
        p === page ? (
          <span key={p} aria-current="page" className={cn(item, "border-teal bg-teal text-white")}>
            {p}
          </span>
        ) : (
          <Link key={p} href={href(p)} className={cn(item, "bg-surface hover:bg-sand")} aria-label={`עמוד ${p}`}>
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={href(page + 1)} className={cn(item, "bg-surface hover:bg-sand")} rel="next">
          הבא
        </Link>
      )}
    </nav>
  );
}
