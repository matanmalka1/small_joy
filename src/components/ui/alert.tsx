import { cn } from "@/lib/cn";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  info: "bg-teal-soft text-teal border-teal/20",
  success: "bg-success-soft text-success border-success/20",
  warning: "bg-warning-soft text-warning border-warning/25",
  danger: "bg-danger-soft text-danger border-danger/20",
};

const icons: Record<Tone, string> = { info: "ℹ", success: "✓", warning: "!", danger: "✕" };

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border p-3.5 text-sm", tones[tone], className)}
    >
      <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-current/15 text-xs font-bold">
        {icons[tone]}
      </span>
      <div className="min-w-0">
        {title && <p className="font-bold">{title}</p>}
        {children && <div className="text-ink/85">{children}</div>}
      </div>
    </div>
  );
}
