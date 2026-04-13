import { NextResponse } from "next/server";
import oracledb from "oracledb";
import { query, withConnection } from "@/lib/db";

export const runtime = "nodejs";

async function ensureActiveStaff(staffId) {
  const result = await query(
    `SELECT staff_id, staff_name, status
       FROM staff
      WHERE staff_id = :staff_id`,
    { staff_id: staffId },
  );

  const staff = result.rows?.[0];
  if (!staff) {
    throw new Error("Selected staff member was not found.");
  }

  if (staff.status !== "ACTIVE") {
    throw new Error("Please select an active staff member.");
  }
}

function formatEntryError(error) {
  const isSlotFull =
    error?.errorNum === 20002 ||
    /ORA-20002/i.test(error?.message || "") ||
    /All compatible slots are currently occupied/i.test(error?.message || "");

  if (isSlotFull) {
    return "All compatible slots are currently occupied. Please wait for a slot to become free or choose another vehicle type.";
  }

  return error?.message || "Entry failed.";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const vehicleId = Number(body.vehicle_id);
    const staffId = Number(body.staff_id);

    if (!vehicleId || !staffId) {
      throw new Error("Vehicle and staff are required.");
    }

    await ensureActiveStaff(staffId);

    const result = await withConnection(async (connection) =>
      connection.execute(
        `BEGIN vpms_pkg.register_entry(:p_vehicle_id, :p_staff_id, :p_entry_id, :p_slot_id); END;`,
        {
          p_vehicle_id: vehicleId,
          p_staff_id: staffId,
          p_entry_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          p_slot_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true },
      ),
    );

    const entryId = result.outBinds.p_entry_id;
    const slotId = result.outBinds.p_slot_id;

    const slotResult = await query(
      `SELECT s.slot_code, z.zone_name
       FROM slots s
       JOIN parking_zones z ON z.zone_id = s.zone_id
       WHERE s.slot_id = :slot_id`,
      { slot_id: slotId },
    );

    return NextResponse.json({
      message: "Vehicle entry recorded successfully.",
      entry_id: entryId,
      slot_id: slotId,
      slot: slotResult.rows?.[0] || null,
    });
  } catch (error) {
    return NextResponse.json({ error: formatEntryError(error) }, { status: 400 });
  }
}
