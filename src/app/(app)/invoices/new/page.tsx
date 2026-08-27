"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { money, type Load } from "@/lib/loads";
import type { Driver } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function NewInvoicePage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState("");
  const [loads, setLoads] = useState<Load[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<{ drivers: Driver[] }>("/api/fleet/drivers").then((r) =>
      setDrivers(r.drivers)
    );
  }, []);

  useEffect(() => {
    if (!driverId) {
      setLoads([]);
      setSelected(new Set());
      return;
    }
    void api<{ loads: Load[] }>(`/api/invoices/eligible-loads/${driverId}`)
      .then((r) => {
        setLoads(r.loads);
        setSelected(new Set());
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [driverId]);

  const total = useMemo(
    () =>
      loads
        .filter((l) => selected.has(l.id))
        .reduce((s, l) => s + l.commissionAmount, 0),
    [loads, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!driverId || selected.size === 0) {
      setError("Select a driver and at least one load");
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api<{ invoice: { id: string } }>("/api/invoices", {
        method: "POST",
        body: {
          driverId,
          loadIds: Array.from(selected),
          issueDate: String(fd.get("issueDate")),
          dueDate: String(fd.get("dueDate")),
          notes: String(fd.get("notes") || ""),
        },
      });
      router.push(`/invoices/${res.invoice.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const dueDefault = new Date();
  dueDefault.setDate(dueDefault.getDate() + 14);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/finances?tab=invoices" className="text-sm text-slate-500 hover:text-slate-800">
          ← Finances
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">New invoice</h1>
        <p className="mt-1 text-slate-600">
          Pick a driver and one or more earned commission loads.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label>Driver</Label>
            <Select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
            >
              <option value="">Select driver</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Issue date</Label>
              <Input
                name="issueDate"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input
                name="dueDate"
                type="date"
                required
                defaultValue={dueDefault.toISOString().slice(0, 10)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea name="notes" rows={2} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Eligible loads
          </h2>
          {!driverId && (
            <p className="mt-3 text-sm text-slate-400">Select a driver first.</p>
          )}
          {driverId && loads.length === 0 && (
            <p className="mt-3 text-sm text-slate-400">
              No earned, uninvoiced loads for this driver.
            </p>
          )}
          <ul className="mt-3 divide-y divide-slate-100">
            {loads.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(l.id)}
                  onChange={() => toggle(l.id)}
                  className="h-4 w-4"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{l.loadNumber}</p>
                  <p className="text-xs text-slate-500">
                    {l.pickupCity} → {l.deliveryCity}
                  </p>
                </div>
                <p className="font-medium">{money(l.commissionAmount)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm">
            Invoice total: <strong>{money(total)}</strong>
          </p>
        </section>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={busy} className="bg-slate-900">
            {busy ? "Creating…" : "Create draft invoice"}
          </Button>
          <Link href="/finances?tab=invoices">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
