# SUBSCRIBO — Enterprise Subscription Management Platform

[![Odoo](https://img.shields.io/badge/Odoo-19.0_Community-714B67?logo=odoo&logoColor=white)](https://www.odoo.com/)
[![React](https://img.shields.io/badge/React-19.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Tests](https://img.shields.io/badge/Tests-70%2F70_Passing-emerald)](docs/requirement_traceability.md)
[![Live Demo](https://img.shields.io/badge/Live_Demo-trysubscribo.vercel.app-000000?logo=vercel&logoColor=white)](https://trysubscribo.vercel.app)

**SUBSCRIBO** is an enterprise-grade subscription management and recurring billing platform. It unites an **Odoo 19 Community** enterprise backend engine with a high-performance, independent **React 19 + TypeScript** SaaS web application.

---

## 📁 Repository Architecture

This repository is structured as a full-stack monorepo separating the Odoo custom backend module from the React SaaS frontend client:

```text
.
├── backend/
│   └── subscribo/                   # Odoo 19 Community Custom Addon
│       ├── controllers/             # Portal routes, web signup, and JSON-RPC APIs
│       ├── data/                    # Sequence numbers and scheduled actions (ir.cron)
│       ├── models/                  # Subscription, plans, quotations, invoices, audit events
│       ├── reports/                 # Printable reports and PDF templates
│       ├── security/                # Access Control Lists (ACLs) and record rules
│       ├── tests/                   # 70 unit and HttpCase integration tests
│       ├── views/                   # Backend XML views, actions, and portal templates
│       ├── wizards/                 # Quotation creation and renewal wizards
│       ├── __init__.py
│       ├── __manifest__.py          # Odoo module metadata
│       └── README.md                # Backend architecture guide
│
├── frontend/                        # Independent Modern SaaS Web Client
│   ├── public/                      # Static branding assets and vectors
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/              # App shell layout (Navbar, Sidebar)
│   │   │   └── ui/                  # Reusable UI primitives (Badge, Modal, StatCard, EmptyState)
│   │   ├── hooks/                   # Custom hooks (useAuth, useSubscriptions, useInvoices)
│   │   ├── services/                # odooApi.ts (Type-safe authenticated JSON-RPC client)
│   │   ├── types/                   # Partitioned TypeScript domain models
│   │   ├── utils/                   # Shared formatters and application constants
│   │   ├── views/
│   │   │   ├── admin/               # Admin dashboards, billing consoles, catalog, staff
│   │   │   ├── auth/                # Sign-in and session onboarding
│   │   │   ├── customer/            # Customer self-service portal, add-ons, invoices, profile
│   │   │   └── staff/               # Staff operational workbench and review consoles
│   │   ├── App.tsx                  # Persona routing & root state orchestration
│   │   ├── index.css                # Global styles and Tailwind directives
│   │   └── main.tsx                 # DOM entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── README.md                    # Frontend architecture guide
│
├── docs/                            # Specifications & Compliance Documentation
│   ├── requirement_traceability.md  # Verification matrix & test results
│   └── phase3_architecture_audit_and_design.md
│
├── .gitignore                       # Clean multi-environment gitignore
└── README.md                        # Master repository documentation
```

---

## 🚀 Key Features & Implemented Capabilities

### 1. Subscription Lifecycle & Quotations
* **Standard Odoo Sales Integration**: Uses standard `sale.order` and `sale.order.line` without modifying core Odoo modules.
* **Service Line Representation**: Configured plan prices appear as explicit service-product quotation lines (`quantity = subscription quantity`, `price = plan price`).
* **5-State Lifecycle Machine**: Preserves clean linear progression: `Draft` → `Quotation` → `Confirmed` → `Active` → `Closed`.
* **Pause & Resume**: Operational states executed while Active without polluting core lifecycle states.
* **Successor Renewal Wizard**: One-click renewal wizard linking predecessor and successor subscriptions with carried-forward add-ons and duplicate prevention.

### 2. Add-on Upgrades & Catalog Management
* **Priced Change Quotations**: Customer self-service add-on requests automatically generate change quotations requiring formal approval/signature before activation.
* **Audit Trail**: Every change, pause, resume, and cancellation writes an immutable `subscribo.subscription.event` log.

### 3. Recurring Invoicing & Billing Automation
* **4 Billing Frequencies**: Complete calendar math for `Daily`, `Weekly`, `Monthly`, and `Yearly` cycles with month-end boundary rollover (e.g. Jan 31 → Feb 28 → Mar 31).
* **Community Accounting Integration**: Uses standard `account.move` (`out_invoice`) with proper taxes, payment terms, and currency conversions.
* **Idempotency & Duplicate Prevention**: Automatically prevents duplicate invoices for the same subscription period.
* **Automated Cron Job**: Scheduled action (`ir_cron_subscribo_recurring_invoicing`) runs with per-subscription PostgreSQL savepoints for complete fault isolation.

### 4. Authentication, Security & RBAC
* **Three Strict User Personas**:
  * **Administrator** (`group_subscribo_admin`): Full administrative control over catalog, staff, subscriptions, and billing.
  * **Staff Operator** (`group_subscribo_staff`): Restricted strictly to SUBSCRIBO-managed customer records; cannot alter plans or escalate roles.
  * **Customer Portal** (`group_subscribo_customer`): Self-service access restricted strictly to owned subscriptions, quotes, and invoices via server-side record rules.
* **Security Hardening**: Database-enforced canonical unique email constraint (case-insensitive Unicode), password complexity validation, and token expiration.

---

## 🧪 Test Suite & Verification

The backend includes a comprehensive automated test suite executed against an isolated database:

```bash
# Run full SUBSCRIBO test suite on isolated port
python odoo-bin -d subscribo_test --addons-path="odoo/addons,backend" -u subscribo --test-enable --stop-after-init --http-port=8098 --test-tags=/subscribo
```

**Result**: **70/70 Tests Passed (86 Subtests, 0 Failures, 0 Errors)**
* **Phase 1 (Authentication & Security)**: 22/22 Passing
* **Phase 2 (Quotation Templates & Portal Ownership)**: 40/40 Passing
* **Phase 3 (Recurring Billing Engine & Idempotency)**: 8/8 Passing

---

## 🛠️ Quick Start Guide

### Prerequisites
* Python 3.11+ with Odoo 19 Community dependencies
* PostgreSQL 15+
* Node.js 20+ & npm

### Backend Setup (Odoo 19)
```bash
# Navigate to Odoo server directory and launch with backend addon path
python odoo-bin -d subscribo_db \
  --addons-path="/path/to/odoo/addons,/path/to/Subscribo/backend" \
  -i subscribo \
  --http-port=8069
```

### Frontend Setup (React SaaS)
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The React SaaS interface will be available at `http://localhost:5173`.

---

## 🔒 License & Intellectual Property

Proprietary software developed for enterprise subscription management. All rights reserved.

