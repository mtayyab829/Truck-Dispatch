"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { money, statusLabel, type Load } from "@/lib/loads";
import { formatDate } from "@/lib/fleet";
import { Button } from "@/components/ui/button";

export default function LoadsPage() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api<{ loads: Load[] }>("/api/loads");
        setLoads(res.loads);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Loads</h1>
          <p className="mt-1 text-slate-600">
            Create, assign, and track loads through delivery. Commission is calculated per load.
          </p>
        </div>
        <Link href="/loads/new">
          <Button className="bg-slate-900">
            <Plus className="mr-2 h-4 w-4" />
            New load
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading loads…</p>
      ) : loads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-slate-700">No loads yet</p>
          <Link
            href="/loads/new"
            className="mt-3 inline-block text-sm font-medium text-amber-700 hover:underline"
          >
            Create your first load
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Load #</th>
                <th className="px-4 py-3 font-medium">Route</th>
                <th className="px-4 py-3 font-medium">Driver</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 font-medium">Commission</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Pickup</th>
              </tr>
            </thead>
            <tbody>
              {loads.map((l) => (
                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <Link
                      href={`/loads/${l.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {l.loadNumber}
                    </Link>
                    {l.source && (
                      <p className="text-xs text-slate-500">{l.source}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {l.pickupCity} → {l.deliveryCity}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {l.driver?.name ?? "—"}
                    {l.truck && (
                      <p className="text-xs text-slate-500">#{l.truck.unitNumber}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{money(l.rate)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {money(l.commissionAmount)}
                    <p className="text-xs text-slate-500">
                      {l.commissionEarned ? "Earned" : "Pending"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {statusLabel(l.loadStatus)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(l.pickupDateTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
