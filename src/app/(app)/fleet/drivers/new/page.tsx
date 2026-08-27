"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Driver, Truck, Assignment } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

export default function NewDriverWithTruckPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);

    try {
      const data = await api<{
        driver: Driver;
        truck: Truck;
        assignment: Assignment;
      }>("/api/fleet/driver-with-truck", {
        method: "POST",
        body: {
          driver: {
            name: String(fd.get("driverName") ?? ""),
            phone: String(fd.get("phone") ?? ""),
            email: String(fd.get("email") ?? ""),
            cdlNumber: String(fd.get("cdlNumber") ?? ""),
            licenseExpiry: String(fd.get("licenseExpiry") ?? ""),
            insuranceExpiry: String(fd.get("driverInsuranceExpiry") ?? ""),
            ownerCompany: String(fd.get("ownerCompany") ?? ""),
            notes: String(fd.get("notes") ?? ""),
          },
          truck: {
            unitNumber: String(fd.get("unitNumber") ?? ""),
            plate: String(fd.get("plate") ?? ""),
            vin: String(fd.get("vin") ?? ""),
            make: String(fd.get("make") ?? ""),
            model: String(fd.get("model") ?? ""),
            year: String(fd.get("year") ?? ""),
            type: String(fd.get("type") ?? ""),
            owner: String(fd.get("truckOwner") ?? ""),
            insuranceExpiry: String(fd.get("truckInsuranceExpiry") ?? ""),
            inspectionExpiry: String(fd.get("inspectionExpiry") ?? ""),
            status: String(fd.get("status") ?? "ACTIVE"),
          },
          assignmentStartDate: String(fd.get("assignmentStartDate") ?? "") || undefined,
        },
      });
      router.push(`/fleet/drivers/${data.driver.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/fleet" className="text-sm text-slate-500 hover:text-slate-800">
          ← Fleet
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Add driver + truck
        </h1>
        <p className="mt-1 text-slate-600">
          One flow creates the driver, the truck, and an active assignment. Truck owner
          can differ from the driver.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            1. Driver
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name *" name="driverName" required />
            <Field label="Phone" name="phone" />
            <Field label="Email" name="email" type="email" />
            <Field label="CDL number" name="cdlNumber" />
            <Field label="License expiry" name="licenseExpiry" type="date" />
            <Field label="Driver insurance expiry" name="driverInsuranceExpiry" type="date" />
            <Field
              label="Owner company (if ≠ driver)"
              name="ownerCompany"
              className="sm:col-span-2"
            />
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            2. Truck
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Unit number *" name="unitNumber" required placeholder="102" />
            <Field label="Plate" name="plate" />
            <Field label="VIN" name="vin" />
            <Field label="Type" name="type" placeholder="Dry van, reefer…" />
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
            <Field
              label="Truck owner (may ≠ driver)"
              name="truckOwner"
              className="sm:col-span-2"
            />
            <Field label="Insurance expiry" name="truckInsuranceExpiry" type="date" />
            <Field label="Inspection expiry" name="inspectionExpiry" type="date" />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            3. Assignment
          </h2>
          <div className="mt-4 max-w-xs">
            <Field
              label="Assignment start date"
              name="assignmentStartDate"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </div>
        </section>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting} className="bg-slate-900">
            {submitting ? "Saving…" : "Create driver + truck"}
          </Button>
          <Link href="/fleet">
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
  placeholder,
  defaultValue,
  className,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
      />
    </div>
  );
}
