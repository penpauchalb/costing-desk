# COSTING DESK — Universal HPP & Product Costing Management System

[![Vitest Passing](https://img.shields.io/badge/tests-6%20passed-emerald)](https://vitest.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-cyan)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-sky)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)
[![Cloudflare Pages](https://img.shields.io/badge/Hosted%20on-Cloudflare%20Pages-orange)](https://pages.cloudflare.com)

**COSTING DESK** is a production-ready, universal web application for product costing, production budgeting, and HPP (*Harga Pokok Produksi*) management. Built for manufacturers, businesses, entrepreneurs, and production teams across any industry (food & beverage, apparel, cosmetics, assembly, crafts, etc.).

Inspired by the clean, minimal, distraction-free productivity design of **Hubstaff** and **Microsoft To Do**.

---

## 🌟 Key Capabilities

1. **Universal Product & Group Hierarchy**:
   - Create unlimited custom product groups (e.g. *Product Line A*, *Private Label*, *Seasonal Apparel*).
   - Fully supports **Ungrouped Products** with 100% independent costing workspaces.
   - Move products dynamically between groups without altering calculations or historical batch records.
   - Group Consolidated Overview with **Weighted Average HPP** (`Total Production Cost / Total Finished Output Units`).

2. **Master Materials Database & Unit Conversion**:
   - Central catalog for raw materials, ingredients, packaging, and hardware.
   - Automatic unit conversion factors (`kg <-> g`, `liter <-> ml`, `meter <-> cm`, custom ratios).
   - Enter purchase prices once; auto-populates consumption costs across all product BOMs.
   - Manual override support per BOM item without unlinking.

3. **Flexible Bill of Materials (BOM)**:
   - Unlimited cost components categorized into Raw Materials, Ingredients, Packaging, Accessories, Consumables, and Services.
   - Cost status indicator: `Confirmed` vs `Pending / Estimated` with missing-cost warnings.

4. **Production Quantity, Yield & Wastage Engine**:
   - Accurately accounts for planned quantity, target yield %, wastage %, defective units, and rework.
   - Calculates HPP strictly based on **actual finished output units**.

5. **Labor & Multi-Stage Production Processes**:
   - Define custom stages (Preparation, Mixing, Assembly, Heat-sealing, Quality Control).
   - Calculation methods: `Per Unit`, `Per Batch`, `Per Hour`, `Per Worker`, or `Fixed Cost`.

6. **Overhead & Operational Expenses**:
   - Track utilities, electricity, water, rent allocation, and machine depreciation.
   - Clear distinction between Direct and Indirect costs.
   - Toggle to include or exclude specific operational expenses from the unit HPP.

7. **Production Batches & Immutable Historical Snapshots**:
   - Finalizing a production run permanently locks the material prices used at that exact moment.
   - Future price changes in Master Materials **never alter historical finalized batches** (Preservation Test F).

8. **Scenario Calculator (What-If Simulation)**:
   - Sandbox simulator to test batch sizes (100, 250, 500, 1,000, 2,500+ units).
   - Vary ingredient discounts, wage adjustments, and wastage percentages side-by-side with original records.

9. **Professional Reporting & Exports**:
   - **Excel (.xlsx)**: Multi-sheet workbook (Consolidated Summary, Product Details, BOM, Labor, Overhead, Master Materials, Scenarios).
   - **PDF (.pdf)**: High-resolution print-ready documents with company headers, itemized cost tables, and KPI metrics.
   - Choice of currencies: `IDR (Rp)`, `USD ($)`, `EUR (€)`, `SGD (S$)`, `MYR (RM)`, `GBP (£)`.

10. **Dual-Mode Persistence & Cloud Sync**:
    - **Zero-Config Local-First Engine**: Fully operational offline immediately with LocalStorage persistence.
    - **Supabase Cloud PostgreSQL & Auth**: Connect your Supabase project in the Settings menu for multi-device synchronization and user accounts.
    - **JSON Backup & Restore**: One-click complete database export and import.

---

## 🏗️ Technology Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS (Minimalist neutral palette, subtle borders `#E2E8F0`)
- **Icons**: Lucide React
- **Calculations & Math**: Custom pure TypeScript costing engine
- **Testing**: Vitest unit test suite (6/6 passing)
- **Exports**: `xlsx` (SheetJS) + `jspdf` & `jspdf-autotable`
- **Database & Auth**: `@supabase/supabase-js` (PostgreSQL with Row Level Security)
- **Hosting Target**: Cloudflare Pages (SPA routing via `public/_redirects`)

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Node.js 18+ (tested on Node v24.19)
- npm or pnpm

### 2. Install & Run
```bash
# Clone or navigate to directory
cd costing-desk

# Install dependencies
npm install

# Run unit tests
npm test

# Start local development server
npm run dev
```

### 3. Production Build
```bash
npm run build
npm run preview
```

---

## 🧪 Validation & Automated Test Results

The application includes automated Vitest unit tests verifying all calculation scenarios:

| Test ID | Scenario Description | Tested Parameters | Expected Result | Status |
|---|---|---|---|---|
| **Test A** | Weight-based product | Sugar @ Rp29,000/kg, 250g net, 500 units | Req: 125 kg, Cost: Rp3,625,000, HPP/unit: Rp7,250 | ✅ PASS |
| **Test B** | Package size variance | Sugar @ Rp29,000/kg, 500g net, 500 units | Req: 250 kg, Cost: Rp7,250,000, HPP/unit: Rp14,500 | ✅ PASS |
| **Test C** | Meter-based product | Fabric @ Rp15,000/m, 2m consumption, 100 units | Req: 200m, Cost: Rp3,000,000, HPP/unit: Rp30,000 | ✅ PASS |
| **Test D** | Group Weighted Avg | Product 1 (500 @ 7,250) + Product 2 (500 @ 14,500) | Total: Rp10,875,000, Weighted Avg HPP: Rp10,875 | ✅ PASS |
| **Test E** | Ungrouped Isolation | Standalone product (`groupId: null`) | Independent costing workspace with 0 group dependencies | ✅ PASS |
| **Test F** | Historical Price Snapshot | Batch locked @ Rp29,000/kg; Master updated to Rp31,000/kg | Finalized batch retains original Rp29,000 snapshot | ✅ PASS |

To execute the test suite:
```bash
npm test
```

---

## 🗄️ Database Setup & Supabase Migration

To enable cloud persistence and multi-device access with Supabase:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase Dashboard, open the **SQL Editor**.
3. Copy and run the entire SQL migration script located at:
   ```
   supabase/migrations/20261105_init_costing_desk.sql
   ```
   This script creates all tables (`product_groups`, `products`, `product_variants`, `master_materials`, `bom_components`, `production_processes`, `overhead_items`, `production_batches`, `scenarios`) and configures **Row Level Security (RLS)** so each authenticated user can only access their own data.
4. Go to **Project Settings -> API** in Supabase to obtain your **Project URL** and **anon public key**.
5. Connect it in COSTING DESK:
   - Either add them to your `.env` file:
     ```env
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-public-key
     ```
   - Or open the **Settings & Sync** view inside the running web app and paste them directly into the form.

---

## ☁️ Deployment Guide

### Option 1: GitHub Repository + Cloudflare Pages (Recommended Free Setup)

1. **Log in to GitHub CLI** (if using CLI):
   ```bash
   gh auth login
   ```
2. **Create and push to GitHub repository**:
   ```bash
   gh repo create costing-desk --public --source=. --push
   ```
   *Or create a repository named `costing-desk` on [github.com](https://github.com) manually and push:*
   ```bash
   git remote add origin https://github.com/<your-username>/costing-desk.git
   git push -u origin main
   ```
3. **Connect to Cloudflare Pages**:
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com) -> **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
   - Select the `costing-desk` repository.
   - Configure build settings:
     - **Framework preset**: `Vite`
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
     - **Root directory**: `/`
   - *(Optional)* Add Environment Variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
   - Click **Save and Deploy**.
   - Your application will be live at `https://costing-desk.pages.dev` with free SSL, CDN, and automatic deployment on every git push.

### Option 2: Direct CLI Deployment via Cloudflare Wrangler

```bash
# 1. Log in to your Cloudflare account
npx wrangler login

# 2. Build the production assets
npm run build

# 3. Deploy directly to Cloudflare Pages
npx wrangler pages deploy dist --project-name costing-desk
```

---

## 🔒 Security & Data Reliability

- **No Secret Leaks**: Only the public Supabase `anon` key is used on the client. Database service-role keys are never exposed.
- **Row-Level Security (RLS)**: Enforced at the PostgreSQL kernel level.
- **Data Sovereignty**: Export your entire dataset to a JSON backup at any time from the Settings menu.

---

## 📄 License

MIT License. Universal and open for commercial or personal production costing.
