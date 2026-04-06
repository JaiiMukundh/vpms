import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

const reportSql = {
  "available-slots": "SELECT * FROM vw_available_slots ORDER BY zone_name, slot_code",
  "occupied-slots": "SELECT * FROM vw_occupied_slots ORDER BY zone_name, slot_code",
  "active-vehicles": "SELECT * FROM vw_active_vehicles ORDER BY entry_time ASC",
  "daily-revenue": "SELECT * FROM vw_daily_revenue ORDER BY revenue_date ASC",
  "unpaid-violations": "SELECT * FROM vw_unpaid_violations ORDER BY issued_at ASC",
  "active-passes": "SELECT * FROM vw_active_passes ORDER BY end_date ASC",
  "pass-status": "SELECT * FROM vw_pass_status ORDER BY status",
  "zone-occupancy": "SELECT * FROM vw_zone_occupancy ORDER BY zone_name",
  "fees": "SELECT * FROM vw_fee_summary ORDER BY fee_id ASC",
  "unpaid-fees": "SELECT * FROM vw_fee_summary WHERE payment_status = 'UNPAID' ORDER BY fee_id ASC",
  "currently-parked": "SELECT * FROM vw_currently_parked ORDER BY entry_time ASC",
};

export async function GET(request, { params }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const name = resolvedParams.name;
    if (name === "vehicle-history") {
      const url = new URL(request.url);
      const vehicleNumber = url.searchParams.get("vehicle_number");
      const data = vehicleNumber
        ? await query(
            `SELECT * FROM vw_vehicle_history WHERE UPPER(vehicle_number) LIKE UPPER(:vehicle_number) ORDER BY entry_time ASC`,
            { vehicle_number: `%${vehicleNumber}%` },
          )
        : await query(`SELECT * FROM vw_vehicle_history ORDER BY entry_time ASC`);
      return NextResponse.json({ rows: data.rows || [] });
    }

    const sql = reportSql[name];
    if (!sql) {
      throw new Error(`Unknown report: ${name}`);
    }

    const data = await query(sql);
    return NextResponse.json({ rows: data.rows || [] });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
