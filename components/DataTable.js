"use client";

import { formatCurrency, formatDate, formatDateTime, formatEnumLabel } from "@/utils/format";

export default function DataTable({ columns, rows, actions = null, emptyText = "No records found." }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
                >
                  {column.label}
                </th>
              ))}
              {actions ? (
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={row._key ?? index} className="hover:bg-slate-50/70">
                  {columns.map((column) => (
                    <td key={column.key} className="px-4 py-3 text-sm text-slate-700">
                      {renderCell(row[column.key], column.format)}
                    </td>
                  ))}
                  {actions ? (
                    <td className="px-4 py-3 text-sm text-slate-700">{actions(row)}</td>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  {emptyText}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderCell(value, format) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (format === "currency") {
    return formatCurrency(value);
  }

  if (format === "percent") {
    return `${Number(value).toFixed(2)}%`;
  }

  if (format === "date") {
    return formatDate(value);
  }

  if (format === "datetime") {
    return formatDateTime(value);
  }

  if (format === "enum") {
    return formatEnumLabel(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value instanceof Date) {
    return formatDateTime(value);
  }

  if (typeof value === "string") {
    const maybeDate = new Date(value);
    if (!Number.isNaN(maybeDate.getTime()) && /T/.test(value)) {
      return formatDateTime(maybeDate);
    }

    if (/^(ACTIVE|INACTIVE|AVAILABLE|OCCUPIED|RESERVED|MAINTENANCE|UNPAID|PAID|EXPIRED)$/i.test(value)) {
      return formatEnumLabel(value);
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return formatDate(value);
    }

    return value;
  }

  return String(value);
}
