"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { TopBar } from "@/components/top-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Loading workspace…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <div className="sticky top-0 hidden h-screen md:block">
        <AppSidebar />
      </div>
      <main className="flex min-h-screen flex-1 flex-col overflow-auto">
        <div className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <p className="font-semibold text-slate-900">TruckOps</p>
          <p className="text-xs text-slate-500">{user.accountName}</p>
        </div>
        <TopBar />
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
