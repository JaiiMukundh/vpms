import { NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";

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

    const { entryId, slotId } = await withTransaction(async (connection) => {
      const vehicle = await connection.query(
        `SELECT vehicle_type FROM vehicles WHERE vehicle_id = $1 AND status = 'ACTIVE'`,
        [vehicleId],
      );
      if (!vehicle.rows[0]) throw new Error("Active vehicle was not found.");

      const active = await connection.query(
        `SELECT 1 FROM entries WHERE vehicle_id = $1 AND status = 'ACTIVE'`,
        [vehicleId],
      );
      if (active.rowCount) throw new Error("Vehicle already has an active entry.");

      const slot = await connection.query(
        `SELECT s.slot_id
           FROM slots s
           JOIN parking_zones z ON z.zone_id = s.zone_id
          WHERE s.status = 'AVAILABLE'
            AND z.status = 'ACTIVE'
            AND (s.slot_type = $1 OR s.slot_type = 'ANY')
          ORDER BY CASE WHEN s.slot_type = $1 THEN 0 ELSE 1 END, s.slot_code
          LIMIT 1
          FOR UPDATE OF s`,
        [vehicle.rows[0].vehicle_type],
      );
      if (!slot.rows[0]) throw new Error("All compatible slots are currently occupied for this vehicle type.");

      const slotId = slot.rows[0].slot_id;
      const entry = await connection.query(
        `INSERT INTO entries (vehicle_id, slot_id, staff_id)
         VALUES ($1, $2, $3) RETURNING entry_id`,
        [vehicleId, slotId, staffId],
      );
      await connection.query(
        `UPDATE slots SET status = 'OCCUPIED', current_vehicle_id = $1, occupied_at = NOW()
         WHERE slot_id = $2`,
        [vehicleId, slotId],
      );
      return { entryId: entry.rows[0].entry_id, slotId };
    });

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
