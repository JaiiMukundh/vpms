-- VPMS PL/SQL package, triggers, and views

CREATE OR REPLACE PACKAGE vpms_pkg AS
  FUNCTION calculate_fee(
    p_vehicle_type IN VARCHAR2,
    p_duration_minutes IN NUMBER,
    p_rate_per_hour IN NUMBER
  ) RETURN NUMBER;

  PROCEDURE register_entry(
    p_vehicle_id IN NUMBER,
    p_staff_id IN NUMBER,
    p_entry_id OUT NUMBER,
    p_slot_id OUT NUMBER
  );

  PROCEDURE register_exit(
    p_entry_id IN NUMBER,
    p_staff_id IN NUMBER,
    p_payment_mode IN VARCHAR2,
    p_reference_no IN VARCHAR2,
    p_exit_id OUT NUMBER,
    p_fee_id OUT NUMBER,
    p_payment_id OUT NUMBER
  );

  PROCEDURE record_violation(
    p_vehicle_id IN NUMBER,
    p_entry_id IN NUMBER,
    p_violation_type IN VARCHAR2,
    p_fine_amount IN NUMBER,
    p_staff_id IN NUMBER,
    p_violation_id OUT NUMBER
  );
END vpms_pkg;
/

CREATE OR REPLACE PACKAGE BODY vpms_pkg AS
  FUNCTION calculate_fee(
    p_vehicle_type IN VARCHAR2,
    p_duration_minutes IN NUMBER,
    p_rate_per_hour IN NUMBER
  ) RETURN NUMBER IS
    v_factor NUMBER := 1;
    v_hours NUMBER := GREATEST(1, CEIL(NVL(p_duration_minutes, 0) / 60));
  BEGIN
    v_factor := CASE UPPER(NVL(p_vehicle_type, 'FOUR_WHEELER'))
      WHEN 'TWO_WHEELER' THEN 1
      WHEN 'FOUR_WHEELER' THEN 1.5
      WHEN 'HEAVY_VEHICLE' THEN 2
      ELSE 1
    END;

    RETURN ROUND(v_hours * NVL(p_rate_per_hour, 0) * v_factor, 2);
  END calculate_fee;

  PROCEDURE register_entry(
    p_vehicle_id IN NUMBER,
    p_staff_id IN NUMBER,
    p_entry_id OUT NUMBER,
    p_slot_id OUT NUMBER
  ) IS
    v_vehicle_type vehicles.vehicle_type%TYPE;
    v_open_count NUMBER;
  BEGIN
    SELECT vehicle_type
      INTO v_vehicle_type
      FROM vehicles
     WHERE vehicle_id = p_vehicle_id
       AND status = 'ACTIVE';

    SELECT COUNT(*)
      INTO v_open_count
      FROM entries
     WHERE vehicle_id = p_vehicle_id
       AND status = 'ACTIVE';

    IF v_open_count > 0 THEN
      RAISE_APPLICATION_ERROR(-20001, 'Vehicle already has an active entry.');
    END IF;

    SELECT slot_id
      INTO p_slot_id
      FROM (
        SELECT s.slot_id
          FROM slots s
          JOIN parking_zones z ON z.zone_id = s.zone_id
         WHERE s.status = 'AVAILABLE'
           AND z.status = 'ACTIVE'
           AND (s.slot_type = v_vehicle_type OR s.slot_type = 'ANY')
         ORDER BY CASE WHEN s.slot_type = v_vehicle_type THEN 0 ELSE 1 END, s.slot_code
      )
     WHERE ROWNUM = 1;

    INSERT INTO entries (vehicle_id, slot_id, staff_id)
    VALUES (p_vehicle_id, p_slot_id, p_staff_id)
    RETURNING entry_id INTO p_entry_id;

    UPDATE slots
       SET status = 'OCCUPIED',
           current_vehicle_id = p_vehicle_id,
           occupied_at = SYSDATE
     WHERE slot_id = p_slot_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20002, 'All compatible slots are currently occupied for this vehicle type.');
  END register_entry;

  PROCEDURE register_exit(
    p_entry_id IN NUMBER,
    p_staff_id IN NUMBER,
    p_payment_mode IN VARCHAR2,
    p_reference_no IN VARCHAR2,
    p_exit_id OUT NUMBER,
    p_fee_id OUT NUMBER,
    p_payment_id OUT NUMBER
  ) IS
    v_vehicle_id entries.vehicle_id%TYPE;
    v_slot_id entries.slot_id%TYPE;
    v_vehicle_type vehicles.vehicle_type%TYPE;
    v_entry_time entries.entry_time%TYPE;
    v_rate_per_hour parking_zones.base_rate_per_hour%TYPE;
    v_duration_minutes NUMBER;
    v_fee_amount NUMBER;
    v_payment_reference VARCHAR2(50);
  BEGIN
    SELECT e.vehicle_id, e.slot_id, e.entry_time, v.vehicle_type, z.base_rate_per_hour
      INTO v_vehicle_id, v_slot_id, v_entry_time, v_vehicle_type, v_rate_per_hour
      FROM entries e
      JOIN vehicles v ON v.vehicle_id = e.vehicle_id
      JOIN slots s ON s.slot_id = e.slot_id
      JOIN parking_zones z ON z.zone_id = s.zone_id
     WHERE e.entry_id = p_entry_id
       AND e.status = 'ACTIVE';

    v_duration_minutes := GREATEST(1, CEIL((SYSDATE - v_entry_time) * 24 * 60));
    v_fee_amount := calculate_fee(v_vehicle_type, v_duration_minutes, v_rate_per_hour);

    INSERT INTO fees (
      entry_id,
      vehicle_id,
      vehicle_type,
      duration_minutes,
      rate_per_hour,
      fee_amount
    ) VALUES (
      p_entry_id,
      v_vehicle_id,
      v_vehicle_type,
      v_duration_minutes,
      v_rate_per_hour,
      v_fee_amount
    )
    RETURNING fee_id INTO p_fee_id;

    INSERT INTO exits (
      entry_id,
      vehicle_id,
      slot_id,
      staff_id,
      duration_minutes,
      fee_amount,
      payment_status,
      reference_no
    ) VALUES (
      p_entry_id,
      v_vehicle_id,
      v_slot_id,
      p_staff_id,
      v_duration_minutes,
      v_fee_amount,
      'UNPAID',
      p_reference_no
    )
    RETURNING exit_id INTO p_exit_id;

    v_payment_reference := NVL(p_reference_no, 'PAY-' || TO_CHAR(p_exit_id));

    INSERT INTO payments (
      fee_id,
      exit_id,
      amount_paid,
      payment_mode,
      reference_no
    ) VALUES (
      p_fee_id,
      p_exit_id,
      v_fee_amount,
      UPPER(p_payment_mode),
      v_payment_reference
    )
    RETURNING payment_id INTO p_payment_id;
  EXCEPTION
    WHEN NO_DATA_FOUND THEN
      RAISE_APPLICATION_ERROR(-20003, 'Active entry not found.');
  END register_exit;

  PROCEDURE record_violation(
    p_vehicle_id IN NUMBER,
    p_entry_id IN NUMBER,
    p_violation_type IN VARCHAR2,
    p_fine_amount IN NUMBER,
    p_staff_id IN NUMBER,
    p_violation_id OUT NUMBER
  ) IS
  BEGIN
    INSERT INTO violations (
      vehicle_id,
      entry_id,
      violation_type,
      fine_amount,
      issued_by
    ) VALUES (
      p_vehicle_id,
      p_entry_id,
      p_violation_type,
      p_fine_amount,
      p_staff_id
    )
    RETURNING violation_id INTO p_violation_id;
  END record_violation;
END vpms_pkg;
/

CREATE OR REPLACE TRIGGER trg_entries_bi
BEFORE INSERT ON entries
FOR EACH ROW
DECLARE
  v_slot_status slots.status%TYPE;
  v_current_vehicle NUMBER;
BEGIN
  SELECT status, current_vehicle_id
    INTO v_slot_status, v_current_vehicle
    FROM slots
   WHERE slot_id = :NEW.slot_id;

  IF v_slot_status <> 'AVAILABLE' OR v_current_vehicle IS NOT NULL THEN
    RAISE_APPLICATION_ERROR(-20011, 'Selected slot is not available.');
  END IF;

  :NEW.entry_time := NVL(:NEW.entry_time, SYSDATE);
  :NEW.status := NVL(:NEW.status, 'ACTIVE');
END;
/

CREATE OR REPLACE TRIGGER trg_exits_ai
AFTER INSERT ON exits
FOR EACH ROW
BEGIN
  UPDATE entries
     SET status = 'CLOSED'
   WHERE entry_id = :NEW.entry_id;

  UPDATE slots
     SET status = 'AVAILABLE',
         current_vehicle_id = NULL,
         occupied_at = NULL
   WHERE slot_id = :NEW.slot_id;
END;
/

CREATE OR REPLACE TRIGGER trg_payments_ai
AFTER INSERT ON payments
FOR EACH ROW
BEGIN
  UPDATE exits
     SET payment_status = 'PAID'
   WHERE exit_id = :NEW.exit_id;
END;
/

CREATE OR REPLACE TRIGGER trg_passes_biu
BEFORE INSERT OR UPDATE ON passes
FOR EACH ROW
BEGIN
  IF :NEW.end_date < :NEW.start_date THEN
    RAISE_APPLICATION_ERROR(-20021, 'Pass end date must be on or after the start date.');
  END IF;

  IF TRUNC(:NEW.end_date) < TRUNC(SYSDATE) THEN
    :NEW.status := 'EXPIRED';
  ELSE
    :NEW.status := NVL(:NEW.status, 'ACTIVE');
  END IF;
END;
/

CREATE OR REPLACE VIEW vw_available_slots AS
SELECT
  z.zone_name,
  s.slot_id,
  s.slot_code,
  s.slot_type,
  z.base_rate_per_hour
FROM slots s
JOIN parking_zones z ON z.zone_id = s.zone_id
WHERE s.status = 'AVAILABLE'
  AND z.status = 'ACTIVE';

CREATE OR REPLACE VIEW vw_occupied_slots AS
SELECT
  z.zone_name,
  s.slot_id,
  s.slot_code,
  s.slot_type,
  v.vehicle_number,
  o.full_name AS owner_name,
  s.occupied_at
FROM slots s
JOIN parking_zones z ON z.zone_id = s.zone_id
LEFT JOIN vehicles v ON v.vehicle_id = s.current_vehicle_id
LEFT JOIN owners o ON o.owner_id = v.owner_id
WHERE s.status = 'OCCUPIED';

CREATE OR REPLACE VIEW vw_active_vehicles AS
SELECT
  e.entry_id,
  v.vehicle_number,
  o.full_name AS owner_name,
  v.vehicle_type,
  z.zone_name,
  s.slot_code,
  e.entry_time
FROM entries e
JOIN vehicles v ON v.vehicle_id = e.vehicle_id
JOIN slots s ON s.slot_id = e.slot_id
JOIN parking_zones z ON z.zone_id = s.zone_id
LEFT JOIN owners o ON o.owner_id = v.owner_id
WHERE e.status = 'ACTIVE';

CREATE OR REPLACE VIEW vw_currently_parked AS
SELECT
  e.entry_id,
  v.vehicle_number,
  o.full_name AS owner_name,
  v.vehicle_type,
  z.zone_name,
  s.slot_code,
  e.entry_time
FROM entries e
JOIN vehicles v ON v.vehicle_id = e.vehicle_id
JOIN slots s ON s.slot_id = e.slot_id
JOIN parking_zones z ON z.zone_id = s.zone_id
LEFT JOIN owners o ON o.owner_id = v.owner_id
WHERE e.status = 'ACTIVE';

CREATE OR REPLACE VIEW vw_daily_revenue AS
SELECT
  TRUNC(paid_at) AS revenue_date,
  COUNT(*) AS payment_count,
  SUM(amount_paid) AS total_revenue
FROM payments
GROUP BY TRUNC(paid_at);

CREATE OR REPLACE VIEW vw_unpaid_violations AS
SELECT
  vln.violation_id,
  veh.vehicle_number,
  o.full_name AS owner_name,
  vln.violation_type,
  vln.fine_amount,
  vln.payment_status,
  st.staff_name AS issued_by_name,
  vln.issued_at,
  vln.paid_at
FROM violations vln
JOIN vehicles veh ON veh.vehicle_id = vln.vehicle_id
LEFT JOIN owners o ON o.owner_id = veh.owner_id
JOIN staff st ON st.staff_id = vln.issued_by
WHERE vln.payment_status = 'UNPAID';

CREATE OR REPLACE VIEW vw_active_passes AS
SELECT
  p.pass_id,
  veh.vehicle_number,
  o.full_name AS owner_name,
  p.pass_type,
  p.start_date,
  p.end_date,
  p.pass_fee,
  p.status
FROM passes p
JOIN vehicles veh ON veh.vehicle_id = p.vehicle_id
LEFT JOIN owners o ON o.owner_id = veh.owner_id
WHERE p.status = 'ACTIVE'
  AND p.end_date >= TRUNC(SYSDATE);

CREATE OR REPLACE VIEW vw_pass_status AS
SELECT
  status,
  COUNT(*) AS total_count
FROM passes
GROUP BY status;

CREATE OR REPLACE VIEW vw_zone_occupancy AS
SELECT
  zone_name,
  total_slots,
  occupied_slots,
  available_slots,
  CASE
    WHEN total_slots = 0 THEN 0
    ELSE ROUND((occupied_slots / total_slots) * 100, 2)
  END AS occupancy_percent
FROM (
  SELECT
    z.zone_name,
    COUNT(s.slot_id) AS total_slots,
    SUM(CASE WHEN s.status = 'OCCUPIED' THEN 1 ELSE 0 END) AS occupied_slots,
    SUM(CASE WHEN s.status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_slots
  FROM parking_zones z
  LEFT JOIN slots s ON s.zone_id = z.zone_id
  GROUP BY z.zone_name
);

CREATE OR REPLACE VIEW vw_vehicle_history AS
SELECT
  veh.vehicle_number,
  o.full_name AS owner_name,
  veh.vehicle_type,
  s.slot_code,
  e.entry_time,
  x.exit_time,
  x.duration_minutes,
  x.fee_amount,
  NVL(x.payment_status, 'PARKED') AS payment_status
FROM vehicles veh
LEFT JOIN owners o ON o.owner_id = veh.owner_id
LEFT JOIN entries e ON e.vehicle_id = veh.vehicle_id
LEFT JOIN exits x ON x.entry_id = e.entry_id
LEFT JOIN slots s ON s.slot_id = e.slot_id;

CREATE OR REPLACE VIEW vw_fee_summary AS
SELECT
  f.fee_id,
  f.entry_id,
  veh.vehicle_number,
  f.vehicle_type,
  f.duration_minutes,
  f.rate_per_hour,
  f.fee_amount,
  f.calculated_at,
  NVL(pmt.payment_status, 'UNPAID') AS payment_status,
  pmt.paid_at
FROM fees f
JOIN vehicles veh ON veh.vehicle_id = f.vehicle_id
LEFT JOIN (
  SELECT
    p.fee_id,
    'PAID' AS payment_status,
    p.paid_at
  FROM payments p
) pmt ON pmt.fee_id = f.fee_id;
