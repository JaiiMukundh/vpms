"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/PageHeader";
import { reportItems } from "@/lib/vpms-data";
import { subscribeDataRefresh } from "@/utils/data-refresh";

const reportColumns = {
  "available-slots": [
    { key: "zone_name", label: "Zone" },
    { key: "slot_code", label: "Slot" },
    { key: "slot_type", label: "Type" },
  ],
  "occupied-slots": [
    { key: "zone_name", label: "Zone" },
    { key: "slot_code", label: "Slot" },
    { key: "slot_type", label: "Type" },
    { key: "vehicle_number", label: "Vehicle" },
  ],
  "active-vehicles": [
    { key: "vehicle_number", label: "Vehicle" },
    { key: "owner_name", label: "Owner" },
    { key: "slot_code", label: "Slot" },
    { key: "entry_time", label: "Entry Time", format: "datetime" },
  ],
  "daily-revenue": [
    { key: "revenue_date", label: "Date", format: "date" },
    { key: "total_revenue", label: "Revenue", format: "currency" },
    { key: "payment_count", label: "Payments" },
  ],
  "unpaid-violations": [
    { key: "vehicle_number", label: "Vehicle" },
    { key: "violation_type", label: "Violation" },
    { key: "fine_amount", label: "Fine", format: "currency" },
    { key: "payment_status", label: "Status" },
    { key: "issued_at", label: "Issued At", format: "datetime" },
  ],
  "active-passes": [
    { key: "vehicle_number", label: "Vehicle" },
    { key: "pass_type", label: "Type" },
    { key: "start_date", label: "Start", format: "date" },
    { key: "end_date", label: "End", format: "date" },
    { key: "pass_fee", label: "Fee", format: "currency" },
  ],
  "pass-status": [
    { key: "status", label: "Status" },
    { key: "total_count", label: "Count" },
  ],
  "zone-occupancy": [
    { key: "zone_name", label: "Zone" },
    { key: "total_slots", label: "Total" },
    { key: "occupied_slots", label: "Occupied" },
    { key: "available_slots", label: "Available" },
    { key: "occupancy_percent", label: "Occupancy %", format: "percent" },
  ],
  "vehicle-history": [
    { key: "vehicle_number", label: "Vehicle" },
    { key: "owner_name", label: "Owner" },
    { key: "slot_code", label: "Slot" },
    { key: "entry_time", label: "Entry", format: "datetime" },
    { key: "exit_time", label: "Exit", format: "datetime" },
    { key: "fee_amount", label: "Fee", format: "currency" },
    { key: "payment_status", label: "Payment" },
  ],
  fees: [
    { key: "fee_id", label: "Fee ID" },
    { key: "vehicle_number", label: "Vehicle" },
    { key: "vehicle_type", label: "Type" },
    { key: "duration_minutes", label: "Duration" },
    { key: "fee_amount", label: "Amount", format: "currency" },
    { key: "payment_status", label: "Status" },
  ],
  "unpaid-fees": [
    { key: "fee_id", label: "Fee ID" },
    { key: "vehicle_number", label: "Vehicle" },
    { key: "vehicle_type", label: "Type" },
    { key: "duration_minutes", label: "Duration" },
    { key: "fee_amount", label: "Amount", format: "currency" },
    { key: "payment_status", label: "Status" },
  ],
  "currently-parked": [
    { key: "vehicle_number", label: "Vehicle" },
    { key: "owner_name", label: "Owner" },
    { key: "zone_name", label: "Zone" },
    { key: "slot_code", label: "Slot" },
    { key: "entry_time", label: "Entry Time", format: "datetime" },
  ],
};

export default function ReportsPage({ initialTab }) {
  const [activeTab, setActiveTab] = useState(() => {
    const tab = initialTab;
    return tab && reportItems.some((report) => report.key === tab) ? tab : "available-slots";
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const activeReport = useMemo(
    () => reportItems.find((report) => report.key === activeTab) || reportItems[0],
    [activeTab],
  );

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const url =
        activeTab === "vehicle-history"
          ? `/api/reports/${activeTab}?vehicle_number=${encodeURIComponent(search)}`
          : `/api/reports/${activeTab}`;
      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();
      setRows(data.rows || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadReport();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadReport]);

  useEffect(() => {
    return subscribeDataRefresh(() => {
      loadReport();
    });
  }, [loadReport]);

  const filteredRows = useMemo(() => {
    if (!search || activeTab === "vehicle-history") {
      return rows;
    }

    const term = search.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(term)),
    );
  }, [rows, search, activeTab]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Quick operational views powered directly by Oracle views and report queries."
      />

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {reportItems.map((item) => {
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setActiveTab(item.key);
                  setSearch("");
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.title}
              </button>
            );
          })}
        </div>

        {activeTab === "vehicle-history" ? (
          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by vehicle number"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 md:w-80"
            />
          </div>
        ) : null}
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">Report</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">{activeReport.title}</h2>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading report...</p>
        ) : (
          <DataTable
            columns={reportColumns[activeTab] || []}
            rows={filteredRows}
            emptyText="No rows returned."
          />
        )}
      </div>
    </div>
  );
}
