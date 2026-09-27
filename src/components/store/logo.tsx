import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="שמחות קטנות – לדף הבית">
      <svg viewBox="0 0 64 64" className="size-9 shrink-0" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#c4452f" />
        <path d="M18 36c0 8 6 14 14 14s14-6 14-14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="4" fill="#f4b942" />
        <circle cx="40" cy="24" r="4" fill="#f4b942" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="whitespace-nowrap text-lg font-extrabold tracking-tight text-ink sm:text-xl">שמחות קטנות</span>
        <span className="hidden whitespace-nowrap text-[11px] font-medium text-ink-soft sm:block">לבית, לאירוח ולשמחות</span>
      </span>
    </Link>
  );
}
