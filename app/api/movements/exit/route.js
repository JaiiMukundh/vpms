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

export async function POST(request) {
  try {
    const body = await request.json();
    const entryId = Number(body.entry_id);
    const staffId = Number(body.staff_id);
    const paymentMode = String(body.payment_mode || "CASH");
    const referenceNo = body.reference_no ? String(body.reference_no) : null;

    if (!entryId || !staffId) {
      throw new Error("Entry and staff are required.");
    }

    await ensureActiveStaff(staffId);

    const result = await withConnection(async (connection) =>
      connection.execute(
        `BEGIN vpms_pkg.register_exit(:p_entry_id, :p_staff_id, :p_payment_mode, :p_reference_no, :p_exit_id, :p_fee_id, :p_payment_id); END;`,
        {
          p_entry_id: entryId,
          p_staff_id: staffId,
          p_payment_mode: paymentMode,
          p_reference_no: referenceNo,
          p_exit_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          p_fee_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          p_payment_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        },
        { autoCommit: true },
      ),
    );

    const exitId = result.outBinds.p_exit_id;
    const feeId = result.outBinds.p_fee_id;
    const paymentId = result.outBinds.p_payment_id;

    const exitResult = await query(
      `SELECT x.exit_id, x.entry_id, x.vehicle_id, v.vehicle_number, x.slot_id, s.slot_code, x.duration_minutes, x.fee_amount, x.payment_status, x.reference_no
       FROM exits x
       LEFT JOIN entries e ON e.entry_id = x.entry_id
       LEFT JOIN vehicles v ON v.vehicle_id = COALESCE(x.vehicle_id, e.vehicle_id)
       LEFT JOIN slots s ON s.slot_id = x.slot_id
       WHERE x.exit_id = :exit_id`,
      { exit_id: exitId },
    );

    return NextResponse.json({
      message: "Vehicle exit recorded successfully.",
      exit_id: exitId,
      fee_id: feeId,
      payment_id: paymentId,
      exit: exitResult.rows?.[0] || null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
