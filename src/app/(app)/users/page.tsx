"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const res = await api<{ users: UserRow[] }>("/api/users");
    setUsers(res.users);
  }

  useEffect(() => {
    void refresh().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed — company admin only")
    );
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    try {
      await api("/api/users", {
        method: "POST",
        body: {
          name: String(fd.get("name")),
          email: String(fd.get("email")),
          password: String(fd.get("password")),
          role: String(fd.get("role")),
        },
      });
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Users &amp; Assignments</h1>
          <p className="mt-1 text-slate-600">
            Company admins manage dispatchers and what they can see.
          </p>
        </div>
        <Button className="bg-slate-900" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add user
        </Button>
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
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <Link
                    href={`/users/${u.id}`}
                    className="font-medium text-slate-900 hover:underline"
                  >
                    {u.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{u.role}</td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <span className="text-emerald-700">Active</span>
                  ) : (
                    <span className="text-slate-400">Suspended</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={onCreate}
            className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">Create user</h2>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input name="password" type="password" minLength={8} required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select name="role" defaultValue="DISPATCHER">
                <option value="DISPATCHER">Dispatcher</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="bg-slate-900">
                Create
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
