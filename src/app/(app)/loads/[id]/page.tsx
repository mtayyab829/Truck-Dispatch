"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, apiForm, ApiError, apiFileUrl, fetchFileObjectUrl } from "@/lib/api";
import type { Driver, Truck } from "@/lib/fleet";
import { formatDate } from "@/lib/fleet";
import { money, statusLabel, STATUS_FLOW, type Load } from "@/lib/loads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Download, FileText, FileImage, File as FileIcon, Upload } from "lucide-react";

type LoadDetail = {
  load: Load;
  currentAssignment: {
    driver: Driver | null;
    truck: Truck | null;
  } | null;
  assignmentHistory: Array<{
    id: string;
    assignedAt: string | null;
    releasedAt: string | null;
    driver: Driver | null;
    truck: Truck | null;
  }>;
  statusHistory: Array<{
    id: string;
    status: string;
    changedAt: string | null;
    note: string | null;
  }>;
  documents: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    mimeType?: string | null;
    docType: string;
    createdAt: string | null;
  }>;
  nextStatuses: string[];
  hasPod: boolean;
  hasBol?: boolean;
  freightPayment: {
    rate: number;
    received: number;
    outstanding: number;
    settled: boolean;
    payments: Array<{
      id: string;
      amount: number;
      date: string | null;
      method: string;
      reference: string | null;
      notes: string | null;
    }>;
    invoice: {
      id: string;
      invoiceNumber: string;
      status: string;
      billTo: string | null;
      amount: number;
    } | null;
  };
  commissionPayment: {
    amount: number;
    received: number;
    outstanding: number;
    settled: boolean;
    earned: boolean;
    payments: Array<{
      id: string;
      amount: number;
      date: string | null;
      method: string;
      reference: string | null;
      notes: string | null;
    }>;
  };
};

export default function LoadDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<LoadDetail | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [freightMsg, setFreightMsg] = useState<string | null>(null);
  const [uploadName, setUploadName] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await api<LoadDetail>(`/api/loads/${params.id}`);
    setData(res);
  }, [params.id]);

  useEffect(() => {
    async function init() {
      try {
        await refresh();
        const [d, t] = await Promise.all([
          api<{ drivers: Driver[] }>("/api/fleet/drivers"),
          api<{ trucks: Truck[] }>("/api/fleet/trucks"),
        ]);
        setDrivers(d.drivers);
        setTrucks(t.trucks);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      }
    }
    void init();
  }, [refresh]);

  async function changeStatus(status: string) {
    if (status === "CANCELLED") {
      const ok = window.confirm(
        "Cancel this load? This cannot be undone from here."
      );
      if (!ok) return;
    }
    setBusy(true);
    setError(null);
    try {
      await api(`/api/loads/${params.id}/status`, {
        method: "POST",
        body: { status },
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAssign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api(`/api/loads/${params.id}/assign`, {
        method: "POST",
        body: {
          driverId: String(fd.get("driverId")),
          truckId: String(fd.get("truckId")),
        },
      });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Assign failed");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof globalThis.File) || file.size === 0) {
      setError("Choose a PDF or image file to upload.");
      setBusy(false);
      return;
    }
    try {
      await apiForm(`/api/loads/${params.id}/documents`, fd);
      form.reset();
      setUploadName(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onRecordPayment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setFreightMsg(null);
    const fd = new FormData(e.currentTarget);
    const freightAmount = Number(fd.get("freightAmount") || 0);
    const commissionAmount = Number(fd.get("commissionAmount") || 0);
    const shared = {
      date: String(fd.get("date")),
      method: String(fd.get("method")),
      reference: String(fd.get("reference") || ""),
      notes: String(fd.get("notes") || ""),
    };

    if (
      (!Number.isFinite(freightAmount) || freightAmount <= 0) &&
      (!Number.isFinite(commissionAmount) || commissionAmount <= 0)
    ) {
      setError("Enter a freight and/or commission amount.");
      setBusy(false);
      return;
    }

    try {
      const parts: string[] = [];
      if (freightAmount > 0) {
        await api(`/api/loads/${params.id}/freight-payment`, {
          method: "POST",
          body: { amount: freightAmount, ...shared },
        });
        parts.push("freight");
      }
      if (commissionAmount > 0) {
        await api("/api/commissions/payments", {
          method: "POST",
          body: { loadId: params.id, amount: commissionAmount, ...shared },
        });
        parts.push("commission");
      }
      setShowPayForm(false);
      setFreightMsg(
        `Payment recorded (${parts.join(" + ")}).`
      );
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendPaymentReminder() {
    setBusy(true);
    setError(null);
    setFreightMsg(null);
    try {
      const res = await api<{ message: string }>(
        `/api/loads/${params.id}/payment-reminder`,
        { method: "POST", body: {} }
      );
      setFreightMsg(res.message);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Reminder failed");
    } finally {
      setBusy(false);
    }
  }

  async function createFreightInvoice() {
    setBusy(true);
    setError(null);
    setFreightMsg(null);
    try {
      const res = await api<{ invoice: { id: string; invoiceNumber: string } }>(
        `/api/loads/${params.id}/freight-invoice`,
        { method: "POST", body: {} }
      );
      setFreightMsg(`Invoice ${res.invoice.invoiceNumber} created.`);
      await refresh();
      window.location.href = `/invoices/${res.invoice.id}`;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invoice failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) {
    return <p className="text-sm text-slate-500">Loading load…</p>;
  }
  if (!data) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const { load, currentAssignment, statusHistory, documents, nextStatuses } = data;
  const hasPod =
    data.hasPod ?? documents.some((d) => d.docType === "POD");
  const hasBol =
    data.hasBol ?? documents.some((d) => d.docType === "BOL");
  const freight = data.freightPayment ?? {
    rate: load.rate,
    received: 0,
    outstanding: load.rate,
    settled: Boolean(load.rateSettled),
    payments: [],
    invoice: null,
  };
  const commission = data.commissionPayment ?? {
    amount: load.commissionAmount,
    received: 0,
    outstanding: load.commissionAmount,
    settled: Boolean(load.commissionSettled),
    earned: Boolean(load.commissionEarned),
    payments: [],
  };
  const advanceStatuses = nextStatuses.filter((s) => s !== "CANCELLED");
  const canCancel = nextStatuses.includes("CANCELLED");
  const nextAdvance = advanceStatuses[0] ?? null;
  const isCancelled = load.loadStatus === "CANCELLED";
  const displayStatus =
    load.loadStatus === "PAYMENT_FOLLOW_UP" ? "POD_RECEIVED" : load.loadStatus;
  const flowIndex = STATUS_FLOW.indexOf(displayStatus as (typeof STATUS_FLOW)[number]);
  const progressPct =
    isCancelled || flowIndex < 0
      ? 0
      : (flowIndex / (STATUS_FLOW.length - 1)) * 100;
  const needsBolBeforeAdvance =
    nextAdvance === "PICKED_UP" && !hasBol;
  const needsPodBeforeAdvance =
    nextAdvance === "POD_RECEIVED" && !hasPod;
  const freightStepOpen =
    load.loadStatus === "POD_RECEIVED" ||
    load.loadStatus === "PAYMENT_FOLLOW_UP";
  const showPaymentSection =
    !isCancelled &&
    (freightStepOpen || load.loadStatus === "PAYMENT_COMPLETED");
  const canRecordFreight =
    freightStepOpen && Boolean(currentAssignment) && !freight.settled;
  const canRecordCommission =
    commission.earned &&
    !commission.settled &&
    Boolean(currentAssignment) &&
    commission.outstanding > 0;
  const canRecordAny = canRecordFreight || canRecordCommission;
  const allPayments = [
    ...freight.payments.map((p) => ({ ...p, kind: "Freight" as const })),
    ...commission.payments.map((p) => ({ ...p, kind: "Commission" as const })),
  ].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
  const waitingOnFreightForComplete =
    freightStepOpen && !freight.settled;
  const showAdvanceButton =
    Boolean(nextAdvance) &&
    (nextAdvance !== "PAYMENT_COMPLETED" || freight.settled);
  const canAdvance =
    Boolean(nextAdvance) &&
    !needsBolBeforeAdvance &&
    !needsPodBeforeAdvance &&
    (nextAdvance !== "PAYMENT_COMPLETED" || freight.settled);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/loads" className="text-sm text-slate-500 hover:text-slate-800">
          ← Loads
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{load.loadNumber}</h1>
            <p className="mt-1 text-slate-600">
              {load.pickupCity}
              {load.pickupState ? `, ${load.pickupState}` : ""} → {load.deliveryCity}
              {load.deliveryState ? `, ${load.deliveryState}` : ""}
            </p>
          </div>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
            {statusLabel(load.loadStatus)}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Source / customer" value={load.source ?? "—"} />
        <Info label="Rate" value={money(load.rate)} />
        <Info
          label="Commission"
          value={
            <>
              {money(load.commissionAmount)}
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {load.commissionType === "PERCENTAGE"
                  ? `${load.commissionValue}%`
                  : "Fixed"}{" "}
                · {load.commissionEarned ? "Earned" : "Pending"}
                {load.commissionSettled ? " · Settled" : ""}
              </span>
            </>
          }
        />
        <Info
          label="Assignment"
          value={
            currentAssignment?.driver
              ? `${currentAssignment.driver.name} / #${currentAssignment.truck?.unitNumber ?? "?"}`
              : "Unassigned"
          }
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Status</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isCancelled
                ? "This load was cancelled."
                : "Progress updates one step at a time and is logged."}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide",
              isCancelled
                ? "bg-red-100 text-red-800"
                : "bg-slate-100 text-slate-800"
            )}
          >
            {statusLabel(load.loadStatus)}
          </span>
        </div>

        <div className="mt-6">
          <div className="relative h-2 rounded-full bg-slate-100">
            <div
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                isCancelled ? "bg-red-400" : "bg-slate-900"
              )}
              style={{
                width: isCancelled
                  ? "100%"
                  : `${Math.max(progressPct, flowIndex >= 0 ? 4 : 0)}%`,
              }}
            />
          </div>

          <ol className="mt-4 grid grid-cols-5 gap-y-4 lg:grid-cols-9">
            {STATUS_FLOW.map((step, i) => {
              const done = !isCancelled && flowIndex > i;
              const current = !isCancelled && flowIndex === i;
              return (
                <li key={step} className="flex flex-col items-center text-center">
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-white",
                      done && "bg-slate-900 text-white",
                      current && "bg-amber-400 text-slate-900",
                      !done && !current && "bg-slate-200 text-slate-500",
                      isCancelled && "bg-slate-200 text-slate-400 line-through"
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={cn(
                      "mt-2 text-[10px] font-medium leading-tight sm:text-[11px]",
                      current ? "text-slate-900" : "text-slate-500",
                      isCancelled && "text-slate-400"
                    )}
                  >
                    {statusLabel(step)}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="space-y-2">
            {showAdvanceButton && nextAdvance ? (
              <>
                <Button
                  disabled={busy || !canAdvance}
                  className="bg-slate-900"
                  onClick={() => void changeStatus(nextAdvance)}
                >
                  {statusLabel(nextAdvance)}
                </Button>
                {needsBolBeforeAdvance && (
                  <p className="text-sm text-amber-700">
                    Upload a BOL document below before continuing to picked up.
                  </p>
                )}
                {needsPodBeforeAdvance && (
                  <p className="text-sm text-amber-700">
                    Upload a POD document below before continuing to POD received.
                  </p>
                )}
              </>
            ) : waitingOnFreightForComplete ? (
              <p className="text-sm text-amber-700">
                Record full freight payment below to unlock Payment completed.
              </p>
            ) : (
              !isCancelled && (
                <p className="text-sm text-slate-500">
                  {load.loadStatus === "CREATED" || !currentAssignment
                    ? "Assign a driver and truck first to continue."
                    : load.loadStatus === "PAYMENT_COMPLETED"
                      ? "Load complete — payment recorded."
                      : "No further steps from here."}
                </p>
              )
            )}
          </div>
          {canCancel && (
            <Button
              disabled={busy}
              variant="ghost"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => void changeStatus("CANCELLED")}
            >
              Cancel load
            </Button>
          )}
        </div>
      </section>

      {showPaymentSection && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
            <p className="mt-1 text-sm text-slate-500">
              Record freight and commission for this load
              {currentAssignment?.driver
                ? ` · ${currentAssignment.driver.name}`
                : ""}
              .
            </p>
          </div>

          {freightMsg && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {freightMsg}
            </p>
          )}

          <div className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Freight
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {money(freight.received)} / {money(freight.rate)}
                </p>
                <p className="text-xs text-slate-500">
                  Unpaid {money(freight.outstanding)}
                  {!freightStepOpen &&
                  !freight.settled &&
                  load.loadStatus !== "PAYMENT_COMPLETED"
                    ? " · unlocks after POD"
                    : freight.settled
                      ? " · paid"
                      : ""}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Commission
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {money(commission.received)} / {money(commission.amount)}
                </p>
                <p className="text-xs text-slate-500">
                  Unpaid {money(commission.outstanding)}
                  {!commission.earned
                    ? " · after delivery"
                    : commission.settled
                      ? " · settled"
                      : ""}
                </p>
              </div>
            </div>
          </div>

          {freight.invoice && (
            <p className="text-sm text-slate-600">
              Freight invoice{" "}
              <Link
                href={`/invoices/${freight.invoice.id}`}
                className="font-medium text-slate-900 underline"
              >
                {freight.invoice.invoiceNumber}
              </Link>{" "}
              · {freight.invoice.status}
              {freight.invoice.billTo ? ` · ${freight.invoice.billTo}` : ""}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {canRecordAny && (
              <Button
                disabled={busy}
                className="bg-slate-900"
                onClick={() => setShowPayForm((v) => !v)}
              >
                {showPayForm ? "Close form" : "Record payment"}
              </Button>
            )}
            {canRecordFreight && (
              <>
                <Button
                  disabled={busy}
                  variant="outline"
                  onClick={() => void sendPaymentReminder()}
                >
                  Send reminder
                </Button>
                {!freight.invoice && (
                  <Button
                    disabled={busy}
                    variant="outline"
                    onClick={() => void createFreightInvoice()}
                  >
                    Create invoice
                  </Button>
                )}
              </>
            )}
            {freight.invoice && !freight.settled && (
              <Link href={`/invoices/${freight.invoice.id}`}>
                <Button variant="outline">Open invoice</Button>
              </Link>
            )}
          </div>

          {showPayForm && canRecordAny && (
            <form
              onSubmit={onRecordPayment}
              className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="freightAmount">
                  Freight amount
                  {canRecordFreight
                    ? ` (owed ${money(freight.outstanding)})`
                    : " (locked until POD)"}
                </Label>
                <Input
                  id="freightAmount"
                  name="freightAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!canRecordFreight}
                  defaultValue={canRecordFreight ? freight.outstanding : 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionAmount">
                  Commission amount
                  {canRecordCommission
                    ? ` (owed ${money(commission.outstanding)})`
                    : !commission.earned
                      ? " (after delivery)"
                      : " (settled)"}
                </Label>
                <Input
                  id="commissionAmount"
                  name="commissionAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  disabled={!canRecordCommission}
                  defaultValue={canRecordCommission ? commission.outstanding : 0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payDate">Date</Label>
                <Input
                  id="payDate"
                  name="date"
                  type="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payMethod">Method</Label>
                <Select id="payMethod" name="method" defaultValue="BANK_TRANSFER">
                  <option value="BANK_TRANSFER">Bank transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                  <option value="OTHER">Other</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payRef">Reference</Label>
                <Input id="payRef" name="reference" placeholder="Check # / wire id" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payNotes">Notes</Label>
                <Input id="payNotes" name="notes" />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy} className="bg-slate-900">
                  Save payment
                </Button>
              </div>
            </form>
          )}

          {allPayments.length > 0 && (
            <ul className="space-y-2 border-t border-slate-100 pt-4 text-sm">
              {allPayments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-slate-700"
                >
                  <span>
                    <span className="font-medium text-slate-900">{p.kind}</span>
                    {" · "}
                    {formatDate(p.date)} · {p.method.replace(/_/g, " ")}
                    {currentAssignment?.driver
                      ? ` · ${currentAssignment.driver.name}`
                      : ""}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  <span className="font-medium text-emerald-700">{money(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {(load.loadStatus === "CREATED" || !currentAssignment) &&
        load.loadStatus !== "CANCELLED" && (
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Assign driver &amp; truck</h2>
            <form onSubmit={onAssign} className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="driverId">Driver</Label>
                <Select id="driverId" name="driverId" required defaultValue="">
                  <option value="" disabled>
                    Select driver
                  </option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="truckId">Truck</Label>
                <Select id="truckId" name="truckId" required defaultValue="">
                  <option value="" disabled>
                    Select truck
                  </option>
                  {trucks.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.unitNumber}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={busy} className="w-full bg-slate-900">
                  Assign
                </Button>
              </div>
            </form>
          </section>
        )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Activity timeline</h2>
        <ol className="mt-4 space-y-3">
          {statusHistory.map((h) => (
            <li key={h.id} className="flex gap-3 text-sm">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-slate-400" />
              <div>
                <p className="font-medium text-slate-900">{statusLabel(h.status)}</p>
                <p className="text-slate-500">
                  {h.changedAt ? new Date(h.changedAt).toLocaleString() : "—"}
                  {h.note ? ` · ${h.note}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Documents</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              PDF, JPG, PNG, or Word — rate confirmation, BOL, POD.
            </p>
          </div>
          <Link
            href="/documents"
            className="text-sm text-amber-700 hover:underline"
          >
            All documents
          </Link>
        </div>

        {documents.length > 0 ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((d) => (
              <li
                key={d.id}
                className="overflow-hidden rounded-md border border-slate-200 bg-slate-50"
              >
                <LoadDocThumb
                  fileName={d.fileName}
                  fileUrl={d.fileUrl}
                  mimeType={d.mimeType ?? null}
                  docType={d.docType}
                />
                <div className="flex items-start justify-between gap-2 border-t border-slate-200 bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {d.fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {d.docType.replace(/_/g, " ")}
                      {d.createdAt ? ` · ${formatDate(d.createdAt)}` : ""}
                    </p>
                  </div>
                  <a
                    href={apiFileUrl(d.fileUrl)}
                    className="shrink-0 text-amber-700 hover:text-amber-800"
                    target="_blank"
                    rel="noreferrer"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-400">No documents uploaded yet.</p>
        )}

        <form
          onSubmit={onUpload}
          className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50/80 p-4"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="file">Choose file</Label>
              <Input
                id="file"
                name="file"
                type="file"
                required
                accept=".pdf,application/pdf,image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.doc,.docx"
                className="cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
                onChange={(e) =>
                  setUploadName(e.target.files?.[0]?.name ?? null)
                }
              />
              {uploadName && (
                <p className="truncate text-xs text-slate-600">{uploadName}</p>
              )}
            </div>
            <div className="space-y-2 sm:w-44">
              <Label htmlFor="docType">Type</Label>
            <Select
              id="docType"
              name="docType"
              defaultValue={
                load.loadStatus === "AT_PICKUP" || load.loadStatus === "ASSIGNED"
                  ? "BOL"
                  : load.loadStatus === "DELIVERED"
                    ? "POD"
                    : "RATE_CONFIRMATION"
              }
            >
              <option value="RATE_CONFIRMATION">Rate confirmation</option>
              <option value="BOL">BOL</option>
              <option value="POD">POD</option>
              <option value="OTHER">Other</option>
            </Select>
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="bg-slate-900 sm:w-36"
            >
              <Upload className="mr-2 h-4 w-4" />
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm text-sm text-slate-600">
        <p>
          Pickup: {load.pickupDateTime ? new Date(load.pickupDateTime).toLocaleString() : "—"}
        </p>
        <p className="mt-1">
          Delivery:{" "}
          {load.deliveryDateTime ? new Date(load.deliveryDateTime).toLocaleString() : "—"}
        </p>
        {load.notes && <p className="mt-3 whitespace-pre-wrap">{load.notes}</p>}
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

function LoadDocThumb({
  fileName,
  fileUrl,
  mimeType,
  docType,
}: {
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  docType: string;
}) {
  const isImage =
    Boolean(mimeType?.startsWith("image/")) ||
    /\.(jpe?g|png|webp|gif)$/i.test(fileName);
  const isPdf =
    mimeType === "application/pdf" || /\.pdf$/i.test(fileName);
  const remotePreview =
    isImage
      ? fileUrl
      : isPdf && /^https?:\/\//i.test(fileUrl) && fileUrl.includes("/upload/")
        ? fileUrl.replace("/upload/", "/upload/f_jpg,pg_1,w_400,c_limit/")
        : null;
  const [src, setSrc] = useState<string | null>(remotePreview);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (remotePreview) {
      setSrc(remotePreview);
      setFailed(false);
      return;
    }
    if (!isImage) return;
    let revoke: (() => void) | undefined;
    let cancelled = false;
    void fetchFileObjectUrl(fileUrl)
      .then((r) => {
        if (cancelled) {
          r.revoke();
          return;
        }
        revoke = r.revoke;
        setSrc(r.url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      revoke?.();
    };
  }, [fileUrl, isImage, remotePreview]);

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-28 w-full object-cover"
        onError={() => {
          setFailed(true);
          setSrc(null);
        }}
      />
    );
  }

  return (
    <div className="flex h-28 flex-col items-center justify-center gap-1 text-slate-400">
      {isPdf ? (
        <FileText className="h-8 w-8" />
      ) : isImage ? (
        <FileImage className="h-8 w-8" />
      ) : (
        <FileIcon className="h-8 w-8" />
      )}
      <span className="text-[10px] uppercase tracking-wide">
        {docType.replace(/_/g, " ")}
      </span>
    </div>
  );
}
