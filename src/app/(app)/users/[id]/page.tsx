"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Driver, Truck } from "@/lib/fleet";
import { Button } from "@/components/ui/button";

type UserDetail = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  };
  assignedDrivers: Driver[];
  assignedTrucks: Truck[];
  allDrivers: Driver[];
  allTrucks: Truck[];
};

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<UserDetail | null>(null);
  const [driverIds, setDriverIds] = useState<Set<string>>(new Set());
  const [truckIds, setTruckIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await api<UserDetail>(`/api/users/${params.id}`);
    setData(res);
    setDriverIds(new Set(res.assignedDrivers.map((d) => d.id)));
    setTruckIds(new Set(res.assignedTrucks.map((t) => t.id)));
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed")
    );
  }, [params.id]);

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  async function saveAssignments() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await api(`/api/users/${params.id}/assignments`, {
        method: "PUT",
        body: {
          driverIds: Array.from(driverIds),
          truckIds: Array.from(truckIds),
          includeDriverTrucks: true,
        },
      });
      setMessage("Assignments saved");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function suspend() {
    if (!confirm("Suspend this user?")) return;
    await api(`/api/users/${params.id}`, {
      method: "PATCH",
      body: { isActive: false },
    });
    await refresh();
  }

  if (!data && !error) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!data) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/users" className="text-sm text-slate-500 hover:text-slate-800">
          ← Users
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{data.user.name}</h1>
        <p className="text-slate-600">
          {data.user.email} · {data.user.role} ·{" "}
          {data.user.isActive ? "Active" : "Suspended"}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Assign drivers</h2>
        <p className="mt-1 text-sm text-slate-500">
          Driver trucks are included automatically when you save.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.allDrivers.map((d) => (
            <label key={d.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={driverIds.has(d.id)}
                onChange={() => toggle(driverIds, d.id, setDriverIds)}
              />
              {d.name}
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-900">Assign trucks</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.allTrucks.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={truckIds.has(t.id)}
                onChange={() => toggle(truckIds, t.id, setTruckIds)}
              />
              #{t.unitNumber}
              {t.plate ? ` · ${t.plate}` : ""}
            </label>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} className="bg-slate-900" onClick={() => void saveAssignments()}>
          Save assignments
        </Button>
        {data.user.isActive && (
          <Button variant="outline" onClick={() => void suspend()}>
            Suspend user
          </Button>
        )}
      </div>
    </div>
  );
}
