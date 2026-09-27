export function EmptyState({ title, children, action }: { title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
      <svg aria-hidden="true" viewBox="0 0 48 48" className="size-12 text-ink-soft/60">
        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M16 30c2.5-3 5-4.5 8-4.5s5.5 1.5 8 4.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="18" cy="20" r="2" fill="currentColor" />
        <circle cx="30" cy="20" r="2" fill="currentColor" />
      </svg>
      <h2 className="text-lg font-bold">{title}</h2>
      {children && <div className="max-w-md text-ink-soft">{children}</div>}
      {action}
    </div>
  );
}
