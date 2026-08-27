"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const { user, loading, register } = useAuth();
  const router = useRouter();
  const [accountType, setAccountType] = useState<"INDIVIDUAL" | "COMPANY">(
    "INDIVIDUAL"
  );
  const [accountName, setAccountName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({ accountType, accountName, name, email, password });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1e293b_0%,_#020617_55%)]" />

      <div className="relative w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-400">TruckOps</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Create account</h1>
        <p className="mt-1 text-sm text-slate-400">
          Choose Individual (solo) or Company (admin + dispatchers).
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["INDIVIDUAL", "Individual"],
                ["COMPANY", "Company"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccountType(value)}
                className={cn(
                  "rounded-md border px-3 py-3 text-sm font-medium transition-colors",
                  accountType === value
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-slate-700 text-slate-400 hover:border-slate-600"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300" htmlFor="accountName">
              {accountType === "COMPANY" ? "Company name" : "Business / display name"}
            </Label>
            <Input
              id="accountName"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              required
              className="border-slate-700 bg-slate-950 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300" htmlFor="name">
              Your name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border-slate-700 bg-slate-950 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-slate-700 bg-slate-950 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300" htmlFor="password">
              Password (min 8 characters)
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="border-slate-700 bg-slate-950 text-white"
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-900/50 bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
            disabled={submitting}
          >
            {submitting ? "Creating…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
