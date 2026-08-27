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

type TruckDetail = {
  truck: Truck;
  currentDriver: Driver | null;
  currentAssignment: Assignment | null;
  assignmentHistory: Assignment[];
};

export default function TruckDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<TruckDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await api<TruckDetail>(`/api/fleet/trucks/${params.id}`);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    }
    void load();
  }, [params.id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <p className="text-sm text-slate-500">Loading truck…</p>;

  const { truck, currentDriver, assignmentHistory } = data;
  const equipment = [truck.year, truck.make, truck.model].filter(Boolean).join(" ");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/fleet?tab=trucks"
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ← Fleet
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Truck #{truck.unitNumber}
          </h1>
          <p className="mt-1 text-slate-600">
            {equipment || truck.type || "No equipment details"}
            {truck.plate ? ` · ${truck.plate}` : ""}
          </p>
        </div>
        <Link href="/fleet">
          <Button variant="outline">View drivers</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="VIN" value={truck.vin ?? "—"} />
        <Info label="Owner" value={truck.owner ?? "—"} />
        <Info
          label="Current driver"
          value={
            currentDriver ? (
              <Link
                href={`/fleet/drivers/${currentDriver.id}`}
                className="font-medium text-slate-900 hover:underline"
              >
                {currentDriver.name}
              </Link>
            ) : (
              "Unassigned"
            )
          }
        />
        <Info label="Status" value={truck.status.replace("_", " ")} />
      </div>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Expiry tracking
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <ExpiryBadge label="Insurance" date={truck.insuranceExpiry} />
          <ExpiryBadge label="Inspection" date={truck.inspectionExpiry} />
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Driver assignment history</h2>
        <p className="mt-1 text-sm text-slate-500">
          Dated history of which drivers operated this truck.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="pb-2 font-medium">Driver</th>
                <th className="pb-2 font-medium">Start</th>
                <th className="pb-2 font-medium">End</th>
              </tr>
            </thead>
            <tbody>
              {assignmentHistory.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-2.5">
                    {a.driver ? (
                      <Link
                        href={`/fleet/drivers/${a.driver.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {a.driver.name}
                      </Link>
                    ) : (
                      a.driverId
                    )}
                  </td>
                  <td className="py-2.5 text-slate-600">{formatDate(a.startDate)}</td>
                  <td className="py-2.5 text-slate-600">
                    {a.endDate ? (
                      formatDate(a.endDate)
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Current
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {assignmentHistory.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-400">
                    No driver assignments yet.
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
