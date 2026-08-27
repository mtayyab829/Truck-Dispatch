"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { money, type Load } from "@/lib/loads";
import { formatDate, type Driver } from "@/lib/fleet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type InvoiceDetail = {
  invoice: {
    id: string;
    invoiceNumber: string;
    kind?: string;
    billTo?: string | null;
    amount: number;
    paidTotal: number;
    balance: number;
    status: string;
    issueDate: string | null;
    dueDate: string | null;
    notes: string | null;
    aging: string;
  };
  driver: Driver | null;
  items: Array<{
    id: string;
    description: string;
    amount: number;
    load: Load | null;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    date: string | null;
    method: string;
    reference: string | null;
  }>;
};

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [emailTo, setEmailTo] = useState("");
  const [emailNote, setEmailNote] = useState("");
  const [emailOk, setEmailOk] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await api<InvoiceDetail>(`/api/invoices/${params.id}`);
    setData(res);
  }, [params.id]);

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed")
    );
  }, [refresh]);

  function openSendEmail() {
    setEmailOk(null);
    setError(null);
    setEmailTo(data?.driver?.email ?? "");
    setEmailNote("");
    setShowEmail(true);
  }

  async function sendEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setEmailOk(null);
    try {
      const res = await api<{ emailedTo: string }>(
        `/api/invoices/${params.id}/send`,
        {
          method: "POST",
          body: { email: emailTo.trim(), message: emailNote.trim() || null },
        }
      );
      setShowEmail(false);
      setEmailOk(`Invoice emailed to ${res.emailedTo}`);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!confirm("Cancel this invoice?")) return;
    setBusy(true);
    try {
      await api(`/api/invoices/${params.id}/cancel`, { method: "POST" });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: string) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/invoices/${params.id}/status`, {
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

  async function onPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api(`/api/invoices/${params.id}/payments`, {
        method: "POST",
        body: {
          amount: Number(fd.get("amount")),
          date: String(fd.get("date")),
          method: String(fd.get("method")),
          reference: String(fd.get("reference") || ""),
        },
      });
      setShowPay(false);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Payment failed");
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error) {
    return <p className="text-sm text-slate-500">Loading invoice…</p>;
  }
  if (!data) return <p className="text-sm text-red-600">{error}</p>;

  const { invoice, driver, items, payments } = data;
  const canPay = invoice.status !== "CANCELLED" && invoice.status !== "PAID";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="print:hidden">
        <Link href="/finances?tab=invoices" className="text-sm text-slate-500 hover:text-slate-800">
          ← Finances
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 print:hidden">
          {error}
        </div>
      )}

      <div className="print:hidden flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="invoiceStatus" className="text-sm text-slate-500">
            Status
          </Label>
          <Select
            id="invoiceStatus"
            className="h-9 w-[140px]"
            value={invoice.status}
            disabled={busy}
            onChange={(e) => void changeStatus(e.target.value)}
          >
            {["DRAFT", "SENT", "DUE", "PAID", "OVERDUE", "CANCELLED"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        {(invoice.status === "DRAFT" ||
          invoice.status === "SENT" ||
          invoice.status === "DUE" ||
          invoice.status === "OVERDUE") && (
          <Button
            disabled={busy}
            className="bg-slate-900"
            onClick={() => openSendEmail()}
          >
            Send email
          </Button>
        )}
        {canPay && (
          <Button variant="outline" onClick={() => setShowPay(true)}>
            Record payment
          </Button>
        )}
        {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
          <Button variant="outline" disabled={busy} onClick={() => void cancel()}>
            Cancel
          </Button>
        )}
        <Button variant="outline" onClick={() => window.print()}>
          Print / PDF
        </Button>
      </div>
      {emailOk && (
        <p className="print:hidden rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {emailOk}
        </p>
      )}

      {showEmail && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={sendEmail}
            className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold text-slate-900">Email invoice</h2>
            <p className="text-sm text-slate-500">
              Enter the recipient email. Sent from your configured Gmail account.
            </p>
            <div className="space-y-2">
              <Label htmlFor="invoiceEmail">Email</Label>
              <Input
                id="invoiceEmail"
                type="email"
                required
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceEmailNote">Message (optional)</Label>
              <Input
                id="invoiceEmailNote"
                value={emailNote}
                onChange={(e) => setEmailNote(e.target.value)}
                placeholder="Thanks — payment due by the date on this invoice."
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="bg-slate-900">
                {busy ? "Sending…" : "Send email"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEmail(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Printable surface */}
      <article className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-600">TruckOps</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">
              {invoice.invoiceNumber}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {invoice.kind === "FREIGHT" ? "Freight invoice" : "Commission invoice"}
            </p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>
              Status:{" "}
              <span
                className={cn(
                  "font-semibold",
                  invoice.status === "OVERDUE" && "text-red-700",
                  invoice.status === "PAID" && "text-emerald-700"
                )}
              >
                {invoice.status}
              </span>
            </p>
            <p>Issue: {formatDate(invoice.issueDate)}</p>
            <p>Due: {formatDate(invoice.dueDate)}</p>
          </div>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Bill to</p>
            <p className="mt-1 font-medium text-slate-900">
              {invoice.kind === "FREIGHT"
                ? invoice.billTo || "—"
                : driver?.name ?? "—"}
            </p>
            {invoice.kind !== "FREIGHT" && driver?.phone && (
              <p className="text-slate-600">{driver.phone}</p>
            )}
            {invoice.kind !== "FREIGHT" && driver?.email && (
              <p className="text-slate-600">{driver.email}</p>
            )}
            {invoice.kind === "FREIGHT" && (
              <p className="text-xs text-slate-500">Freight invoice</p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-xs uppercase tracking-wide text-slate-500">Balance</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {money(invoice.balance)}
            </p>
            <p className="text-slate-500">
              of {money(invoice.amount)} · paid {money(invoice.paidTotal)}
            </p>
          </div>
        </div>

        <table className="mt-8 w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-3">
                  <p className="font-medium text-slate-900">{item.description}</p>
                  {item.load && (
                    <Link
                      href={`/loads/${item.load.id}`}
                      className="text-xs text-amber-700 hover:underline print:hidden"
                    >
                      View load
                    </Link>
                  )}
                </td>
                <td className="py-3 text-right font-medium">{money(item.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-4 text-right font-semibold">Total</td>
              <td className="pt-4 text-right font-semibold">{money(invoice.amount)}</td>
            </tr>
          </tfoot>
        </table>

        {payments.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Payments
            </h2>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {payments.map((p) => (
                <li key={p.id}>
                  {formatDate(p.date)} · {money(p.amount)} ·{" "}
                  {p.method.replace(/_/g, " ")}
                  {p.reference ? ` · ${p.reference}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {invoice.notes && (
          <p className="mt-8 text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
        )}
      </article>

      {showPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 print:hidden">
          <form
            onSubmit={onPay}
            className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold">Record invoice payment</h3>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                name="amount"
                type="number"
                step="0.01"
                required
                defaultValue={invoice.balance}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                name="date"
                type="date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select name="method" defaultValue="BANK_TRANSFER">
                <option value="BANK_TRANSFER">Bank transfer</option>
                <option value="CASH">Cash</option>
                <option value="CHECK">Check</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input name="reference" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="bg-slate-900">
                Save
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowPay(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
