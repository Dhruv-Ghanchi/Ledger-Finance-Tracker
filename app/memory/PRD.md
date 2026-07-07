"# Personal & Business Finance Tracker — PRD

## Original Problem Statement
Single-user web app that replaces the Excel workbook — enter daily income and expenses once, and monthly/yearly summaries update automatically. Personal + Business finances, INR (₹) with Indian formatting (lakhs/crores), Indian FY (Apr–Mar), PIN lock, Excel/CSV export, charts (bar, pie, line).

## Architecture
- **Frontend**: React + Tailwind + Shadcn UI + Recharts
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (`entries`, `categories`, `auth`, `sessions`)
- **Auth**: 4-digit PIN (bcrypt) → session token stored in Mongo `sessions`

## User Personas
- **Solo operator (personal + business)** — needs one place to log income and expenses across two scopes, review monthly/yearly rollups, and export data to Excel for accounting or tax filing.

## Core Requirements (static)
- PIN setup on first launch; PIN lock afterwards
- Daily entries: date, amount INR, type (income/expense), scope (personal/business), category, note
- Preset categories (20 expense, 10 income) + custom category CRUD
- Auto-updating monthly summary (Personal vs Business split, category breakdown)
- Auto-updating yearly summary (Indian FY, 12-month table Apr→Mar)
- Charts: Monthly income vs expense bar, expense pie, yearly net trend line
- Export to Excel (.xlsx) or CSV with fy/year/month/scope filters
- Indian number formatting (lakhs/crores), ₹ symbol

## Implemented (Feb 2026)
- FastAPI backend with routes: `/api/auth/{status,setup,verify,logout}`, `/api/categories`, `/api/entries` (CRUD), `/api/summary/{monthly,yearly}`, `/api/export/{csv,xlsx}`
- Startup seeding: 30 preset categories + 5 sample entries (idempotent)
- React frontend: PIN lock, sticky header with FY/Month selectors + Export + Add Entry + Manage Categories, Overview KPIs, 3 Recharts charts, Tabs (Daily/Monthly/Yearly), Add/Edit dialog, Sheet-based Categories manager
- Swiss high-contrast light theme, Space Grotesk / IBM Plex Sans / JetBrains Mono, Personal Blue `#0F52BA`, Business Green `#059669`

## Backlog
- **P1**: Optional dark theme toggle, keyboard shortcuts, monthly budgets with alerts
- **P2**: Multi-user auth, recurring entries, receipt image upload, CSV import
"