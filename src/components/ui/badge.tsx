import { cn } from "@/lib/cn";

type Tone = "sale" | "new" | "info" | "success" | "warning" | "danger" | "neutral";

const tones: Record<Tone, string> = {
  sale: "bg-sun text-ink",
  new: "bg-teal text-white",
  info: "bg-teal-soft text-teal",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-sand text-ink-soft",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold", tones[tone], className)}>
      {children}
    </span>
  );
}
