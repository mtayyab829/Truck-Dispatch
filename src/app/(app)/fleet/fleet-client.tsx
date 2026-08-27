"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, type Driver, type Truck } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function FleetPage() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "trucks" ? "trucks" : "drivers";
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [d, t] = await Promise.all([
          api<{ drivers: Driver[] }>("/api/fleet/drivers"),
          api<{ trucks: Truck[] }>("/api/fleet/trucks"),
        ]);
        setDrivers(d.drivers);
        setTrucks(t.trucks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load fleet");
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
          <h1 className="text-2xl font-semibold text-slate-900">Drivers &amp; Trucks</h1>
          <p className="mt-1 text-slate-600">
            Combined fleet module — drivers and their trucks stay linked with history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/fleet/drivers/new">
            <Button className="bg-slate-900 hover:bg-slate-800">
              <Plus className="mr-2 h-4 w-4" />
              Add driver + truck
            </Button>
          </Link>
          <Link href="/fleet/trucks/new">
            <Button variant="outline">Add truck only</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <TabLink href="/fleet" active={tab === "drivers"}>
          Drivers ({drivers.length})
        </TabLink>
        <TabLink href="/fleet?tab=trucks" active={tab === "trucks"}>
          Trucks ({trucks.length})
        </TabLink>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading fleet…</p>
      ) : tab === "drivers" ? (
        <DriversTable drivers={drivers} />
      ) : (
        <TrucksTable trucks={trucks} />
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-slate-900 text-slate-900"
          : "border-transparent text-slate-500 hover:text-slate-800"
      )}
    >
      {children}
    </Link>
  );
}

function DriversTable({ drivers }: { drivers: Driver[] }) {
  if (drivers.length === 0) {
    return (
      <Empty
        title="No drivers yet"
        href="/fleet/drivers/new"
        cta="Add your first driver + truck"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Driver</th>
            <th className="px-4 py-3 font-medium">Phone</th>
            <th className="px-4 py-3 font-medium">Current truck</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">License expiry</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((d) => (
            <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50/80">
              <td className="px-4 py-3">
                <Link
                  href={`/fleet/drivers/${d.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  {d.name}
                </Link>
                {d.cdlNumber && (
                  <p className="text-xs text-slate-500">CDL {d.cdlNumber}</p>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{d.phone ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600">
                {d.currentTruck ? (
                  <Link
                    href={`/fleet/trucks/${d.currentTruck.id}`}
                    className="hover:underline"
                  >
                    #{d.currentTruck.unitNumber}
                    {d.currentTruck.plate ? ` · ${d.currentTruck.plate}` : ""}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{d.ownerCompany ?? "—"}</td>
              <td className="px-4 py-3 text-slate-600">{formatDate(d.licenseExpiry)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrucksTable({ trucks }: { trucks: Truck[] }) {
  if (trucks.length === 0) {
    return (
      <Empty
        title="No trucks yet"
        href="/fleet/drivers/new"
        cta="Add driver + truck"
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Unit</th>
            <th className="px-4 py-3 font-medium">Equipment</th>
            <th className="px-4 py-3 font-medium">Current driver</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {trucks.map((t) => (
            <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/80">
              <td className="px-4 py-3">
                <Link
                  href={`/fleet/trucks/${t.id}`}
                  className="font-medium text-slate-900 hover:underline"
                >
                  #{t.unitNumber}
                </Link>
                {t.plate && <p className="text-xs text-slate-500">{t.plate}</p>}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {[t.year, t.make, t.model].filter(Boolean).join(" ") || t.type || "—"}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {t.currentDriver ? (
                  <Link
                    href={`/fleet/drivers/${t.currentDriver.id}`}
                    className="hover:underline"
                  >
                    {t.currentDriver.name}
                  </Link>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{t.owner ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {t.status.replace("_", " ")}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({
  title,
  href,
  cta,
}: {
  title: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <p className="text-slate-700">{title}</p>
      <Link
        href={href}
        className="mt-3 inline-block text-sm font-medium text-amber-700 hover:underline"
      >
        {cta}
      </Link>
    </div>
  );
}
