import { NextResponse } from "next/server";
import { execute, query } from "@/lib/db";
import { formatOptionLabel, getResourceDefinition } from "@/lib/vpms-data";

export const runtime = "nodejs";

function getDefinition(resource) {
  const definition = getResourceDefinition(resource);
  if (!definition) {
    throw new Error(`Unknown resource: ${resource}`);
  }
  return definition;
}

function buildSelectSql(definition) {
  if (definition.selectSql) {
    return definition.selectSql;
  }

  return `SELECT * FROM ${definition.table} ORDER BY ${definition.sortBy || definition.key}`;
}

function buildVehicleOptionsSql(optionsOnly, availableFor) {
  if (!optionsOnly) {
    return null;
  }

  if (availableFor === "entry") {
    return `
      SELECT v.vehicle_id, v.vehicle_number, v.vehicle_type, o.full_name AS owner_name
      FROM vehicles v
      LEFT JOIN owners o ON o.owner_id = v.owner_id
      WHERE v.status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1
          FROM entries e
          WHERE e.vehicle_id = v.vehicle_id
            AND e.status = 'ACTIVE'
        )
      ORDER BY v.vehicle_number ASC
    `;
  }

  if (availableFor === "pass") {
    return `
      SELECT v.vehicle_id, v.vehicle_number, v.vehicle_type, o.full_name AS owner_name
      FROM vehicles v
      LEFT JOIN owners o ON o.owner_id = v.owner_id
      WHERE v.status = 'ACTIVE'
        AND NOT EXISTS (
          SELECT 1
          FROM passes p
          WHERE p.vehicle_id = v.vehicle_id
            AND p.status = 'ACTIVE'
        )
      ORDER BY v.vehicle_number ASC
    `;
  }

  return null;
}

function buildInsertSql(definition, payload) {
  const fields = definition.fields.filter((field) => payload[field.name] !== undefined);
  if (!fields.length) {
    throw new Error(`No writable fields configured for ${definition.table}.`);
  }

  const columns = fields.map((field) => field.name);
  const values = fields
    .map((field) => (field.type === "date" ? `TO_DATE(:${field.name}, 'YYYY-MM-DD')` : `:${field.name}`))
    .join(", ");
  return {
    sql: `INSERT INTO ${definition.table} (${columns.join(", ")}) VALUES (${values})`,
    columns,
  };
}

function buildUpdateSql(definition, payload) {
  const fields = definition.fields.filter((field) => payload[field.name] !== undefined);
  if (!fields.length) {
    throw new Error(`No writable fields configured for ${definition.table}.`);
  }

  const assignments = fields
    .map((field) => `${field.name} = ${field.type === "date" ? `TO_DATE(:${field.name}, 'YYYY-MM-DD')` : `:${field.name}`}`)
    .join(", ");
  return {
    sql: `UPDATE ${definition.table} SET ${assignments} WHERE ${definition.key} = :id`,
    fields,
  };
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function formatDeleteError(definition, error) {
  const isChildRecordError = error?.errorNum === 2292 || /ORA-02292/i.test(error?.message || "");

  if (!isChildRecordError) {
    return {
      message: error?.message || "Delete failed.",
      status: 400,
    };
  }

  if (definition.table === "owners") {
    return {
      message:
        "Cannot delete this owner because one or more vehicles are assigned to them. Delete or reassign the vehicles first.",
      status: 409,
    };
  }

  return {
    message:
      `Cannot delete this ${definition.singularTitle.toLowerCase()} because related records exist. Remove the child records first.`,
    status: 409,
  };
}

export async function GET(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const definition = getDefinition(resolvedParams.resource);
    const url = new URL(request.url);
    const optionsOnly = url.searchParams.get("options") === "1";
    const availableFor = url.searchParams.get("availableFor");
    const vehicleOptionsSql = buildVehicleOptionsSql(optionsOnly, availableFor);
    const result = await query(vehicleOptionsSql || buildSelectSql(definition));
    const rows = result.rows || [];

    if (optionsOnly) {
      const options = rows.map((row) => ({
        value: row[definition.key],
        label: formatOptionLabel(row, definition.optionLabelFields || [definition.key]),
      }));
      return NextResponse.json({ options });
    }

    return NextResponse.json({ rows });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const definition = getDefinition(resolvedParams.resource);
    const payload = await readBody(request);
    const { sql, columns } = buildInsertSql(definition, payload);
    const binds = Object.fromEntries(columns.map((column) => [column, payload[column] ?? null]));
    await execute(sql, binds);
    return NextResponse.json({ message: `${definition.title} created successfully.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const definition = getDefinition(resolvedParams.resource);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      throw new Error("Missing record id.");
    }

    const payload = await readBody(request);
    const { sql, fields } = buildUpdateSql(definition, payload);
    const binds = Object.fromEntries(fields.map((field) => [field.name, payload[field.name] ?? null]));
    binds.id = Number.isNaN(Number(id)) ? id : Number(id);
    await execute(sql, binds);
    return NextResponse.json({ message: `${definition.title} updated successfully.` });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const definition = getDefinition(resolvedParams.resource);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) {
      throw new Error("Missing record id.");
    }

    await execute(`DELETE FROM ${definition.table} WHERE ${definition.key} = :id`, {
      id: Number.isNaN(Number(id)) ? id : Number(id),
    });
    return NextResponse.json({ message: `${definition.title} deleted successfully.` });
  } catch (error) {
    const resolvedParams = await Promise.resolve(params);
    const definition = getDefinition(resolvedParams.resource);
    const formatted = formatDeleteError(definition, error);
    return NextResponse.json({ error: formatted.message }, { status: formatted.status });
  }
}
