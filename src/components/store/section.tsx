import Link from "next/link";

export function Section({
  title,
  href,
  linkLabel = "לכל המוצרים",
  children,
  className = "",
  id,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ?? `sec-${title.replace(/\s+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className={`container-page py-8 md:py-10 ${className}`}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 id={headingId} className="text-2xl md:text-3xl">{title}</h2>
        {href && (
          <Link href={href} className="shrink-0 text-sm font-semibold text-teal hover:underline">
            {linkLabel} ‹
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
