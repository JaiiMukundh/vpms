"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FormField from "@/components/FormField";
import PageHeader from "@/components/PageHeader";
import { paymentModeOptions } from "@/lib/vpms-data";
import { subscribeDataRefresh, triggerDataRefresh } from "@/utils/data-refresh";
import { formatDateTime } from "@/utils/format";

const staffNameOverrides = {
  1: "Arjun Nair",
  2: "Priya Kulkarni",
  3: "Vivek Bansal",
};

export default function MovementPage({ mode }) {
  const [vehicles, setVehicles] = useState([]);
  const [staff, setStaff] = useState([]);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    vehicle_id: "",
    staff_id: "",
    entry_id: "",
    payment_mode: "CASH",
  });
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEntryMode = mode === "entry";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [vehicleResponse, staffResponse] = await Promise.all([
        fetch("/api/resources/vehicles?options=1&availableFor=entry", { cache: "no-store" }),
        fetch("/api/resources/staff?options=1", { cache: "no-store" }),
      ]);

      const vehicleData = await vehicleResponse.json();
      const staffData = await staffResponse.json();

      setVehicles(vehicleData.options || []);
      setStaff(
        (staffData.options || []).map((option) => ({
          ...option,
          label: staffNameOverrides[String(option.value)] || option.label,
        })),
      );

      if (!isEntryMode) {
        const parkedResponse = await fetch("/api/reports/currently-parked", { cache: "no-store" });
        const parkedData = await parkedResponse.json();
        setEntries(parkedData.rows || []);
      }
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Failed to load movement options." });
    } finally {
      setLoading(false);
    }
  }, [isEntryMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    return subscribeDataRefresh(() => {
      loadData();
    });
  }, [loadData]);

  const entryOptions = useMemo(
    () =>
      entries.map((row) => ({
        value: row.entry_id,
        label: `${row.vehicle_number} - ${row.slot_code} - ${formatDateTime(row.entry_time)}`,
      })),
    [entries],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(isEntryMode ? "/api/movements/entry" : "/api/movements/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEntryMode
          ? {
                vehicle_id: Number(form.vehicle_id),
                staff_id: Number(form.staff_id),
              }
            : {
                entry_id: Number(form.entry_id),
                staff_id: Number(form.staff_id),
                payment_mode: form.payment_mode,
              },
        ),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Operation failed.");
      }

      setMessage({ type: "success", text: data.message });
      setForm((current) => ({
        ...current,
        vehicle_id: "",
        staff_id: "",
        entry_id: "",
        payment_mode: "CASH",
      }));
      if (!isEntryMode) {
        setEntries((current) => current.filter((row) => row.entry_id !== Number(form.entry_id)));
      }
      triggerDataRefresh({ action: isEntryMode ? "entry" : "exit" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const title = isEntryMode ? "Vehicle Entry" : "Vehicle Exit";
  const description = isEntryMode
    ? "Staff records the vehicle arrival and allocates the first compatible slot."
    : "Staff closes the active parking record, calculates the fee, and frees the slot.";

  return (
    <div className="space-y-5">
      <PageHeader title={title} description={description} />

      {message ? (
        <div
          className={`rounded-2xl px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-6">
        <form onSubmit={submit} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          {loading ? (
            <p className="text-sm text-slate-500">Loading options...</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {isEntryMode ? (
                <>
                  <FormField
                    field={{ name: "vehicle_id", label: "Vehicle", type: "select" }}
                    value={form.vehicle_id}
                    options={vehicles}
                    onChange={handleChange}
                  />
                  <FormField
                    field={{ name: "staff_id", label: "Staff", type: "select" }}
                    value={form.staff_id}
                    options={staff}
                    onChange={handleChange}
                  />
                </>
              ) : (
                <>
                  <FormField
                    field={{ name: "entry_id", label: "Active Entry", type: "select" }}
                    value={form.entry_id}
                    options={entryOptions}
                    onChange={handleChange}
                  />
                  <FormField
                    field={{ name: "staff_id", label: "Staff", type: "select" }}
                    value={form.staff_id}
                    options={staff}
                    onChange={handleChange}
                  />
                  <FormField
                    field={{ name: "payment_mode", label: "Payment Mode", type: "select" }}
                    value={form.payment_mode}
                    options={paymentModeOptions}
                    onChange={handleChange}
                  />
                </>
              )}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : isEntryMode ? "Record Entry" : "Record Exit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
