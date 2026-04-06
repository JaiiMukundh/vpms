const today = () => new Date().toISOString().slice(0, 10);

export const vehicleTypeOptions = [
  { value: "TWO_WHEELER", label: "Two Wheeler" },
  { value: "FOUR_WHEELER", label: "Four Wheeler" },
  { value: "HEAVY_VEHICLE", label: "Heavy Vehicle" },
];

export const slotTypeOptions = [
  { value: "ANY", label: "Any Vehicle" },
  { value: "TWO_WHEELER", label: "Two Wheeler" },
  { value: "FOUR_WHEELER", label: "Four Wheeler" },
  { value: "HEAVY_VEHICLE", label: "Heavy Vehicle" },
];

export const activeStatusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export const slotStatusOptions = [
  { value: "AVAILABLE", label: "Available" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "RESERVED", label: "Reserved" },
  { value: "MAINTENANCE", label: "Maintenance" },
];

export const staffRoleOptions = [
  { value: "ADMIN", label: "Admin" },
  { value: "ATTENDANT", label: "Attendant" },
  { value: "SUPERVISOR", label: "Supervisor" },
];

export const passTypeOptions = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

export const paymentModeOptions = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "NETBANKING", label: "Net Banking" },
];

export const violationStatusOptions = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PAID", label: "Paid" },
];

export const navigationItems = [
  { href: "/", label: "Dashboard", icon: "layout" },
  { href: "/owners", label: "Owners", icon: "users" },
  { href: "/vehicles", label: "Vehicles", icon: "car" },
  { href: "/zones-slots", label: "Zones & Slots", icon: "parking" },
  { href: "/entry", label: "Entry", icon: "enter" },
  { href: "/exit", label: "Exit", icon: "exit" },
  { href: "/payments", label: "Payments", icon: "payment" },
  { href: "/passes", label: "Passes", icon: "pass" },
  { href: "/violations", label: "Violations", icon: "shield" },
  { href: "/reports", label: "Reports", icon: "report" },
];

export const reportItems = [
  { key: "available-slots", title: "Available Slots" },
  { key: "occupied-slots", title: "Occupied Slots" },
  { key: "active-vehicles", title: "Active Vehicles" },
  { key: "daily-revenue", title: "Daily Revenue" },
  { key: "unpaid-violations", title: "Unpaid Violations" },
  { key: "active-passes", title: "Active Passes" },
  { key: "pass-status", title: "Pass Status" },
  { key: "zone-occupancy", title: "Zone Occupancy" },
  { key: "vehicle-history", title: "Vehicle History" },
];

const field = (name, label, type = "text", extra = {}) => ({
  name,
  label,
  type,
  ...extra,
});

const column = (key, label, format) => ({ key, label, format });

export const resourceDefinitions = {
  owners: {
    title: "Owners",
    singularTitle: "Owner",
    table: "owners",
    key: "owner_id",
    endpoint: "/api/resources/owners",
    sortBy: "owner_id ASC",
    selectSql:
      "SELECT owner_id, full_name, phone, email, address, created_at FROM owners ORDER BY owner_id ASC",
    searchFields: ["full_name", "phone", "email", "address"],
    optionLabelFields: ["full_name", "phone"],
    fields: [
      field("full_name", "Full Name", "text", { required: true }),
      field("phone", "Phone", "text", { required: true }),
      field("email", "Email", "email"),
      field("address", "Address", "textarea"),
    ],
    columns: [
      column("owner_id", "ID"),
      column("full_name", "Owner"),
      column("phone", "Phone"),
      column("email", "Email"),
      column("address", "Address"),
    ],
  },
  vehicles: {
    title: "Vehicles",
    singularTitle: "Vehicle",
    table: "vehicles",
    key: "vehicle_id",
    endpoint: "/api/resources/vehicles",
    sortBy: "vehicle_id ASC",
    selectSql:
      "SELECT v.vehicle_id, v.owner_id, o.full_name AS owner_name, v.vehicle_number, v.vehicle_type, v.brand, v.model, v.color, v.status, v.created_at FROM vehicles v LEFT JOIN owners o ON o.owner_id = v.owner_id ORDER BY v.vehicle_id ASC",
    searchFields: ["owner_name", "vehicle_number", "vehicle_type", "brand", "model", "color", "status"],
    optionLabelFields: ["vehicle_number", "vehicle_type"],
    fields: [
      field("owner_id", "Owner", "select", {
        required: true,
        source: "owners",
        valueType: "number",
      }),
      field("vehicle_number", "Vehicle Number", "text", { required: true }),
      field("vehicle_type", "Vehicle Type", "select", {
        required: true,
        options: vehicleTypeOptions,
      }),
      field("brand", "Brand", "text", { required: true }),
      field("model", "Model", "text", { required: true }),
      field("color", "Color", "text"),
      field("status", "Status", "select", {
        required: true,
        options: activeStatusOptions,
        defaultValue: "ACTIVE",
      }),
    ],
    columns: [
      column("vehicle_id", "ID"),
      column("owner_name", "Owner"),
      column("vehicle_number", "Number"),
      column("vehicle_type", "Type"),
      column("brand", "Brand"),
      column("model", "Model"),
      column("color", "Color"),
      column("status", "Status"),
    ],
  },
  parking_zones: {
    title: "Parking Zones",
    singularTitle: "Zone",
    table: "parking_zones",
    key: "zone_id",
    endpoint: "/api/resources/parking_zones",
    sortBy: "zone_id ASC",
    selectSql:
      "SELECT zone_id, zone_name, description, base_rate_per_hour, status, created_at FROM parking_zones ORDER BY zone_id ASC",
    searchFields: ["zone_name", "description"],
    optionLabelFields: ["zone_name"],
    fields: [
      field("zone_name", "Zone Name", "text", { required: true }),
      field("description", "Description", "textarea"),
      field("base_rate_per_hour", "Base Rate / Hour", "number", {
        required: true,
        step: "0.01",
        min: 1,
      }),
      field("status", "Status", "select", {
        required: true,
        options: activeStatusOptions,
        defaultValue: "ACTIVE",
      }),
    ],
    columns: [
      column("zone_id", "ID"),
      column("zone_name", "Zone"),
      column("description", "Description"),
      column("base_rate_per_hour", "Base Rate", "currency"),
      column("status", "Status"),
    ],
  },
  slots: {
    title: "Slots",
    singularTitle: "Slot",
    table: "slots",
    key: "slot_id",
    endpoint: "/api/resources/slots",
    sortBy: "slot_id ASC",
    selectSql:
      "SELECT s.slot_id, s.zone_id, z.zone_name, s.slot_code, s.slot_type, s.status, s.current_vehicle_id, v.vehicle_number AS current_vehicle_number, s.occupied_at, s.created_at FROM slots s LEFT JOIN parking_zones z ON z.zone_id = s.zone_id LEFT JOIN vehicles v ON v.vehicle_id = s.current_vehicle_id ORDER BY s.slot_id ASC",
    searchFields: ["zone_name", "slot_code", "slot_type", "status", "current_vehicle_number"],
    optionLabelFields: ["slot_code", "slot_type"],
    fields: [
      field("zone_id", "Zone", "select", {
        required: true,
        source: "parking_zones",
        valueType: "number",
      }),
      field("slot_code", "Slot Code", "text", { required: true }),
      field("slot_type", "Slot Type", "select", {
        required: true,
        options: slotTypeOptions,
      }),
      field("status", "Status", "select", {
        required: true,
        options: slotStatusOptions,
        defaultValue: "AVAILABLE",
      }),
    ],
    columns: [
      column("slot_id", "ID"),
      column("zone_name", "Zone"),
      column("slot_code", "Slot"),
      column("slot_type", "Type"),
      column("status", "Status"),
      column("current_vehicle_number", "Vehicle"),
    ],
  },
  staff: {
    title: "Staff",
    singularTitle: "Staff Member",
    table: "staff",
    key: "staff_id",
    endpoint: "/api/resources/staff",
    sortBy: "staff_id ASC",
    selectSql:
      "SELECT staff_id, staff_name, role, phone, username, status, created_at FROM staff ORDER BY staff_id ASC",
    searchFields: ["staff_name", "role", "phone", "username"],
    optionLabelFields: ["staff_name", "role"],
    fields: [
      field("staff_name", "Staff Name", "text", { required: true }),
      field("role", "Role", "select", {
        required: true,
        options: staffRoleOptions,
      }),
      field("phone", "Phone", "text", { required: true }),
      field("username", "Username", "text", { required: true }),
      field("password_hash", "Password Hash", "text", { required: true }),
      field("status", "Status", "select", {
        required: true,
        options: activeStatusOptions,
        defaultValue: "ACTIVE",
      }),
    ],
    columns: [
      column("staff_id", "ID"),
      column("staff_name", "Staff"),
      column("role", "Role"),
      column("phone", "Phone"),
      column("username", "Username"),
      column("status", "Status"),
    ],
  },
  entries: {
    title: "Entries",
    singularTitle: "Entry",
    table: "entries",
    key: "entry_id",
    endpoint: "/api/resources/entries",
    sortBy: "entry_id ASC",
    selectSql:
      "SELECT e.entry_id, e.vehicle_id, v.vehicle_number, e.slot_id, s.slot_code, e.staff_id, st.staff_name, e.entry_time, e.status FROM entries e LEFT JOIN vehicles v ON v.vehicle_id = e.vehicle_id LEFT JOIN slots s ON s.slot_id = e.slot_id LEFT JOIN staff st ON st.staff_id = e.staff_id ORDER BY e.entry_id ASC",
    optionLabelFields: ["entry_id", "vehicle_number", "slot_code", "status"],
    fields: [],
    columns: [
      column("entry_id", "ID"),
      column("vehicle_number", "Vehicle"),
      column("slot_code", "Slot"),
      column("staff_name", "Staff"),
      column("entry_time", "Entry Time", "datetime"),
      column("status", "Status"),
    ],
  },
  exits: {
    title: "Exits",
    singularTitle: "Exit",
    table: "exits",
    key: "exit_id",
    endpoint: "/api/resources/exits",
    sortBy: "exit_id ASC",
    selectSql:
      "SELECT x.exit_id, x.entry_id, e.vehicle_id, v.vehicle_number, x.slot_id, s.slot_code, x.staff_id, st.staff_name, x.exit_time, x.duration_minutes, x.fee_amount, x.payment_status, x.reference_no FROM exits x LEFT JOIN entries e ON e.entry_id = x.entry_id LEFT JOIN vehicles v ON v.vehicle_id = e.vehicle_id LEFT JOIN slots s ON s.slot_id = x.slot_id LEFT JOIN staff st ON st.staff_id = x.staff_id ORDER BY x.exit_id ASC",
    optionLabelFields: ["exit_id", "vehicle_number", "slot_code", "payment_status"],
    fields: [],
    columns: [
      column("exit_id", "ID"),
      column("vehicle_number", "Vehicle"),
      column("slot_code", "Slot"),
      column("duration_minutes", "Duration"),
      column("fee_amount", "Fee", "currency"),
      column("payment_status", "Payment"),
      column("reference_no", "Ref No"),
    ],
  },
  fees: {
    title: "Fees",
    singularTitle: "Fee",
    table: "fees",
    key: "fee_id",
    endpoint: "/api/resources/fees",
    sortBy: "fee_id ASC",
    selectSql:
      "SELECT f.fee_id, f.entry_id, e.vehicle_id, v.vehicle_number, f.vehicle_type, f.duration_minutes, f.rate_per_hour, f.fee_amount, f.calculated_at, CASE WHEN p.payment_id IS NULL THEN 'UNPAID' ELSE 'PAID' END AS payment_status FROM fees f LEFT JOIN entries e ON e.entry_id = f.entry_id LEFT JOIN vehicles v ON v.vehicle_id = f.vehicle_id LEFT JOIN payments p ON p.fee_id = f.fee_id ORDER BY f.fee_id ASC",
    optionLabelFields: ["fee_id", "vehicle_number", "fee_amount", "payment_status"],
    fields: [],
    columns: [
      column("fee_id", "ID"),
      column("vehicle_number", "Vehicle"),
      column("vehicle_type", "Type"),
      column("duration_minutes", "Duration"),
      column("fee_amount", "Amount", "currency"),
      column("payment_status", "Status"),
    ],
  },
  payments: {
    title: "Payments",
    singularTitle: "Payment",
    table: "payments",
    key: "payment_id",
    endpoint: "/api/resources/payments",
    sortBy: "payment_id ASC",
    selectSql:
      "SELECT p.payment_id, p.fee_id, f.vehicle_id, v.vehicle_number, p.exit_id, x.reference_no AS exit_reference, p.amount_paid, p.payment_mode, p.reference_no, p.paid_at FROM payments p LEFT JOIN fees f ON f.fee_id = p.fee_id LEFT JOIN vehicles v ON v.vehicle_id = f.vehicle_id LEFT JOIN exits x ON x.exit_id = p.exit_id ORDER BY p.payment_id ASC",
    searchFields: ["vehicle_number", "payment_mode", "reference_no", "exit_reference"],
    optionLabelFields: ["payment_id", "vehicle_number", "amount_paid", "payment_mode"],
    fields: [
      field("fee_id", "Fee", "select", {
        required: true,
        source: "fees",
        valueType: "number",
      }),
      field("exit_id", "Exit", "select", {
        required: true,
        source: "exits",
        valueType: "number",
      }),
      field("amount_paid", "Amount Paid", "number", {
        required: true,
        step: "0.01",
        min: 0,
      }),
      field("payment_mode", "Payment Mode", "select", {
        required: true,
        options: paymentModeOptions,
      }),
      field("reference_no", "Reference No", "text"),
    ],
    columns: [
      column("payment_id", "ID"),
      column("vehicle_number", "Vehicle"),
      column("fee_id", "Fee ID"),
      column("exit_reference", "Exit Ref"),
      column("amount_paid", "Amount", "currency"),
      column("payment_mode", "Mode"),
      column("reference_no", "Reference No"),
      column("paid_at", "Paid At", "datetime"),
    ],
  },
  passes: {
    title: "Passes",
    singularTitle: "Pass",
    table: "passes",
    key: "pass_id",
    endpoint: "/api/resources/passes",
    sortBy: "pass_id ASC",
    selectSql:
      "SELECT p.pass_id, p.vehicle_id, v.vehicle_number, p.pass_type, p.start_date, p.end_date, p.status, p.pass_fee, p.created_at FROM passes p LEFT JOIN vehicles v ON v.vehicle_id = p.vehicle_id ORDER BY p.pass_id ASC",
    searchFields: ["vehicle_number", "pass_type", "status"],
    optionLabelFields: ["pass_id", "pass_type", "status"],
    fields: [
      field("vehicle_id", "Vehicle", "select", {
        required: true,
        source: "vehicles",
        optionQuery: "availableFor=pass",
        valueType: "number",
      }),
      field("pass_type", "Pass Type", "select", {
        required: true,
        options: passTypeOptions,
      }),
      field("start_date", "Start Date", "date", {
        required: true,
        defaultValue: today(),
      }),
      field("end_date", "End Date", "date", { required: true }),
      field("status", "Status", "select", {
        required: true,
        options: [
          { value: "ACTIVE", label: "Active" },
          { value: "EXPIRED", label: "Expired" },
        ],
        defaultValue: "ACTIVE",
      }),
      field("pass_fee", "Pass Fee", "number", {
        required: true,
        step: "0.01",
        min: 0,
      }),
    ],
    columns: [
      column("pass_id", "ID"),
      column("vehicle_number", "Vehicle"),
      column("pass_type", "Type"),
      column("start_date", "Start", "date"),
      column("end_date", "End", "date"),
      column("status", "Status"),
      column("pass_fee", "Fee", "currency"),
    ],
  },
  violations: {
    title: "Violations",
    singularTitle: "Violation",
    table: "violations",
    key: "violation_id",
    endpoint: "/api/resources/violations",
    sortBy: "violation_id ASC",
    selectSql:
      "SELECT v.violation_id, v.vehicle_id, veh.vehicle_number, v.violation_type, v.fine_amount, v.payment_status, v.issued_by, s.staff_name AS issued_by_name, v.issued_at, v.paid_at FROM violations v LEFT JOIN vehicles veh ON veh.vehicle_id = v.vehicle_id LEFT JOIN staff s ON s.staff_id = v.issued_by ORDER BY v.violation_id ASC",
    searchFields: ["vehicle_number", "violation_type", "payment_status"],
    optionLabelFields: ["violation_id", "violation_type", "payment_status"],
    fields: [
      field("vehicle_id", "Vehicle", "select", {
        required: true,
        source: "vehicles",
        valueType: "number",
      }),
      field("entry_id", "Entry", "select", {
        required: false,
        source: "entries",
        valueType: "number",
      }),
      field("violation_type", "Violation Type", "text", { required: true }),
      field("fine_amount", "Fine Amount", "number", {
        required: true,
        step: "0.01",
        min: 0,
      }),
      field("payment_status", "Payment Status", "select", {
        required: true,
        options: violationStatusOptions,
        defaultValue: "UNPAID",
      }),
      field("issued_by", "Issued By", "select", {
        required: true,
        source: "staff",
        valueType: "number",
      }),
      field("paid_at", "Paid At", "date", {
        showWhen: { field: "payment_status", value: "PAID" },
      }),
    ],
    columns: [
      column("violation_id", "ID"),
      column("vehicle_number", "Vehicle"),
      column("entry_id", "Entry ID"),
      column("violation_type", "Type"),
      column("fine_amount", "Fine", "currency"),
      column("payment_status", "Payment Status"),
      column("issued_by_name", "Issued By"),
      column("paid_at", "Paid At", "datetime"),
    ],
  },
};

export const dashboardMetrics = [
  { key: "owners", label: "Owners", endpoint: "/api/reports/summary", field: "owners" },
  { key: "vehicles", label: "Vehicles", endpoint: "/api/reports/summary", field: "vehicles" },
  {
    key: "available_slots",
    label: "Available Slots",
    endpoint: "/api/reports/summary",
    field: "available_slots",
  },
  {
    key: "occupied_slots",
    label: "Occupied Slots",
    endpoint: "/api/reports/summary",
    field: "occupied_slots",
  },
  {
    key: "daily_revenue",
    label: "Today's Revenue",
    endpoint: "/api/reports/summary",
    field: "daily_revenue",
  },
];

export function getResourceDefinition(key) {
  return resourceDefinitions[key];
}

export function formatOptionLabel(row, fields = []) {
  if (!row) {
    return "";
  }

  if (!fields.length) {
    return String(row[Object.keys(row)[0]] ?? "");
  }

  return fields
    .map((fieldName) => row[fieldName])
    .filter((value) => value !== null && value !== undefined && value !== "")
    .join(" • ");
}


