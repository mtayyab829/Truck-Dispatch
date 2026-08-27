"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError, getStoredToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type AccountSettings = {
  id: string;
  name: string;
  type: string;
  currency: string;
  defaultCommissionType: string;
  defaultCommissionValue: number;
  settings: Record<string, unknown>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

export default function SettingsPage() {
  const [account, setAccount] = useState<AccountSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<{ account: AccountSettings }>("/api/settings")
      .then((r) => setAccount(r.account))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Settings require admin access")
      );
  }, []);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!account) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api<{ account: AccountSettings }>("/api/settings", {
        method: "PATCH",
        body: {
          name: String(fd.get("name")),
          currency: String(fd.get("currency")),
          defaultCommissionType: String(fd.get("defaultCommissionType")),
          defaultCommissionValue: Number(fd.get("defaultCommissionValue")),
          settings: {
            invoicePrefix: String(fd.get("invoicePrefix") || "INV-"),
            loadPrefix: String(fd.get("loadPrefix") || "LD-"),
            notifyOverdueInvoices: fd.get("notifyOverdueInvoices") === "on",
            notifyDocExpiry: fd.get("notifyDocExpiry") === "on",
            notifyMissingPod: fd.get("notifyMissingPod") === "on",
          },
        },
      });
      setAccount(res.account);
      setMessage("Settings saved");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function downloadBackup() {
    const token = getStoredToken();
    window.open(
      `${API_URL}/api/settings/export${token ? `?` : ""}`,
      "_blank"
    );
    // Use fetch blob for auth
    void fetch(`${API_URL}/api/settings/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "truckops-backup.json";
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  if (!account && !error) {
    return <p className="text-sm text-slate-500">Loading settings…</p>;
  }
  if (!account) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  const s = account.settings ?? {};

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-slate-600">
          Account profile, defaults, and notification preferences.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      )}

      <form
        onSubmit={onSave}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="space-y-2">
          <Label>Account name</Label>
          <Input name="name" defaultValue={account.name} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input name="currency" defaultValue={account.currency} maxLength={3} />
          </div>
          <div className="space-y-2">
            <Label>Account type</Label>
            <Input value={account.type} disabled />
          </div>
          <div className="space-y-2">
            <Label>Default commission type</Label>
            <Select
              name="defaultCommissionType"
              defaultValue={account.defaultCommissionType}
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Default commission value</Label>
            <Input
              name="defaultCommissionValue"
              type="number"
              step="0.01"
              defaultValue={account.defaultCommissionValue}
            />
          </div>
          <div className="space-y-2">
            <Label>Invoice prefix</Label>
            <Input
              name="invoicePrefix"
              defaultValue={String(s.invoicePrefix ?? "INV-")}
            />
          </div>
          <div className="space-y-2">
            <Label>Load prefix</Label>
            <Input name="loadPrefix" defaultValue={String(s.loadPrefix ?? "LD-")} />
          </div>
        </div>

        <fieldset className="space-y-2 border-t border-slate-100 pt-4">
          <legend className="text-sm font-semibold text-slate-900">Notifications</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="notifyOverdueInvoices"
              defaultChecked={s.notifyOverdueInvoices !== false}
            />
            Overdue invoices
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="notifyDocExpiry"
              defaultChecked={s.notifyDocExpiry !== false}
            />
            Document / credential expiry
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="notifyMissingPod"
              defaultChecked={s.notifyMissingPod !== false}
            />
            Missing PODs
          </label>
        </fieldset>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" disabled={busy} className="bg-slate-900">
            Save settings
          </Button>
          <Button type="button" variant="outline" onClick={downloadBackup}>
            Export backup (JSON)
          </Button>
        </div>
      </form>
    </div>
  );
}
