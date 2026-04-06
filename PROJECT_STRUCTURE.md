# VPMS Project Structure

## Overview
The VPMS (Vehicle Parking Management System) is a Next.js web application for managing vehicle entries, exits, parking violations, payments, and parking zone availability.

## Directory Structure

### `/app` - Next.js App Directory
Main application pages and API routes following Next.js 13+ app router pattern.

**Key Pages:**
- `layout.js` - Root layout wrapper for all pages
- `page.js` - Home/dashboard page
- `entry/page.js` - Vehicle entry management page
- `exit/page.js` - Vehicle exit management page
- `vehicles/page.js` - Vehicle records page
- `owners/page.js` - Owner information page
- `passes/page.js` - Parking pass management page
- `payments/page.js` - Payment tracking page
- `violations/page.js` - Violation records page
- `zones-slots/page.js` - Parking zones and slots management
- `reports/page.js` - Reports and analytics page

**API Routes:**
- `api/movements/entry/route.js` - POST/GET vehicle entry records
- `api/movements/exit/route.js` - POST/GET vehicle exit records
- `api/reports/[name]/route.js` - Dynamic reports endpoint
- `api/reports/summary/route.js` - Summary reports endpoint
- `api/resources/[resource]/route.js` - Dynamic resource endpoints

### `/components` - React Components
Reusable UI components.

**Important Components:**
- `AppShell.js` - Main application shell/navigation wrapper
- `DashboardHome.js` - Dashboard home content
- `DataTable.js` - Reusable table component for displaying data
- `FormField.js` - Form input component
- `Modal.js` - Modal dialog component
- `PageHeader.js` - Page header component
- `StatCard.js` - Statistics card component
- `MovementPage.js` - Shared vehicle movement page logic
- `ResourcePage.js` - Shared resource page logic
- `ReportsPage.js` - Reports page component

### `/lib` - Core Libraries
Database and data utilities.

- `db.js` - Database connection and configuration
- `vpms-data.js` - Database query functions and data operations

### `/sql` - Database Scripts
- `schema.sql` - Database table definitions and structure
- `seed.sql` - Sample data for testing
- `plsql.sql` - PL/SQL stored procedures
- `sync_identities.sql` - Identity synchronization script

### `/utils` - Utility Functions
- `format.js` - Data formatting functions (dates, numbers, etc.)
- `data-refresh.js` - Data refresh and synchronization utilities

### Config Files
- `package.json` - Project dependencies and npm scripts
- `next.config.mjs` - Next.js configuration
- `jsconfig.json` - JavaScript compiler options
- `eslint.config.mjs` - ESLint configuration
- `postcss.config.mjs` - PostCSS configuration
- `.env.local` - Environment variables (local)

### Other Important Files
- `README.md` - Project documentation
- `AGENTS.md` - Copilot agent configuration
- `CLAUDE.md` - Claude model instructions
- `/public` - Static assets and files

## Key Features
1. **Vehicle Management** - Entry/exit tracking, vehicle records
2. **Parking Operations** - Zone and slot management
3. **Financial** - Payment tracking and pass management
4. **Compliance** - Violation records and reporting
5. **Analytics** - Reporting and summary statistics
