"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Activity = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userName: string | null;
  createdAt: string | null;
  details: unknown;
};

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ activities: Activity[] }>("/api/activity")
      .then((r) => setActivities(r.activities))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed"));
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Activity log</h1>
        <p className="mt-1 text-slate-600">
          Append-only audit trail. Entries cannot be edited or deleted.
        </p>
      </div>
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <tr key={a.id} className="border-b border-slate-100">
                <td className="px-4 py-3 text-slate-600">
                  {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">{a.userName ?? "—"}</td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {a.action.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {a.entityType}
                  <p className="font-mono text-xs text-slate-400">{a.entityId}</p>
                </td>
              </tr>
            ))}
            {!activities.length && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
