"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import FormField from "@/components/FormField";
import DataTable from "@/components/DataTable";
import { subscribeDataRefresh, triggerDataRefresh } from "@/utils/data-refresh";

function createInitialForm(fields) {
  return fields.reduce((acc, field) => {
    acc[field.name] =
      field.defaultValue !== undefined && field.defaultValue !== null
        ? String(field.defaultValue)
        : "";
    return acc;
  }, {});
}

function getSingularTitle(definition) {
  return definition.singularTitle || definition.title.replace(/s$/, "");
}

function toPayload(fields, form) {
  const payload = {};

  fields.forEach((field) => {
    const rawValue = form[field.name];
    const hasValue = rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== "";

    if (!hasValue) {
      payload[field.name] = null;
      return;
    }

    if (field.type === "number") {
      payload[field.name] = Number(rawValue);
      return;
    }

    if (field.type === "date") {
      payload[field.name] = rawValue;
      return;
    }

    if (field.valueType === "number") {
      payload[field.name] = Number(rawValue);
      return;
    }

    payload[field.name] = String(rawValue).trim();
  });

  return payload;
}

function isFieldVisible(field, form) {
  if (!field.showWhen) {
    return true;
  }

  const targetValue = form[field.showWhen.field];
  if (Array.isArray(field.showWhen.value)) {
    return field.showWhen.value.includes(targetValue);
  }

  return targetValue === field.showWhen.value;
}

function getNormalizedValue(field, value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (field.type === "number" || field.valueType === "number") {
    return String(value).trim();
  }

  return String(value).trim();
}

export default function ResourcePage({ definition }) {
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [form, setForm] = useState(createInitialForm(definition.fields));
  const [message, setMessage] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(definition.endpoint, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load records.");
      }
      setRows(data.rows || []);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }, [definition.endpoint]);

  const loadLookups = useCallback(async () => {
    const result = {};

    await Promise.all(
      definition.fields
        .filter((field) => field.source)
        .map(async (field) => {
          const optionKey = `${field.source}${field.optionQuery ? `?${field.optionQuery}` : ""}`;
          if (result[optionKey]) {
            return;
          }

          const response = await fetch(
            `/api/resources/${field.source}?options=1${field.optionQuery ? `&${field.optionQuery}` : ""}`,
            { cache: "no-store" },
          );
          const data = await response.json();
          result[optionKey] = data.options || [];
        }),
    );

    setOptions(result);
  }, [definition.fields]);

  const refresh = useCallback(async () => {
    await Promise.all([loadRows(), loadLookups()]);
  }, [loadLookups, loadRows]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);

    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    return subscribeDataRefresh(() => {
      refresh();
    });
  }, [refresh]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return rows;
    }

    return rows.filter((row) =>
      definition.searchFields.some((key) => String(row[key] ?? "").toLowerCase().includes(term)),
    );
  }, [rows, search, definition.searchFields]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const nextForm = { ...current, [name]: value };

      definition.fields.forEach((field) => {
        if (field.showWhen && field.showWhen.field === name && !isFieldVisible(field, nextForm)) {
          nextForm[field.name] = "";
        }
      });

      return nextForm;
    });
  };

  const openCreate = () => {
    setEditingRow(null);
    setForm(createInitialForm(definition.fields));
    setErrors({});
    setMessage(null);
    setOpen(true);
  };

  const openEdit = (row) => {
    const nextForm = definition.fields.reduce((acc, field) => {
      const value = row[field.name];
      if (field.type === "date") {
        acc[field.name] = value ? String(value).slice(0, 10) : "";
      } else {
        acc[field.name] = value === null || value === undefined ? "" : String(value);
      }
      return acc;
    }, {});

    setEditingRow(row);
    setForm(nextForm);
    setErrors({});
    setMessage(null);
    setOpen(true);
  };

  const validate = () => {
    const nextErrors = {};

    definition.fields.forEach((field) => {
      if (!field.required) {
        return;
      }

      const value = form[field.name];
      const normalizedValue = getNormalizedValue(field, value);
      if (normalizedValue === "") {
        nextErrors[field.name] = `${field.label} is required.`;
        return;
      }

      if (field.pattern) {
        const regex = new RegExp(field.pattern);
        if (!regex.test(normalizedValue)) {
          nextErrors[field.name] = field.validationMessage || `${field.label} is invalid.`;
        }
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload(definition.fields, form);
      const response = await fetch(
        editingRow ? `${definition.endpoint}?id=${editingRow[definition.key]}` : definition.endpoint,
        {
          method: editingRow ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Save failed.");
      }

      setMessage({
        type: "success",
        text: editingRow ? `${definition.title} updated successfully.` : `${definition.title} created successfully.`,
      });
      setOpen(false);
      triggerDataRefresh({ resource: definition.table, action: editingRow ? "update" : "create" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    if (!confirm(`Delete this ${getSingularTitle(definition).toLowerCase()}?`)) {
      return;
    }

    try {
      const response = await fetch(`${definition.endpoint}?id=${row[definition.key]}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Delete failed.");
      }

      setRows((current) => current.filter((item) => item[definition.key] !== row[definition.key]));
      setMessage({ type: "success", text: `${definition.title} deleted.` });
      triggerDataRefresh({ resource: definition.table, action: "delete" });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-slate-950">{definition.title}</h2>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${definition.title.toLowerCase()}...`}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500 md:w-72"
          />
          <button
            type="button"
            onClick={openCreate}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800"
          >
            Add {getSingularTitle(definition)}
          </button>
        </div>
      </div>

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

      {loading ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Loading records...
        </div>
      ) : (
        <DataTable
          columns={definition.columns}
          rows={filteredRows}
          actions={(row) => (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openEdit(row)}
                className="rounded-full bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition hover:bg-cyan-100"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => remove(row)}
                className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                Delete
              </button>
            </div>
          )}
          emptyText={`No ${definition.title.toLowerCase()} found.`}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingRow ? `Edit ${getSingularTitle(definition)}` : `Add ${getSingularTitle(definition)}`}
        subtitle={`Fill in the ${definition.title.toLowerCase()} form and submit to save the record.`}
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {definition.fields.map((field) =>
              isFieldVisible(field, form) ? (
              <FormField
                key={field.name}
                field={field}
                value={form[field.name] ?? ""}
                error={errors[field.name]}
                onChange={handleChange}
                options={
                  field.options ||
                  (field.source
                    ? options[`${field.source}${field.optionQuery ? `?${field.optionQuery}` : ""}`] || []
                    : [])
                }
              />
            ) : null,
            )}
          </div>

          <div className="flex items-center justify-end border-t border-slate-200 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Record"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
