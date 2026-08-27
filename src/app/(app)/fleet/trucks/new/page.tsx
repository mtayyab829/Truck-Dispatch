"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Truck } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export default function NewTruckPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    try {
      const data = await api<{ truck: Truck }>("/api/fleet/trucks", {
        method: "POST",
        body: {
          unitNumber: String(fd.get("unitNumber") ?? ""),
          plate: String(fd.get("plate") ?? ""),
          vin: String(fd.get("vin") ?? ""),
          make: String(fd.get("make") ?? ""),
          model: String(fd.get("model") ?? ""),
          year: String(fd.get("year") ?? ""),
          type: String(fd.get("type") ?? ""),
          owner: String(fd.get("owner") ?? ""),
          insuranceExpiry: String(fd.get("insuranceExpiry") ?? ""),
          inspectionExpiry: String(fd.get("inspectionExpiry") ?? ""),
          status: String(fd.get("status") ?? "ACTIVE"),
        },
      });
      router.push(`/fleet/trucks/${data.truck.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create truck");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/fleet?tab=trucks" className="text-sm text-slate-500 hover:text-slate-800">
          ← Fleet
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Add truck</h1>
        <p className="mt-1 text-slate-600">
          Create a truck without a driver. You can link a driver later from the assignment API
          or preferred{" "}
          <Link href="/fleet/drivers/new" className="text-amber-700 hover:underline">
            driver + truck flow
          </Link>
          .
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unit number *" name="unitNumber" required />
          <Field label="Plate" name="plate" />
          <Field label="VIN" name="vin" />
          <Field label="Type" name="type" />
          <Field label="Make" name="make" />
          <Field label="Model" name="model" />
          <Field label="Year" name="year" type="number" />
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select id="status" name="status" defaultValue="ACTIVE">
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="IN_REPAIR">In repair</option>
            </Select>
          </div>
          <Field label="Owner" name="owner" className="sm:col-span-2" />
          <Field label="Insurance expiry" name="insuranceExpiry" type="date" />
          <Field label="Inspection expiry" name="inspectionExpiry" type="date" />
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={submitting} className="bg-slate-900">
            {submitting ? "Saving…" : "Create truck"}
          </Button>
          <Link href="/fleet?tab=trucks">
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
