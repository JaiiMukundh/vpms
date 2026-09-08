# VPMS - Vehicle Parking Management System

College-level mini project built with:

- Next.js App Router
- JavaScript only
- Tailwind CSS
- Neon PostgreSQL
- PostgreSQL tables and reporting views
- `@neondatabase/serverless`

## Features

- Dashboard with live parking summary
- Owners, vehicles, zones, slots, staff, passes, violations, and payments pages
- Entry and exit workflows with slot reservation and fee calculation
- Neon-backed reports for parking operations
- Clean responsive sidebar dashboard UI

## Folder Structure

- `app/` - Next.js routes, API routes, and page screens
- `components/` - Reusable UI building blocks
- `lib/` - Neon connection and shared VPMS metadata
- `sql/` - PostgreSQL schema and reporting views
- `utils/` - Small display/formatting helpers

## Setup

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to the connection string from Neon.
2. Install dependencies:

```bash
npm install
```

3. Run the PostgreSQL schema in the Neon SQL Editor:

```sql
-- paste the contents of sql/postgres-schema.sql
```

4. Start the app:

```bash
npm run dev
```

5. Build for production:

```bash
npm run build
```

## Neon Notes

- The project connects using `DATABASE_URL` and the Neon serverless driver.
- The app expects the objects in `sql/postgres-schema.sql` to exist before opening the dashboard.
- Existing Oracle data is not migrated; the Neon database starts empty.
- In Vercel, add `DATABASE_URL` to the Production, Preview, and Development environments, then redeploy.

## Demo Flow

1. Open the dashboard.
2. Add or review owners and vehicles.
3. Record a vehicle entry and exit.
4. Check payments, passes, violations, and reports.
