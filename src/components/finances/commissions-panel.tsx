"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/loads";
import type { Driver } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type CommissionRow = {
  loadId: string;
  loadNumber: string;
  loadStatus: string;
  commissionAmount: number;
  commissionReceived: number;
  outstanding: number;
  status: "Pending" | "Due" | "Paid" | "Cancelled";
  earned: boolean;
  driver: Driver | null;
  pickupCity: string;
  deliveryCity: string;
};

type DriverBalance = {
  driverId: string;
  driver: Driver | null;
  earned: number;
  received: number;
  outstanding: number;
  loads: Array<{
    loadId: string;
    loadNumber: string;
    commissionAmount: number;
    commissionReceived: number;
    outstanding: number;
    route: string;
  }>;
};

export function CommissionsPanel() {
  const [rows, setRows] = useState<CommissionRow[]>([]);
  const [byDriver, setByDriver] = useState<DriverBalance[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [payLoadId, setPayLoadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
    const [c, d] = await Promise.all([
      api<{ commissions: CommissionRow[] }>(`/api/commissions${q}`),
      api<{ drivers: DriverBalance[] }>("/api/commissions/by-driver"),
    ]);
    setRows(c.commissions);
    setByDriver(d.drivers);
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function onPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!payLoadId) return;
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/commissions/payments", {
        method: "POST",
        body: {
          loadId: payLoadId,
          amount: Number(fd.get("amount")),
          date: String(fd.get("date")),
          method: String(fd.get("method")),
          reference: String(fd.get("reference") ?? ""),
          notes: String(fd.get("notes") ?? ""),
        },
      });
      setPayLoadId(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-slate-600">
        Earned when a load reaches Delivered / POD. Outstanding = earned − received.
      </p>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Outstanding by driver
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Click a driver to drill into the loads that make up the balance.
        </p>
        <div className="mt-4 space-y-2">
          {byDriver.length === 0 && (
            <p className="text-sm text-slate-400">No outstanding earned commissions.</p>
          )}
          {byDriver.map((b) => (
            <div key={b.driverId} className="rounded-md border border-slate-200">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                onClick={() =>
                  setExpanded(expanded === b.driverId ? null : b.driverId)
                }
              >
                <span className="font-medium text-slate-900">
                  {b.driver?.name ?? "Unknown driver"}
                </span>
                <span className="text-sm text-slate-700">
                  owes <strong>{money(b.outstanding)}</strong>
                </span>
              </button>
              {expanded === b.driverId && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr>
                        <th className="pb-2 font-medium">Load</th>
                        <th className="pb-2 font-medium">Route</th>
                        <th className="pb-2 font-medium">Commission</th>
                        <th className="pb-2 font-medium">Received</th>
                        <th className="pb-2 font-medium">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.loads.map((l) => (
                        <tr key={l.loadId} className="border-t border-slate-50">
                          <td className="py-2">
                            <Link
                              href={`/loads/${l.loadId}`}
                              className="font-medium hover:underline"
                            >
                              {l.loadNumber}
                            </Link>
                          </td>
                          <td className="py-2 text-slate-600">{l.route}</td>
                          <td className="py-2">{money(l.commissionAmount)}</td>
                          <td className="py-2">{money(l.commissionReceived)}</td>
                          <td className="py-2 font-medium">{money(l.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">All load commissions</h2>
          <Select
            className="w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Due">Due</option>
            <option value="Paid">Paid</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Load</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.loadId} className="border-b border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/loads/${r.loadId}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {r.loadNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{r.driver?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.pickupCity} → {r.deliveryCity}
                  </td>
                  <td className="px-4 py-3">
                    {money(r.commissionAmount)}
                    {r.outstanding > 0 && r.status === "Due" && (
                      <p className="text-xs text-slate-500">
                        due {money(r.outstanding)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        r.status === "Due" && "bg-amber-50 text-amber-800",
                        r.status === "Paid" && "bg-emerald-50 text-emerald-800",
                        r.status === "Pending" && "bg-slate-100 text-slate-600",
                        r.status === "Cancelled" && "bg-red-50 text-red-700"
                      )}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "Due" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPayLoadId(r.loadId)}
                      >
                        Record payment
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No commissions match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {payLoadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={onPay}
            className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-slate-900">
              Record commission received
            </h3>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                required
                defaultValue={
                  rows.find((r) => r.loadId === payLoadId)?.outstanding ?? ""
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Method</Label>
              <Select id="method" name="method" defaultValue="BANK_TRANSFER">
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHECK">Check</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input id="reference" name="reference" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={busy} className="bg-slate-900">
                Save payment
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPayLoadId(null)}
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
