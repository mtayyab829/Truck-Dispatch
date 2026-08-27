"use client";

import { useEffect, useState } from "react";
import { api, getStoredToken } from "@/lib/api";
import { money } from "@/lib/loads";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4100";

type Summary = {
  grossRevenue: number;
  commissionEarned: number;
  commissionReceived: number;
  outstanding: number;
  expenseTotal: number;
  netIncome: number;
  loadCount: number;
  completedLoads: number;
};

export default function ReportsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [commissionRows, setCommissionRows] = useState<Array<Record<string, unknown>>>([]);
  const [driverRows, setDriverRows] = useState<Array<Record<string, unknown>>>([]);
  const [truckRows, setTruckRows] = useState<Array<Record<string, unknown>>>([]);
  const [expenseReport, setExpenseReport] = useState<{
    byCategory: Record<string, number>;
    netIncome: number;
    expenseTotal: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function qs() {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const s = p.toString();
    return s ? `?${s}` : "";
  }

  async function load() {
    setError(null);
    try {
      const [s, c, d, t, e] = await Promise.all([
        api<Summary>(`/api/reports/summary${qs()}`),
        api<{ rows: Array<Record<string, unknown>> }>(`/api/reports/commission${qs()}`),
        api<{ rows: Array<Record<string, unknown>> }>(`/api/reports/drivers`),
        api<{ rows: Array<Record<string, unknown>> }>(`/api/reports/trucks`),
        api<{
          byCategory: Record<string, number>;
          netIncome: number;
          expenseTotal: number;
        }>(`/api/reports/expenses${qs()}`),
      ]);
      setSummary(s);
      setCommissionRows(c.rows);
      setDriverRows(d.rows);
      setTruckRows(t.rows);
      setExpenseReport(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function exportReport(report: string, format: "csv" | "xlsx") {
    const token = getStoredToken();
    const params = new URLSearchParams({ report, format });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`${API_URL}/api/reports/export?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `truckops-${report}.${format === "xlsx" ? "xlsx" : "csv"}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-slate-600">
          Revenue, commission, outstanding, performance, expenses, and exports.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button className="bg-slate-900" onClick={() => void load()}>
          Apply
        </Button>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void exportReport("commission", "csv")}>
            CSV commission
          </Button>
          <Button variant="outline" onClick={() => void exportReport("commission", "xlsx")}>
            Excel commission
          </Button>
          <Button variant="outline" onClick={() => void exportReport("expenses", "csv")}>
            CSV expenses
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Gross revenue" value={money(summary.grossRevenue)} />
          <Kpi label="Commission earned" value={money(summary.commissionEarned)} />
          <Kpi label="Unpaid commission" value={money(summary.outstanding)} />
          <Kpi label="Net income" value={money(summary.netIncome)} />
        </div>
      )}

      <ReportTable
        title="Commission report"
        headers={["Load", "Driver", "Route", "Commission", "Received", "Unpaid"]}
        rows={commissionRows.map((r) => [
          String(r.loadNumber),
          String(r.driverName ?? "—"),
          String(r.route),
          money(Number(r.commissionAmount)),
          money(Number(r.received)),
          money(Number(r.outstanding)),
        ])}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportTable
          title="Driver performance"
          headers={["Driver", "Loads", "Completed", "Gross", "Commission"]}
          rows={driverRows.map((r) => [
            String(r.name),
            String(r.loadCount),
            String(r.completedLoads),
            money(Number(r.grossRevenue)),
            money(Number(r.commissionGenerated)),
          ])}
        />
        <ReportTable
          title="Truck performance"
          headers={["Unit", "Loads", "Gross", "Commission"]}
          rows={truckRows.map((r) => [
            `#${r.unitNumber}`,
            String(r.loadCount),
            money(Number(r.grossRevenue)),
            money(Number(r.commissionGenerated)),
          ])}
        />
      </div>

      {expenseReport && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Expense / net income</h2>
          <p className="mt-1 text-sm text-slate-500">
            Expenses {money(expenseReport.expenseTotal)} · Net{" "}
            {money(expenseReport.netIncome)}
          </p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3 text-sm">
            {Object.entries(expenseReport.byCategory).map(([cat, amt]) => (
              <li
                key={cat}
                className="flex justify-between rounded-md border border-slate-100 px-3 py-2"
              >
                <span>{cat}</span>
                <span className="font-medium">{money(amt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ReportTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              {headers.map((h) => (
                <th key={h} className="pb-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 50).map((row, i) => (
              <tr key={i} className="border-b border-slate-100">
                {row.map((cell, j) => (
                  <td key={j} className="py-2 text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={headers.length} className="py-6 text-center text-slate-400">
                  No data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
