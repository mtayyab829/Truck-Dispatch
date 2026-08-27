"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  formatDate,
  type Assignment,
  type Driver,
  type Truck,
} from "@/lib/fleet";
import { ExpiryBadge } from "@/components/fleet/expiry-badge";
import { Button } from "@/components/ui/button";

type DriverDetail = {
  driver: Driver;
  currentTruck: Truck | null;
  currentAssignment: Assignment | null;
  assignmentHistory: Assignment[];
};

export default function DriverDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<DriverDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api<DriverDetail>(`/api/fleet/drivers/${params.id}`);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    }
    void load();
  }, [params.id]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }
  if (!data) {
    return <p className="text-sm text-slate-500">Loading driver…</p>;
  }

  const { driver, currentTruck, assignmentHistory } = data;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/fleet" className="text-sm text-slate-500 hover:text-slate-800">
            ← Fleet
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{driver.name}</h1>
          <p className="mt-1 text-slate-600">
            {driver.phone ?? "No phone"}
            {driver.email ? ` · ${driver.email}` : ""}
          </p>
        </div>
        <Link href="/fleet?tab=trucks">
          <Button variant="outline">View trucks</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="CDL" value={driver.cdlNumber ?? "—"} />
        <Info label="Owner company" value={driver.ownerCompany ?? "—"} />
        <Info
          label="Current truck"
          value={
            currentTruck ? (
              <Link
                href={`/fleet/trucks/${currentTruck.id}`}
                className="font-medium text-slate-900 hover:underline"
              >
                #{currentTruck.unitNumber}
                {currentTruck.plate ? ` · ${currentTruck.plate}` : ""}
              </Link>
            ) : (
              "Unassigned"
            )
          }
        />
        <Info label="Status" value={driver.isActive ? "Active" : "Inactive"} />
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Expiry tracking
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ExpiryBadge label="License / CDL" date={driver.licenseExpiry} />
          <ExpiryBadge label="Driver insurance" date={driver.insuranceExpiry} />
        </div>
      </section>

      {driver.notes && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</p>
          <p className="mt-2 whitespace-pre-wrap">{driver.notes}</p>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Truck assignment history</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dated history of which trucks this driver operated.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Truck</th>
                <th className="pb-2 font-medium">Start</th>
                <th className="pb-2 font-medium">End</th>
                <th className="pb-2 font-medium">Owner</th>
              </tr>
            </thead>
            <tbody>
              {assignmentHistory.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-2.5">
                    {a.truck ? (
                      <Link
                        href={`/fleet/trucks/${a.truck.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        #{a.truck.unitNumber}
                      </Link>
                    ) : (
                      a.truckId
                    )}
                  </td>
                  <td className="py-2.5 text-slate-600">{formatDate(a.startDate)}</td>
                  <td className="py-2.5 text-slate-600">
                    {a.endDate ? formatDate(a.endDate) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Current
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-slate-600">{a.truck?.owner ?? "—"}</td>
                </tr>
              ))}
              {assignmentHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    No truck assignments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}
