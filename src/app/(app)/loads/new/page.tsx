"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Driver, Truck } from "@/lib/fleet";
import { calcCommission, money, type Load } from "@/lib/loads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export default function NewLoadPage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [rate, setRate] = useState("2500");
  const [commissionType, setCommissionType] = useState<"PERCENTAGE" | "FIXED">(
    "PERCENTAGE"
  );
  const [commissionValue, setCommissionValue] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const commissionAmount = useMemo(
    () => calcCommission(Number(rate) || 0, commissionType, Number(commissionValue) || 0),
    [rate, commissionType, commissionValue]
  );

  useEffect(() => {
    async function loadFleet() {
      const [d, t] = await Promise.all([
        api<{ drivers: Driver[] }>("/api/fleet/drivers"),
        api<{ trucks: Truck[] }>("/api/fleet/trucks"),
      ]);
      setDrivers(d.drivers);
      setTrucks(t.trucks);
    }
    void loadFleet().catch(() => undefined);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const driverId = String(fd.get("driverId") ?? "");
    const truckId = String(fd.get("truckId") ?? "");

    try {
      const res = await api<{ load: Load }>("/api/loads", {
        method: "POST",
        body: {
          source: String(fd.get("source") ?? ""),
          pickupCity: String(fd.get("pickupCity") ?? ""),
          pickupState: String(fd.get("pickupState") ?? ""),
          pickupDateTime: String(fd.get("pickupDateTime") ?? ""),
          deliveryCity: String(fd.get("deliveryCity") ?? ""),
          deliveryState: String(fd.get("deliveryState") ?? ""),
          deliveryDateTime: String(fd.get("deliveryDateTime") ?? ""),
          equipment: String(fd.get("equipment") ?? ""),
          commodity: String(fd.get("commodity") ?? ""),
          weight: String(fd.get("weight") ?? ""),
          miles: String(fd.get("miles") ?? ""),
          rate: Number(rate),
          commissionType,
          commissionValue: Number(commissionValue),
          notes: String(fd.get("notes") ?? ""),
          ...(driverId && truckId ? { driverId, truckId } : {}),
        },
      });
      router.push(`/loads/${res.load.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create load");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/loads" className="text-sm text-slate-500 hover:text-slate-800">
          ← Loads
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">New load</h1>
        <p className="mt-1 text-slate-600">
          Load number is auto-generated. Commission updates live as you edit rate.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Route &amp; cargo
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Load source / customer" name="source" className="sm:col-span-2" />
            <Field label="Pickup city *" name="pickupCity" required />
            <Field label="Pickup state" name="pickupState" />
            <Field label="Pickup datetime *" name="pickupDateTime" type="datetime-local" required />
            <Field label="Delivery city *" name="deliveryCity" required />
            <Field label="Delivery state" name="deliveryState" />
            <Field
              label="Delivery datetime *"
              name="deliveryDateTime"
              type="datetime-local"
              required
            />
            <Field label="Equipment" name="equipment" />
            <Field label="Commodity" name="commodity" />
            <Field label="Weight" name="weight" type="number" />
            <Field label="Miles" name="miles" type="number" />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Rate &amp; commission
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="rate">Load rate *</Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                step="0.01"
                required
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionType">Commission type</Label>
              <Select
                id="commissionType"
                value={commissionType}
                onChange={(e) =>
                  setCommissionType(e.target.value as "PERCENTAGE" | "FIXED")
                }
              >
                <option value="PERCENTAGE">Percentage</option>
                <option value="FIXED">Fixed</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionValue">
                {commissionType === "PERCENTAGE" ? "Percent *" : "Fixed amount *"}
              </Label>
              <Input
                id="commissionValue"
                type="number"
                step="0.01"
                required
                value={commissionValue}
                onChange={(e) => setCommissionValue(e.target.value)}
              />
            </div>
          </div>
          <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Commission amount:{" "}
            <span className="font-semibold text-slate-900">{money(commissionAmount)}</span>
            <span className="text-slate-500"> (stored snapshot)</span>
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Assignment (optional)
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="driverId">Driver</Label>
              <Select id="driverId" name="driverId" defaultValue="">
                <option value="">Unassigned</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.currentTruck ? ` · #${d.currentTruck.unitNumber}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="truckId">Truck</Label>
              <Select id="truckId" name="truckId" defaultValue="">
                <option value="">Unassigned</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.unitNumber}
                    {t.plate ? ` · ${t.plate}` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting} className="bg-slate-900">
            {submitting ? "Creating…" : "Create load"}
          </Button>
          <Link href="/loads">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} />
    </div>
  );
}
