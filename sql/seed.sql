-- Sample data for VPMS
-- Run after schema.sql and plsql.sql.

DELETE FROM payments;
DELETE FROM exits;
DELETE FROM fees;
DELETE FROM violations;
DELETE FROM entries;
DELETE FROM passes;
DELETE FROM slots;
DELETE FROM staff;
DELETE FROM vehicles;
DELETE FROM parking_zones;
DELETE FROM owners;

COMMIT;

INSERT INTO owners (owner_id, full_name, phone, email, address) VALUES (1, 'Aarav Mehta', '9000000001', 'aarav@example.com', 'Mumbai');
INSERT INTO owners (owner_id, full_name, phone, email, address) VALUES (2, 'Diya Sharma', '9000000002', 'diya@example.com', 'Pune');
INSERT INTO owners (owner_id, full_name, phone, email, address) VALUES (3, 'Kabir Singh', '9000000003', 'kabir@example.com', 'Delhi');
INSERT INTO owners (owner_id, full_name, phone, email, address) VALUES (4, 'Meera Iyer', '9000000004', 'meera@example.com', 'Chennai');
INSERT INTO owners (owner_id, full_name, phone, email, address) VALUES (5, 'Rohan Gupta', '9000000005', 'rohan@example.com', 'Bengaluru');

INSERT INTO vehicles (vehicle_id, owner_id, vehicle_number, vehicle_type, brand, model, color, status) VALUES (1, 1, 'MH12AB1111', 'TWO_WHEELER', 'Honda', 'Activa', 'Red', 'ACTIVE');
INSERT INTO vehicles (vehicle_id, owner_id, vehicle_number, vehicle_type, brand, model, color, status) VALUES (2, 2, 'MH12CD2222', 'FOUR_WHEELER', 'Hyundai', 'i20', 'White', 'ACTIVE');
INSERT INTO vehicles (vehicle_id, owner_id, vehicle_number, vehicle_type, brand, model, color, status) VALUES (3, 3, 'MH12EF3333', 'HEAVY_VEHICLE', 'Tata', 'Ace', 'Blue', 'ACTIVE');
INSERT INTO vehicles (vehicle_id, owner_id, vehicle_number, vehicle_type, brand, model, color, status) VALUES (4, 4, 'MH12GH4444', 'FOUR_WHEELER', 'Toyota', 'Glanza', 'Grey', 'ACTIVE');
INSERT INTO vehicles (vehicle_id, owner_id, vehicle_number, vehicle_type, brand, model, color, status) VALUES (5, 5, 'MH12IJ5555', 'FOUR_WHEELER', 'Kia', 'Sonet', 'Black', 'ACTIVE');

INSERT INTO parking_zones (zone_id, zone_name, description, base_rate_per_hour, status) VALUES (1, 'Ground A', 'Two wheeler and compact parking', 20, 'ACTIVE');
INSERT INTO parking_zones (zone_id, zone_name, description, base_rate_per_hour, status) VALUES (2, 'Ground B', 'Regular four wheeler parking', 35, 'ACTIVE');
INSERT INTO parking_zones (zone_id, zone_name, description, base_rate_per_hour, status) VALUES (3, 'Premium', 'High priority and heavy vehicle bay', 60, 'ACTIVE');

INSERT INTO slots (slot_id, zone_id, slot_code, slot_type, status) VALUES (1, 1, 'A1', 'TWO_WHEELER', 'AVAILABLE');
INSERT INTO slots (slot_id, zone_id, slot_code, slot_type, status) VALUES (2, 1, 'A2', 'FOUR_WHEELER', 'AVAILABLE');
INSERT INTO slots (slot_id, zone_id, slot_code, slot_type, status) VALUES (3, 1, 'A3', 'ANY', 'AVAILABLE');
INSERT INTO slots (slot_id, zone_id, slot_code, slot_type, status) VALUES (4, 2, 'B1', 'FOUR_WHEELER', 'AVAILABLE');
INSERT INTO slots (slot_id, zone_id, slot_code, slot_type, status) VALUES (5, 2, 'B2', 'ANY', 'AVAILABLE');
INSERT INTO slots (slot_id, zone_id, slot_code, slot_type, status) VALUES (6, 2, 'B3', 'ANY', 'AVAILABLE');
INSERT INTO slots (slot_id, zone_id, slot_code, slot_type, status) VALUES (7, 3, 'C1', 'HEAVY_VEHICLE', 'AVAILABLE');
INSERT INTO slots (slot_id, zone_id, slot_code, slot_type, status) VALUES (8, 3, 'C2', 'FOUR_WHEELER', 'AVAILABLE');

INSERT INTO staff (staff_id, staff_name, role, phone, username, password_hash, status) VALUES (1, 'Admin One', 'ADMIN', '9100000001', 'admin', 'admin123', 'ACTIVE');
INSERT INTO staff (staff_id, staff_name, role, phone, username, password_hash, status) VALUES (2, 'Gate Attendant', 'ATTENDANT', '9100000002', 'attendant1', 'gate123', 'ACTIVE');
INSERT INTO staff (staff_id, staff_name, role, phone, username, password_hash, status) VALUES (3, 'Shift Supervisor', 'SUPERVISOR', '9100000003', 'supervisor', 'super123', 'ACTIVE');

DECLARE
  v_entry_id NUMBER;
  v_slot_id NUMBER;
BEGIN
  vpms_pkg.register_entry(1, 2, v_entry_id, v_slot_id);
END;
/

DECLARE
  v_entry_id NUMBER;
  v_slot_id NUMBER;
BEGIN
  vpms_pkg.register_entry(2, 2, v_entry_id, v_slot_id);
END;
/

DECLARE
  v_entry_id NUMBER;
  v_slot_id NUMBER;
BEGIN
  vpms_pkg.register_entry(5, 2, v_entry_id, v_slot_id);
END;
/

DECLARE
  v_entry_id NUMBER;
  v_slot_id NUMBER;
  v_exit_id NUMBER;
  v_fee_id NUMBER;
  v_payment_id NUMBER;
BEGIN
  vpms_pkg.register_entry(3, 2, v_entry_id, v_slot_id);
  UPDATE entries
     SET entry_time = SYSDATE - (2 / 24)
   WHERE entry_id = v_entry_id;
  vpms_pkg.register_exit(v_entry_id, 3, 'UPI', NULL, v_exit_id, v_fee_id, v_payment_id);
END;
/

DECLARE
  v_entry_id NUMBER;
  v_slot_id NUMBER;
  v_exit_id NUMBER;
  v_fee_id NUMBER;
  v_payment_id NUMBER;
BEGIN
  vpms_pkg.register_entry(4, 2, v_entry_id, v_slot_id);
  UPDATE entries
     SET entry_time = SYSDATE - (3 / 24)
   WHERE entry_id = v_entry_id;
  vpms_pkg.register_exit(v_entry_id, 3, 'CASH', NULL, v_exit_id, v_fee_id, v_payment_id);
END;
/

INSERT INTO passes (pass_id, vehicle_id, pass_type, start_date, end_date, status, pass_fee) VALUES (1, 1, 'MONTHLY', TRUNC(SYSDATE) - 5, TRUNC(SYSDATE) + 25, 'ACTIVE', 2500);
INSERT INTO passes (pass_id, vehicle_id, pass_type, start_date, end_date, status, pass_fee) VALUES (2, 2, 'WEEKLY', TRUNC(SYSDATE) - 14, TRUNC(SYSDATE) - 7, 'EXPIRED', 700);
INSERT INTO passes (pass_id, vehicle_id, pass_type, start_date, end_date, status, pass_fee) VALUES (3, 5, 'YEARLY', TRUNC(SYSDATE) - 30, TRUNC(SYSDATE) + 335, 'ACTIVE', 18000);

INSERT INTO violations (violation_id, vehicle_id, entry_id, violation_type, fine_amount, payment_status, issued_by, paid_at) VALUES (1, 4, NULL, 'Parking beyond slot boundary', 500, 'UNPAID', 3, NULL);
INSERT INTO violations (violation_id, vehicle_id, entry_id, violation_type, fine_amount, payment_status, issued_by, paid_at) VALUES (2, 2, NULL, 'Left engine running in bay', 250, 'PAID', 3, TRUNC(SYSDATE));

COMMIT;

BEGIN
  EXECUTE IMMEDIATE 'ALTER TABLE owners MODIFY owner_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
  EXECUTE IMMEDIATE 'ALTER TABLE vehicles MODIFY vehicle_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
  EXECUTE IMMEDIATE 'ALTER TABLE parking_zones MODIFY zone_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
  EXECUTE IMMEDIATE 'ALTER TABLE slots MODIFY slot_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
  EXECUTE IMMEDIATE 'ALTER TABLE staff MODIFY staff_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
  EXECUTE IMMEDIATE 'ALTER TABLE entries MODIFY entry_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
  EXECUTE IMMEDIATE 'ALTER TABLE exits MODIFY exit_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
  EXECUTE IMMEDIATE 'ALTER TABLE fees MODIFY fee_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
  EXECUTE IMMEDIATE 'ALTER TABLE payments MODIFY payment_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
  EXECUTE IMMEDIATE 'ALTER TABLE passes MODIFY pass_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
  EXECUTE IMMEDIATE 'ALTER TABLE violations MODIFY violation_id GENERATED BY DEFAULT ON NULL AS IDENTITY (START WITH LIMIT VALUE)';
END;
/
