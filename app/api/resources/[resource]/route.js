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

function buildInsertSql(definition, payload) {
  const fields = definition.fields.filter((field) => payload[field.name] !== undefined);
  if (!fields.length) {
    throw new Error(`No writable fields configured for ${definition.table}.`);
  }

  const columns = fields.map((field) => field.name);
  const binds = columns.map((field) => `:${field}`).join(", ");
  return {
    sql: `INSERT INTO ${definition.table} (${columns.join(", ")}) VALUES (${binds})`,
    columns,
  };
}

function buildUpdateSql(definition, payload) {
  const fields = definition.fields.filter((field) => payload[field.name] !== undefined);
  if (!fields.length) {
    throw new Error(`No writable fields configured for ${definition.table}.`);
  }

  const assignments = fields.map((field) => `${field.name} = :${field.name}`).join(", ");
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

export async function GET(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const definition = getDefinition(resolvedParams.resource);
    const url = new URL(request.url);
    const optionsOnly = url.searchParams.get("options") === "1";
    const result = await query(buildSelectSql(definition));
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
