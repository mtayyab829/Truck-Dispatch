"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/loads";
import { formatDate, type Driver } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type InvoiceRow = {
  id: string;
  invoiceNumber: string;
  kind?: string;
  billTo?: string | null;
  amount: number;
  paidTotal: number;
  balance: number;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  aging: string;
  driver: Driver | null;
};

const STATUSES = ["DRAFT", "SENT", "DUE", "PAID", "OVERDUE", "CANCELLED"] as const;

export function InvoicesPanel() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [aging, setAging] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const [list, age] = await Promise.all([
      api<{ invoices: InvoiceRow[] }>("/api/invoices"),
      api<{ buckets: Record<string, number> }>("/api/invoices/aging"),
    ]);
    setInvoices(list.invoices);
    const buckets = age.buckets ?? {
      current: 0,
      "1-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    };
    // Fallback: if API buckets are empty but unpaid invoices exist, sum from list
    const bucketTotal = Object.values(buckets).reduce((a, b) => a + (b || 0), 0);
    if (bucketTotal <= 0 && list.invoices.length > 0) {
      const fallback: Record<string, number> = {
        current: 0,
        "1-30": 0,
        "31-60": 0,
        "61-90": 0,
        "90+": 0,
      };
      for (const inv of list.invoices) {
        if (inv.status === "PAID" || inv.status === "CANCELLED") continue;
        if (inv.balance <= 0) continue;
        const key = inv.aging in fallback ? inv.aging : "current";
        fallback[key] = (fallback[key] ?? 0) + inv.balance;
      }
      setAging(fallback);
    } else {
      setAging(buckets);
    }
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed")
    );
  }, []);

  async function changeStatus(id: string, status: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/api/invoices/${id}/status`, {
        method: "POST",
        body: { status },
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Status update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-slate-600">
          All freight and commission invoices. Change status from the list or open
          a record for details.
        </p>
        <Link href="/invoices/new">
          <Button className="bg-slate-900">
            <Plus className="mr-2 h-4 w-4" />
            New invoice
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-5">
        {(["current", "1-30", "31-60", "61-90", "90+"] as const).map((b) => (
          <div
            key={b}
            className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {b === "current" ? "Current" : `${b} days`}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {money(aging[b] ?? 0)}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Invoice</th>
              <th className="px-4 py-3 font-medium">Bill to</th>
              <th className="px-4 py-3 font-medium">Due</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {inv.invoiceNumber}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {inv.kind === "FREIGHT" ? "Freight" : "Commission"} · Issued{" "}
                    {formatDate(inv.issueDate)}
                  </p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {inv.kind === "FREIGHT"
                    ? inv.billTo || "—"
                    : inv.driver?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(inv.dueDate)}</td>
                <td className="px-4 py-3">{money(inv.amount)}</td>
                <td className="px-4 py-3 font-medium">{money(inv.balance)}</td>
                <td className="px-4 py-3">
                  <Select
                    className="h-8 w-[130px] text-xs"
                    value={inv.status}
                    disabled={busyId === inv.id}
                    onChange={(e) => void changeStatus(inv.id, e.target.value)}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No invoices yet. Create one from a load or New invoice.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
