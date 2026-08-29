"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import {
  money,
  freightPaymentStatus,
  commissionPaymentStatus,
  loadHasOpenPayments,
  type Load,
} from "@/lib/loads";
import { formatDate, type Driver } from "@/lib/fleet";
import { PaymentStatusBadge } from "@/components/payment-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Payment = {
  id: string;
  type: string;
  direction: string;
  amount: number;
  date: string | null;
  method: string;
  reference: string | null;
  notes: string | null;
  driver: Driver | null;
  load: Load | null;
};

type PaymentFilter = "all" | "open" | "paid";

function typeLabel(type: string): string {
  switch (type) {
    case "FREIGHT_RECEIVED":
      return "Freight";
    case "COMMISSION_RECEIVED":
      return "Commission";
    case "DRIVER_PAYMENT":
      return "Driver payment";
    default:
      return type.replace(/_/g, " ");
  }
}

function commissionLabel(load: Load | null): string {
  if (!load) return "—";
  if (load.commissionType === "PERCENTAGE") {
    return `${load.commissionValue}%`;
  }
  return `Fixed ${money(load.commissionValue)}`;
}

function paymentSortPriority(load: Load): number {
  const freight = freightPaymentStatus(load);
  const commission = commissionPaymentStatus(load);
  const open =
    freight.tone === "due" ||
    commission.tone === "due" ||
    freight.tone === "upcoming" ||
    commission.tone === "upcoming";
  if (open) return 0;
  if (freight.tone === "paid" && commission.tone === "paid") return 2;
  return 1;
}

export function PaymentsPanel() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadFilter, setLoadFilter] = useState<PaymentFilter>("all");

  async function refresh() {
    const [payRes, loadRes] = await Promise.all([
      api<{ payments: Payment[] }>("/api/payments"),
      api<{ loads: Load[] }>("/api/loads"),
    ]);
    setPayments(payRes.payments);
    setLoads(loadRes.loads);
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed")
    );
  }, []);

  const activeLoads = useMemo(
    () => loads.filter((l) => l.loadStatus !== "CANCELLED"),
    [loads]
  );

  const filteredLoads = useMemo(() => {
    let list = activeLoads;
    if (loadFilter === "open") {
      list = list.filter(loadHasOpenPayments);
    } else if (loadFilter === "paid") {
      list = list.filter(
        (l) => l.rateSettled && l.commissionSettled
      );
    }
    return [...list].sort(
      (a, b) => paymentSortPriority(a) - paymentSortPriority(b)
    );
  }, [activeLoads, loadFilter]);

  const openCount = useMemo(
    () => activeLoads.filter(loadHasOpenPayments).length,
    [activeLoads]
  );

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const freightAmount = Number(fd.get("freightAmount") || 0);
    const commissionAmount = Number(fd.get("commissionAmount") || 0);
    const loadId = String(fd.get("loadId") || "") || null;
    const shared = {
      date: String(fd.get("date")),
      method: String(fd.get("method")),
      reference: String(fd.get("reference") || ""),
      notes: String(fd.get("notes") || ""),
    };

    if (freightAmount <= 0 && commissionAmount <= 0) {
      setError("Enter a freight and/or commission amount.");
      setBusy(false);
      return;
    }

    try {
      if (freightAmount > 0) {
        if (!loadId) throw new Error("Select a load for freight payment");
        await api(`/api/loads/${loadId}/freight-payment`, {
          method: "POST",
          body: { amount: freightAmount, ...shared },
        });
      }
      if (commissionAmount > 0) {
        if (!loadId) throw new Error("Select a load for commission payment");
        await api("/api/commissions/payments", {
          method: "POST",
          body: { loadId, amount: commissionAmount, ...shared },
        });
      }
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to save"
      );
    } finally {
      setBusy(false);
    }
  }

  function openPayment(p: Payment) {
    if (p.load?.id) {
      router.push(`/loads/${p.load.id}`);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-slate-600">
          Track freight and commission status per load, then record payments as they come in.
        </p>
        <Button className="bg-slate-900" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record payment
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Load payments</h2>
            <p className="text-sm text-slate-500">
              {openCount} load{openCount === 1 ? "" : "s"} with open freight or commission
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(
              [
                ["all", "All loads"],
                ["open", "Open"],
                ["paid", "Fully paid"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setLoadFilter(id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  loadFilter === id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Load</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Freight</th>
                <th className="px-4 py-3 font-medium">Freight status</th>
                <th className="px-4 py-3 font-medium">Commission</th>
                <th className="px-4 py-3 font-medium">Commission status</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoads.map((l) => (
                <tr
                  key={l.id}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                  onClick={() => router.push(`/loads/${l.id}`)}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/loads/${l.id}`}
                      className="font-medium text-slate-900 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {l.loadNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {l.pickupCity} → {l.deliveryCity}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {l.driver?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{money(l.rate)}</td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge {...freightPaymentStatus(l)} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {money(l.commissionAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentStatusBadge {...commissionPaymentStatus(l)} />
                  </td>
                </tr>
              ))}
              {filteredLoads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    {loadFilter === "open"
                      ? "No loads with open payments."
                      : loadFilter === "paid"
                        ? "No fully paid loads yet."
                        : "No loads yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-500">
          <span className="font-medium text-sky-700">Upcoming</span> — not yet due ·{" "}
          <span className="font-medium text-amber-700">In progress / Due</span> — payment expected ·{" "}
          <span className="font-medium text-emerald-700">Paid</span> — settled
        </p>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Recorded payments</h2>
          <p className="text-sm text-slate-500">
            Transactions already logged. Click a row to open the load.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Driver / Load</th>
                <th className="px-4 py-3 font-medium">Commission</th>
                <th className="px-4 py-3 font-medium">Load rate</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className={
                    p.load?.id
                      ? "cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                      : "border-b border-slate-100"
                  }
                  onClick={() => openPayment(p)}
                >
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {typeLabel(p.type)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.driver?.name ?? "—"}
                    {p.load && (
                      <p className="text-xs">
                        <Link
                          href={`/loads/${p.load.id}`}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {p.load.loadNumber}
                        </Link>
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {commissionLabel(p.load)}
                    {p.load && (
                      <p className="text-xs text-slate-400">
                        = {money(p.load.commissionAmount)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.load ? money(p.load.rate) : "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">{money(p.amount)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {p.method.replace(/_/g, " ")}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={onCreate}
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Record payment</h2>
            <p className="text-sm text-slate-500">
              Enter freight and/or commission for a load in one save.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Load</Label>
                <Select name="loadId" required defaultValue="">
                  <option value="" disabled>
                    Select load
                  </option>
                  {loads.map((l) => {
                    const freight = freightPaymentStatus(l);
                    const commission = commissionPaymentStatus(l);
                    return (
                      <option key={l.id} value={l.id}>
                        {l.loadNumber} · freight {freight.label.toLowerCase()} · comm{" "}
                        {commission.label.toLowerCase()}
                      </option>
                    );
                  })}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Freight amount</Label>
                <Input name="freightAmount" type="number" step="0.01" min="0" defaultValue={0} />
              </div>
              <div className="space-y-2">
                <Label>Commission amount</Label>
                <Input
                  name="commissionAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <Select name="method" defaultValue="BANK_TRANSFER">
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Reference</Label>
                <Input name="reference" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes</Label>
                <Textarea name="notes" rows={2} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="bg-slate-900">
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
