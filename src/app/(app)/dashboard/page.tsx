"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { money, statusLabel } from "@/lib/loads";
import { Select } from "@/components/ui/select";

type DashboardData = {
  scope: { isFullAccess: boolean; accountType: string; filterUserId: string | null };
  users: Array<{ id: string; name: string }>;
  kpis: Record<string, number>;
  recentLoads: Array<{
    id: string;
    loadNumber: string;
    pickupCity: string;
    deliveryCity: string;
    rate: number;
    commissionAmount: number;
    loadStatus: string;
    driverName: string | null;
  }>;
  outstandingByDriver: Array<{
    driverId: string;
    driver: { name: string } | null;
    outstanding: number;
    loads: Array<{
      loadId: string;
      loadNumber: string;
      outstanding: number;
      route: string;
    }>;
  }>;
  alerts: {
    overdueInvoices: Array<{ id: string; invoiceNumber: string; balance: number }>;
    missingPods: Array<{ id: string; loadNumber: string; route: string }>;
  };
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [userFilter, setUserFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = userFilter ? `?userId=${encodeURIComponent(userFilter)}` : "";
    void api<DashboardData>(`/api/dashboard${q}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, [userFilter]);

  const k = data?.kpis;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-slate-600">
            Welcome back, {user?.name}. Scoped to{" "}
            <span className="font-medium text-slate-800">{user?.accountName}</span>.
          </p>
        </div>
        {user?.accountType === "COMPANY" && user.role === "ADMIN" && data?.users && (
          <Select
            className="w-56"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
          >
            <option value="">All users (company-wide)</option>
            {data.users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Loads this month" value={String(k?.totalLoadsMonth ?? "—")} />
        <Kpi label="Completed" value={String(k?.completedLoadsMonth ?? "—")} />
        <Kpi label="Gross load value" value={money(k?.grossLoadValue ?? 0)} />
        <Kpi label="Commission earned" value={money(k?.commissionEarned ?? 0)} />
        <Kpi label="Commission received" value={money(k?.commissionReceived ?? 0)} />
        <Kpi label="Unpaid commission" value={money(k?.commissionOutstanding ?? 0)} />
        <Kpi label="Net (earned − expenses)" value={money(k?.netIncome ?? 0)} />
        <Kpi
          label="Active loads"
          value={String(k?.activeLoads ?? "—")}
        />
        {user?.accountType === "COMPANY" && user.role === "ADMIN" && (
          <>
            <Kpi label="Drivers" value={String(k?.drivers ?? "—")} />
            <Kpi label="Trucks" value={String(k?.trucks ?? "—")} />
            <Kpi label="Users" value={String(k?.users ?? "—")} />
            <Kpi label="Overdue invoices" value={String(k?.overdueInvoices ?? "—")} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Recent loads</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Load</th>
                  <th className="pb-2 font-medium">Driver</th>
                  <th className="pb-2 font-medium">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentLoads ?? []).map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="py-2">
                      <Link href={`/loads/${l.id}`} className="font-medium hover:underline">
                        {l.loadNumber}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {l.pickupCity} → {l.deliveryCity}
                      </p>
                    </td>
                    <td className="py-2 text-slate-600">{l.driverName ?? "—"}</td>
                    <td className="py-2">
                      {money(l.rate)}
                      <p className="text-xs text-slate-500">
                        comm {money(l.commissionAmount)}
                      </p>
                    </td>
                    <td className="py-2 text-slate-600">{statusLabel(l.loadStatus)}</td>
                  </tr>
                ))}
                {!data?.recentLoads?.length && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No loads yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Unpaid commission by driver
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Commission still owed on delivered loads (earned − received).
          </p>
          <div className="mt-3 space-y-2">
            {(data?.outstandingByDriver ?? []).map((b) => (
              <div key={b.driverId} className="rounded-md border border-slate-200">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() =>
                    setExpanded(expanded === b.driverId ? null : b.driverId)
                  }
                >
                  <span className="font-medium">{b.driver?.name ?? "Driver"}</span>
                  <span>{money(b.outstanding)}</span>
                </button>
                {expanded === b.driverId && (
                  <ul className="border-t border-slate-100 px-3 py-2 text-xs text-slate-600">
                    {b.loads.map((l) => (
                      <li key={l.loadId} className="flex justify-between py-1">
                        <Link href={`/loads/${l.loadId}`} className="hover:underline">
                          {l.loadNumber} · {l.route}
                        </Link>
                        <span>{money(l.outstanding)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {!data?.outstandingByDriver?.length && (
              <p className="text-sm text-slate-400">No unpaid commission.</p>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Alerts</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 text-sm">
          <AlertCol
            title="Overdue invoices"
            items={(data?.alerts.overdueInvoices ?? []).map((i) => ({
              href: `/invoices/${i.id}`,
              label: `${i.invoiceNumber} · ${money(i.balance)}`,
            }))}
          />
          <AlertCol
            title="Missing PODs"
            items={(data?.alerts.missingPods ?? []).map((i) => ({
              href: `/loads/${i.id}`,
              label: `${i.loadNumber} · ${i.route}`,
            }))}
          />
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function AlertCol({
  title,
  items,
}: {
  title: string;
  items: Array<{ href: string; label: string }>;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.slice(0, 6).map((i) => (
          <li key={i.href + i.label}>
            <Link href={i.href} className="text-amber-800 hover:underline">
              {i.label}
            </Link>
          </li>
        ))}
        {!items.length && <li className="text-slate-400">None</li>}
      </ul>
    </div>
  );
}
