"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BadgeIndianRupee,
  CarFront,
  ClipboardList,
  Gauge,
  LogIn,
  LogOut,
  ShieldAlert,
  SquareParking,
  Users,
} from "lucide-react";
import { navigationItems } from "@/lib/vpms-data";

const icons = {
  layout: Gauge,
  users: Users,
  car: CarFront,
  parking: SquareParking,
  enter: LogIn,
  exit: LogOut,
  payment: BadgeIndianRupee,
  pass: ClipboardList,
  shield: ShieldAlert,
  report: BarChart3,
};

export default function AppShell({ children }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_32%),linear-gradient(180deg,_#eef8ff_0%,_#f8fafc_26%,_#e2e8f0_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-[290px] shrink-0 rounded-[2rem] border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur md:flex md:flex-col">
          <div className="rounded-[1.5rem] bg-slate-950 px-5 py-5 text-white shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">VPMS</p>
            <h2 className="mt-2 text-xl font-semibold">Vehicle Parking Management System</h2>
            <p className="mt-2 text-sm text-slate-300">
              Oracle-backed parking operations with clean workflows.
            </p>
          </div>

          <nav className="mt-5 space-y-1.5">
            {navigationItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = icons[item.icon] || Gauge;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Database
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">Oracle + PL/SQL</p>
            <p className="mt-1 text-sm text-slate-500">
              Parameterized Next.js API routes with pooled connections.
            </p>
          </div>
        </aside>

        <main className="flex min-h-screen flex-1 flex-col gap-6">
          <div className="rounded-[2rem] border border-white/70 bg-white/85 px-5 py-4 shadow-lg backdrop-blur md:hidden">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">VPMS</p>
                <p className="text-sm font-semibold text-slate-950">Parking dashboard</p>
              </div>
              <SquareParking className="h-6 w-6 text-slate-800" />
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {navigationItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${
                      isActive ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
