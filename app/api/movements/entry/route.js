import { NextResponse } from "next/server";
import oracledb from "oracledb";
import { query, withConnection } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const vehicleId = Number(body.vehicle_id);
    const staffId = Number(body.staff_id);

    if (!vehicleId || !staffId) {
      throw new Error("Vehicle and staff are required.");
    }

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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

