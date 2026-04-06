"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CarFront, CreditCard, ShieldAlert, SquareParking, Users } from "lucide-react";
import StatCard from "@/components/StatCard";
import DataTable from "@/components/DataTable";
import { dashboardMetrics, reportItems } from "@/lib/vpms-data";
import { subscribeDataRefresh } from "@/utils/data-refresh";
import { formatCurrency } from "@/utils/format";

const metricIcons = {
  owners: Users,
  vehicles: CarFront,
  available_slots: SquareParking,
  occupied_slots: SquareParking,
  daily_revenue: CreditCard,
};

export default function DashboardHome() {
  const [summary, setSummary] = useState(null);
  const [parked, setParked] = useState([]);
  const [violations, setViolations] = useState([]);

  const loadDashboard = useCallback(async () => {
    try {
      const [summaryResponse, parkedResponse, violationsResponse] = await Promise.all([
        fetch("/api/reports/summary", { cache: "no-store" }),
        fetch("/api/reports/currently-parked", { cache: "no-store" }),
        fetch("/api/reports/unpaid-violations", { cache: "no-store" }),
      ]);

      const [summaryData, parkedData, violationsData] = await Promise.all([
        summaryResponse.json(),
        parkedResponse.json(),
        violationsResponse.json(),
      ]);

      setSummary(summaryData.summary || {});
      setParked(parkedData.rows || []);
      setViolations(violationsData.rows || []);
    } catch {
      setSummary({});
      setParked([]);
      setViolations([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadDashboard();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadDashboard]);

  useEffect(() => {
    return subscribeDataRefresh(() => {
      loadDashboard();
    });
  }, [loadDashboard]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/80">
              VPMS Control Center
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight">
              Simple, polished vehicle parking management for college demo and viva.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Track owners, vehicles, slots, entries, exits, fees, payments, passes, and violations
              with Oracle-backed business logic.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/entry"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Record Entry <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/reports"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Open Reports
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {dashboardMetrics.map((metric) => {
              const Icon = metricIcons[metric.key] || ShieldAlert;
              const value = summary ? summary[metric.field] : null;
              return (
                <StatCard
                  key={metric.key}
                  label={metric.label}
                  value={
                    metric.field === "daily_revenue" ? formatCurrency(value || 0) : value ?? "-"
                  }
                  helper="Live from Oracle views"
                  icon={Icon}
                />
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
                Currently Parked
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Active entries</h2>
            </div>
            <Link href="/exit" className="text-sm font-semibold text-cyan-700 hover:text-cyan-800">
              Manage Exit
            </Link>
          </div>
          <div className="mt-4">
            <DataTable
              columns={[
                { key: "vehicle_number", label: "Vehicle" },
                { key: "owner_name", label: "Owner" },
                { key: "slot_code", label: "Slot" },
                { key: "entry_time", label: "Entry Time" },
              ]}
              rows={parked.slice(0, 5)}
              emptyText="No active vehicles right now."
            />
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-700">
                Unpaid Violations
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">Fine backlog</h2>
            </div>
            <Link href="/violations" className="text-sm font-semibold text-rose-700 hover:text-rose-800">
              Review Violations
            </Link>
          </div>
          <div className="mt-4">
            <DataTable
              columns={[
                { key: "vehicle_number", label: "Vehicle" },
                { key: "violation_type", label: "Violation" },
                { key: "fine_amount", label: "Fine" },
                { key: "payment_status", label: "Status" },
              ]}
              rows={violations.slice(0, 5)}
              emptyText="No unpaid violations."
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Quick Access</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {reportItems.map((item) => (
            <Link
              key={item.key}
              href={`/reports?tab=${item.key}`}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50"
            >
              {item.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
