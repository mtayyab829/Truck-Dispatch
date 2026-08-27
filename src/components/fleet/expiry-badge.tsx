import { cn } from "@/lib/utils";
import { expiryStatus, formatDate } from "@/lib/fleet";

export function ExpiryBadge({
  label,
  date,
}: {
  label: string;
  date: string | null | undefined;
}) {
  const status = expiryStatus(date);
  return (
    <div
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        status === "expired" && "border-red-200 bg-red-50 text-red-800",
        status === "soon" && "border-amber-200 bg-amber-50 text-amber-900",
        status === "ok" && "border-slate-200 bg-white text-slate-700",
        status === "none" && "border-slate-200 bg-slate-50 text-slate-500"
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-0.5 font-medium">{formatDate(date)}</p>
      {status === "expired" && <p className="mt-1 text-xs">Expired</p>}
      {status === "soon" && <p className="mt-1 text-xs">Expiring soon</p>}
    </div>
  );
}
