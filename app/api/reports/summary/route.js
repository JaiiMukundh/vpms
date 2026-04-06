import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [owners, vehicles, availableSlots, occupiedSlots, revenue, activeVehicles, unpaidViolations, activePasses] =
      await Promise.all([
        query("SELECT COUNT(*) AS total FROM owners"),
        query("SELECT COUNT(*) AS total FROM vehicles"),
        query("SELECT COUNT(*) AS total FROM vw_available_slots"),
        query("SELECT COUNT(*) AS total FROM vw_occupied_slots"),
        query(
          "SELECT NVL(SUM(amount_paid), 0) AS total FROM payments WHERE TRUNC(paid_at) = TRUNC(SYSDATE)",
        ),
        query("SELECT COUNT(*) AS total FROM vw_active_vehicles"),
        query("SELECT COUNT(*) AS total FROM violations WHERE payment_status = 'UNPAID'"),
        query(
          "SELECT COUNT(*) AS total FROM passes WHERE status = 'ACTIVE' AND end_date >= TRUNC(SYSDATE)",
        ),
      ]);

    return NextResponse.json({
      summary: {
        owners: owners.rows?.[0]?.total || 0,
        vehicles: vehicles.rows?.[0]?.total || 0,
        available_slots: availableSlots.rows?.[0]?.total || 0,
        occupied_slots: occupiedSlots.rows?.[0]?.total || 0,
        daily_revenue: revenue.rows?.[0]?.total || 0,
        active_vehicles: activeVehicles.rows?.[0]?.total || 0,
        unpaid_violations: unpaidViolations.rows?.[0]?.total || 0,
        active_passes: activePasses.rows?.[0]?.total || 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

