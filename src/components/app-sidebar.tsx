"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Truck,
  Package,
  Wallet,
  FolderOpen,
  BarChart3,
  Users,
  ScrollText,
  Settings,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fleet", label: "Drivers & Trucks", icon: Truck },
  { href: "/loads", label: "Loads", icon: Package },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/activity-log", label: "Activity Log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings, settingsOnly: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const visible = navItems.filter((item) => {
    if (item.adminOnly) {
      return user?.accountType === "COMPANY" && user.role === "ADMIN";
    }
    if ("settingsOnly" in item && item.settingsOnly) {
      return user?.accountType === "INDIVIDUAL" || user?.role === "ADMIN";
    }
    return true;
  });

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-5 py-5">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400">
          Dispatch
        </p>
        <h1 className="mt-1 text-lg font-semibold text-white">TruckOps</h1>
        <p className="mt-2 truncate text-xs text-slate-400">
          {user?.accountName}
        </p>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {visible.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/") ||
            (item.href === "/finances" &&
              ["/commissions", "/payments", "/invoices", "/expenses"].some(
                (p) => pathname === p || pathname.startsWith(p + "/")
              ));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-slate-400">{user?.email}</p>
          <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-500">
            {user?.accountType} · {user?.role}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-slate-700 bg-transparent text-slate-200 hover:bg-slate-900 hover:text-white"
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
