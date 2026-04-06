# VPMS - Vehicle Parking Management System

College-level mini project built with:

- Next.js App Router
- JavaScript only
- Tailwind CSS
- Oracle Database
- PL/SQL package, procedures, functions, triggers, and views
- `node-oracledb`

## Features

- Dashboard with live parking summary
- Owners, vehicles, zones, slots, staff, passes, violations, and payments pages
- Entry and exit workflows with slot reservation and fee calculation
- Oracle-backed reports for parking operations
- Clean responsive sidebar dashboard UI

## Folder Structure

- `app/` - Next.js routes, API routes, and page screens
- `components/` - Reusable UI building blocks
- `lib/` - Oracle connection and shared VPMS metadata
- `sql/` - Oracle schema, PL/SQL, and seed scripts
- `utils/` - Small display/formatting helpers

## Setup

1. Copy `.env.local.example` to `.env.local` and fill in Oracle credentials.
2. Install dependencies:

```bash
npm install
```

3. Run the Oracle scripts in this order:

```sql
@sql/schema.sql
@sql/plsql.sql
@sql/seed.sql
```

If you already have the data loaded and only need to fix identity counters after manual inserts or reruns, run:

```sql
@sql/sync_identities.sql
```

4. Start the app:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Oracle Notes

- The project uses connection pooling through `node-oracledb`.
- Keep the Oracle service and Instant Client available on the machine.
- The app expects the schema objects created by the SQL scripts before opening the dashboard.
- After loading the seed data, the identity counters are synced so new inserts do not collide with seeded primary keys.

## Demo Flow

1. Open the dashboard.
2. Add or review owners and vehicles.
3. Record a vehicle entry and exit.
4. Check payments, passes, violations, and reports.
