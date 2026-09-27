export function AuthCard({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="container-page flex justify-center py-10">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] md:p-8">
        <h1 className="text-2xl">{title}</h1>
        {children}
        {footer && <div className="border-t border-line pt-4 text-center text-sm text-ink-soft">{footer}</div>}
      </div>
    </div>
  );
}
