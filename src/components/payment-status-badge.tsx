import { cn } from "@/lib/utils";
import type { PaymentStatusTone } from "@/lib/loads";

const TONE_CLASS: Record<PaymentStatusTone, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-800",
  due: "border-amber-200 bg-amber-50 text-amber-800",
  upcoming: "border-sky-200 bg-sky-50 text-sky-800",
  pending: "border-slate-200 bg-slate-100 text-slate-600",
  cancelled: "border-slate-200 bg-slate-50 text-slate-400",
};

export function PaymentStatusBadge({
  label,
  tone,
  className,
}: {
  label: string;
  tone: PaymentStatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
