"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { money } from "@/lib/loads";
import { formatDate, type Driver, type Truck } from "@/lib/fleet";
import type { Load } from "@/lib/loads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Expense = {
  id: string;
  category: string;
  amount: number;
  date: string | null;
  notes: string | null;
  driver: Driver | null;
  truck: Truck | null;
  load: Load | null;
};

const CATEGORIES = [
  "FUEL",
  "TOLLS",
  "REPAIRS",
  "PERMITS",
  "PHONE",
  "OFFICE",
  "OTHER",
] as const;

export function ExpensesPanel() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await api<{ expenses: Expense[]; total: number }>("/api/expenses");
    setExpenses(res.expenses);
    setTotal(res.total);
  }

  useEffect(() => {
    void Promise.all([
      refresh(),
      api<{ drivers: Driver[] }>("/api/fleet/drivers"),
      api<{ trucks: Truck[] }>("/api/fleet/trucks"),
      api<{ loads: Load[] }>("/api/loads"),
    ])
      .then(([, d, t, l]) => {
        setDrivers(d.drivers);
        setTrucks(t.trucks);
        setLoads(l.loads);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/expenses", {
        method: "POST",
        body: {
          category: String(fd.get("category")),
          amount: Number(fd.get("amount")),
          date: String(fd.get("date")),
          driverId: String(fd.get("driverId") || "") || null,
          truckId: String(fd.get("truckId") || "") || null,
          loadId: String(fd.get("loadId") || "") || null,
          notes: String(fd.get("notes") || ""),
        },
      });
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    await api(`/api/expenses/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="text-sm text-slate-600">
          Track operating costs. Net income = commission earned − expenses.
        </p>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
            <p className="text-lg font-semibold text-slate-900">{money(total)}</p>
          </div>
          <Button className="bg-slate-900" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add expense
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Links</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-600">{formatDate(e.date)}</td>
                <td className="px-4 py-3 font-medium text-slate-900">{e.category}</td>
                <td className="px-4 py-3 text-slate-600">
                  {[
                    e.driver?.name,
                    e.truck ? `#${e.truck.unitNumber}` : null,
                    e.load?.loadNumber,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className="px-4 py-3 font-medium">{money(e.amount)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-red-600"
                    onClick={() => void onDelete(e.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No expenses yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={onCreate}
            className="w-full max-w-lg space-y-4 rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Add expense</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select name="category" defaultValue="FUEL" required>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input name="amount" type="number" step="0.01" required />
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
                <Label>Driver</Label>
                <Select name="driverId" defaultValue="">
                  <option value="">—</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Truck</Label>
                <Select name="truckId" defaultValue="">
                  <option value="">—</option>
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.unitNumber}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Load</Label>
                <Select name="loadId" defaultValue="">
                  <option value="">—</option>
                  {loads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.loadNumber}
                    </option>
                  ))}
                </Select>
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
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
