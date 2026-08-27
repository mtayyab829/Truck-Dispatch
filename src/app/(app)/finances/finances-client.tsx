"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { PaymentsPanel } from "@/components/finances/payments-panel";
import { InvoicesPanel } from "@/components/finances/invoices-panel";

const TABS = [
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "invoices", label: "Invoices", icon: FileText },
] as const;

export type FinanceTab = (typeof TABS)[number]["id"];

function isFinanceTab(v: string | null): v is FinanceTab {
  return TABS.some((t) => t.id === v);
}

export default function FinancesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const raw = searchParams.get("tab");
  const tab: FinanceTab = isFinanceTab(raw) ? raw : "payments";

  function setTab(next: FinanceTab) {
    router.replace(`/finances?tab=${next}`);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Finances</h1>
        <p className="mt-1 text-slate-600">
          Payments (freight &amp; commission) and invoices.
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div>
        {tab === "payments" && <PaymentsPanel />}
        {tab === "invoices" && <InvoicesPanel />}
      </div>
    </div>
  );
}
