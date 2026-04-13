import { NextResponse } from "next/server";
import oracledb from "oracledb";
import { execute, query, withConnection } from "@/lib/db";
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

function buildStaffOptionsSql(optionsOnly) {
  if (!optionsOnly) {
    return null;
  }

  return `
    SELECT
      staff_id,
      staff_name
    FROM staff
    WHERE status = 'ACTIVE'
    ORDER BY staff_name ASC
  `;
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

function normalizeFieldValue(field, value) {
  if (value === null || value === undefined) {
    return value;
  }

  if (field?.name === "vehicle_number") {
    return String(value).trim().toUpperCase();
  }

  if (field?.name === "phone") {
    return String(value).trim();
  }

  return value;
}

function normalizeIdValue(id) {
  return Number.isNaN(Number(id)) ? id : Number(id);
}

function validateFieldValue(field, value, enforceRequired = false) {
  if (!field?.pattern) {
    const normalizedValue = normalizeFieldValue(field, value);
    const hasValue = normalizedValue !== null && normalizedValue !== undefined && String(normalizedValue).trim() !== "";

    if (field.required && enforceRequired && !hasValue) {
      throw new Error(`${field.label} is required.`);
    }

    if (field.required && !enforceRequired && !hasValue && value !== undefined) {
      throw new Error(`${field.label} is required.`);
    }

    return;
  }

  const normalizedValue = normalizeFieldValue(field, value);
  const hasValue = normalizedValue !== null && normalizedValue !== undefined && String(normalizedValue).trim() !== "";

  if (field.required && enforceRequired && !hasValue) {
    throw new Error(`${field.label} is required.`);
  }

  if (field.required && !enforceRequired && !hasValue && value !== undefined) {
    throw new Error(`${field.label} is required.`);
  }

  if (!hasValue) {
    return;
  }

  const regex = new RegExp(field.pattern);
  if (!regex.test(String(normalizedValue))) {
    throw new Error(field.validationMessage || `${field.label} is invalid.`);
  }
}

function validatePayload(definition, payload, options = {}) {
  definition.fields.forEach((field) => {
    validateFieldValue(field, payload[field.name], options.enforceRequired);
  });
}

async function fetchIds(connection, sql, binds, columnName) {
  const result = await connection.execute(sql, binds, {
    outFormat: oracledb.OUT_FORMAT_OBJECT,
  });

  return (result.rows || [])
    .map((row) => row[columnName])
    .filter((value) => value !== null && value !== undefined);
}

async function deleteEntryCascade(connection, entryId) {
  const slotIds = await fetchIds(
    connection,
    `SELECT slot_id
       FROM entries
      WHERE entry_id = :entry_id`,
    { entry_id: entryId },
    "SLOT_ID",
  );

  await connection.execute(
    `DELETE FROM payments
      WHERE exit_id IN (SELECT exit_id FROM exits WHERE entry_id = :entry_id)
         OR fee_id IN (SELECT fee_id FROM fees WHERE entry_id = :entry_id)`,
    { entry_id: entryId },
  );
  await connection.execute(`DELETE FROM exits WHERE entry_id = :entry_id`, { entry_id: entryId });
  await connection.execute(`DELETE FROM fees WHERE entry_id = :entry_id`, { entry_id: entryId });
  await connection.execute(`DELETE FROM violations WHERE entry_id = :entry_id`, { entry_id: entryId });
  if (slotIds[0] !== undefined) {
    await connection.execute(
      `UPDATE slots
          SET current_vehicle_id = NULL,
              occupied_at = NULL,
              status = 'AVAILABLE'
        WHERE slot_id = :slot_id`,
      { slot_id: slotIds[0] },
    );
  }
  await connection.execute(`DELETE FROM entries WHERE entry_id = :entry_id`, { entry_id: entryId });
}

async function deleteExitCascade(connection, exitId) {
  await connection.execute(`DELETE FROM payments WHERE exit_id = :exit_id`, { exit_id: exitId });
  await connection.execute(`DELETE FROM exits WHERE exit_id = :exit_id`, { exit_id: exitId });
}

async function deleteFeeCascade(connection, feeId) {
  await connection.execute(`DELETE FROM payments WHERE fee_id = :fee_id`, { fee_id: feeId });
  await connection.execute(`DELETE FROM fees WHERE fee_id = :fee_id`, { fee_id: feeId });
}

async function deleteSlotCascade(connection, slotId) {
  const entryIds = await fetchIds(
    connection,
    `SELECT entry_id
       FROM entries
      WHERE slot_id = :slot_id
      ORDER BY entry_id`,
    { slot_id: slotId },
    "ENTRY_ID",
  );

  for (const entryId of entryIds) {
    await deleteEntryCascade(connection, entryId);
  }

  await connection.execute(
    `UPDATE slots
        SET current_vehicle_id = NULL,
            occupied_at = NULL,
            status = 'AVAILABLE'
      WHERE slot_id = :slot_id`,
    { slot_id: slotId },
  );
  await connection.execute(`DELETE FROM slots WHERE slot_id = :slot_id`, { slot_id: slotId });
}

async function deleteVehicleCascade(connection, vehicleId) {
  const entryIds = await fetchIds(
    connection,
    `SELECT entry_id
       FROM entries
      WHERE vehicle_id = :vehicle_id
      ORDER BY entry_id`,
    { vehicle_id: vehicleId },
    "ENTRY_ID",
  );

  for (const entryId of entryIds) {
    await deleteEntryCascade(connection, entryId);
  }

  await connection.execute(`DELETE FROM passes WHERE vehicle_id = :vehicle_id`, { vehicle_id: vehicleId });
  await connection.execute(`DELETE FROM violations WHERE vehicle_id = :vehicle_id`, { vehicle_id: vehicleId });
  await connection.execute(
    `UPDATE slots
        SET current_vehicle_id = NULL,
            occupied_at = NULL,
            status = 'AVAILABLE'
      WHERE current_vehicle_id = :vehicle_id`,
    { vehicle_id: vehicleId },
  );
  await connection.execute(`DELETE FROM vehicles WHERE vehicle_id = :vehicle_id`, { vehicle_id: vehicleId });
}

async function deleteOwnerCascade(connection, ownerId) {
  const vehicleIds = await fetchIds(
    connection,
    `SELECT vehicle_id
       FROM vehicles
      WHERE owner_id = :owner_id
      ORDER BY vehicle_id`,
    { owner_id: ownerId },
    "VEHICLE_ID",
  );

  for (const vehicleId of vehicleIds) {
    await deleteVehicleCascade(connection, vehicleId);
  }

  await connection.execute(`DELETE FROM owners WHERE owner_id = :owner_id`, { owner_id: ownerId });
}

async function deleteZoneCascade(connection, zoneId) {
  const slotIds = await fetchIds(
    connection,
    `SELECT slot_id
       FROM slots
      WHERE zone_id = :zone_id
      ORDER BY slot_id`,
    { zone_id: zoneId },
    "SLOT_ID",
  );

  for (const slotId of slotIds) {
    await deleteSlotCascade(connection, slotId);
  }

  await connection.execute(`DELETE FROM parking_zones WHERE zone_id = :zone_id`, { zone_id: zoneId });
}

async function deleteStaffCascade(connection, staffId) {
  const entryIds = await fetchIds(
    connection,
    `SELECT DISTINCT entry_id
       FROM (
         SELECT e.entry_id AS entry_id
           FROM entries e
          WHERE e.staff_id = :staff_id
         UNION
         SELECT x.entry_id AS entry_id
           FROM exits x
          WHERE x.staff_id = :staff_id
       )
      ORDER BY entry_id`,
    { staff_id: staffId },
    "ENTRY_ID",
  );

  for (const entryId of entryIds) {
    await deleteEntryCascade(connection, entryId);
  }

  await connection.execute(`DELETE FROM violations WHERE issued_by = :staff_id`, { staff_id: staffId });
  await connection.execute(`DELETE FROM staff WHERE staff_id = :staff_id`, { staff_id: staffId });
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

function formatSaveError(definition, error) {
  const isUniqueViolation = error?.errorNum === 1 || /ORA-00001/i.test(error?.message || "");
  const isPhoneCheckViolation =
    error?.errorNum === 2290 ||
    /ORA-02290/i.test(error?.message || "") ||
    /CK_(OWNERS|STAFF)_PHONE_DIGITS/i.test(error?.message || "");

  if (!isUniqueViolation) {
    if (isPhoneCheckViolation && (definition.table === "owners" || definition.table === "staff")) {
      return {
        message: "Phone number must be exactly 10 digits.",
        status: 400,
      };
    }

    return {
      message: error?.message || "Save failed.",
      status: 400,
    };
  }

  if (definition.table === "slots") {
    return {
      message:
        "This slot code already exists. Please enter a different slot code because each parking slot must be unique.",
      status: 409,
    };
  }

  if (definition.table === "vehicles") {
    return {
      message:
        "This vehicle number already exists. Please use a different vehicle number because duplicates are not allowed.",
      status: 409,
    };
  }

  if (definition.table === "owners") {
    return {
      message:
        "This owner already exists with the same phone number or email address. Please use unique contact details.",
      status: 409,
    };
  }

  if (definition.table === "staff") {
    return {
      message:
        "This staff record already uses a duplicate phone number or username. Please choose unique values.",
      status: 409,
    };
  }

  return {
    message:
      `A record with the same unique value already exists in ${definition.title.toLowerCase()}. Please use a different value.`,
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
    const staffOptionsSql = definition.table === "staff" ? buildStaffOptionsSql(optionsOnly) : null;
    const vehicleOptionsSql = buildVehicleOptionsSql(optionsOnly, availableFor);
    const result = await query(staffOptionsSql || vehicleOptionsSql || buildSelectSql(definition));
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
    validatePayload(definition, payload, { enforceRequired: true });
    const { sql, columns } = buildInsertSql(definition, payload);
    const binds = Object.fromEntries(
      columns.map((column) => {
        const field = definition.fields.find((item) => item.name === column);
        return [column, normalizeFieldValue(field, payload[column] ?? null)];
      }),
    );
    await execute(sql, binds);
    return NextResponse.json({ message: `${definition.title} created successfully.` });
  } catch (error) {
    const resolvedParams = await Promise.resolve(params);
    const definition = getDefinition(resolvedParams.resource);
    const formatted = formatSaveError(definition, error);
    return NextResponse.json({ error: formatted.message }, { status: formatted.status });
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
    validatePayload(definition, payload);
    const { sql, fields } = buildUpdateSql(definition, payload);
    const binds = Object.fromEntries(
      fields.map((field) => [field.name, normalizeFieldValue(field, payload[field.name] ?? null)]),
    );
    binds.id = Number.isNaN(Number(id)) ? id : Number(id);
    await execute(sql, binds);
    return NextResponse.json({ message: `${definition.title} updated successfully.` });
  } catch (error) {
    const resolvedParams = await Promise.resolve(params);
    const definition = getDefinition(resolvedParams.resource);
    const formatted = formatSaveError(definition, error);
    return NextResponse.json({ error: formatted.message }, { status: formatted.status });
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

    const recordId = normalizeIdValue(id);

    if (definition.table === "owners") {
      await withConnection(async (connection) => {
        await deleteOwnerCascade(connection, recordId);
        await connection.commit();
      });
      return NextResponse.json({ message: "Owner deleted successfully." });
    }

    if (definition.table === "parking_zones") {
      await withConnection(async (connection) => {
        await deleteZoneCascade(connection, recordId);
        await connection.commit();
      });
      return NextResponse.json({ message: "Parking zone deleted successfully." });
    }

    if (definition.table === "staff") {
      await withConnection(async (connection) => {
        await deleteStaffCascade(connection, recordId);
        await connection.commit();
      });
      return NextResponse.json({ message: "Staff deleted successfully." });
    }

    if (definition.table === "vehicles") {
      await withConnection(async (connection) => {
        await deleteVehicleCascade(connection, recordId);
        await connection.commit();
      });
      return NextResponse.json({ message: "Vehicle deleted successfully." });
    }

    if (definition.table === "slots") {
      await withConnection(async (connection) => {
        await deleteSlotCascade(connection, recordId);
        await connection.commit();
      });
      return NextResponse.json({ message: "Slot deleted successfully." });
    }

    if (definition.table === "entries") {
      await withConnection(async (connection) => {
        await deleteEntryCascade(connection, recordId);
        await connection.commit();
      });
      return NextResponse.json({ message: "Entry deleted successfully." });
    }

    if (definition.table === "exits") {
      await withConnection(async (connection) => {
        await deleteExitCascade(connection, recordId);
        await connection.commit();
      });
      return NextResponse.json({ message: "Exit deleted successfully." });
    }

    if (definition.table === "fees") {
      await withConnection(async (connection) => {
        await deleteFeeCascade(connection, recordId);
        await connection.commit();
      });
      return NextResponse.json({ message: "Fee deleted successfully." });
    }

    await execute(`DELETE FROM ${definition.table} WHERE ${definition.key} = :id`, {
      id: recordId,
    });
    return NextResponse.json({ message: `${definition.title} deleted successfully.` });
  } catch (error) {
    const resolvedParams = await Promise.resolve(params);
    const definition = getDefinition(resolvedParams.resource);
    const formatted = formatDeleteError(definition, error);
    return NextResponse.json({ error: formatted.message }, { status: formatted.status });
  }
}
