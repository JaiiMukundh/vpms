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

    const { exitId, feeId, paymentId } = await withTransaction(async (connection) => {
      const active = await connection.query(
        `SELECT e.vehicle_id, e.slot_id, e.entry_time, v.vehicle_type, z.base_rate_per_hour
           FROM entries e
           JOIN vehicles v ON v.vehicle_id = e.vehicle_id
           JOIN slots s ON s.slot_id = e.slot_id
           JOIN parking_zones z ON z.zone_id = s.zone_id
          WHERE e.entry_id = $1 AND e.status = 'ACTIVE'
          FOR UPDATE OF e`,
        [entryId],
      );
      const record = active.rows[0];
      if (!record) throw new Error("Active entry not found.");

      const durationMinutes = Math.max(1, Math.ceil((Date.now() - new Date(record.entry_time).getTime()) / 60000));
      const factor = { TWO_WHEELER: 1, FOUR_WHEELER: 1.5, HEAVY_VEHICLE: 2 }[record.vehicle_type] || 1;
      const feeAmount = Math.round(Math.max(1, Math.ceil(durationMinutes / 60)) * Number(record.base_rate_per_hour) * factor * 100) / 100;

      const fee = await connection.query(
        `INSERT INTO fees (entry_id, vehicle_id, vehicle_type, duration_minutes, rate_per_hour, fee_amount)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING fee_id`,
        [entryId, record.vehicle_id, record.vehicle_type, durationMinutes, record.base_rate_per_hour, feeAmount],
      );
      const exit = await connection.query(
        `INSERT INTO exits (entry_id, vehicle_id, slot_id, staff_id, duration_minutes, fee_amount, payment_status, reference_no)
         VALUES ($1, $2, $3, $4, $5, $6, 'PAID', $7) RETURNING exit_id`,
        [entryId, record.vehicle_id, record.slot_id, staffId, durationMinutes, feeAmount, referenceNo],
      );
      const payment = await connection.query(
        `INSERT INTO payments (fee_id, exit_id, amount_paid, payment_mode, reference_no)
         VALUES ($1, $2, $3, $4, COALESCE($5, 'PAY-' || $2)) RETURNING payment_id`,
        [fee.rows[0].fee_id, exit.rows[0].exit_id, feeAmount, paymentMode.toUpperCase(), referenceNo],
      );
      await connection.query(`UPDATE entries SET status = 'CLOSED' WHERE entry_id = $1`, [entryId]);
      await connection.query(
        `UPDATE slots SET status = 'AVAILABLE', current_vehicle_id = NULL, occupied_at = NULL WHERE slot_id = $1`,
        [record.slot_id],
      );
      return { exitId: exit.rows[0].exit_id, feeId: fee.rows[0].fee_id, paymentId: payment.rows[0].payment_id };
    });

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
