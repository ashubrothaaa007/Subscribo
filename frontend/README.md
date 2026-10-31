# SUBSCRIBO — Enterprise Subscription Management SaaS Frontend

Independent, modern React client application for SUBSCRIBO Subscription Management System, built with TypeScript, Vite, Tailwind CSS, and Lucide icons. Communicates directly with the Odoo backend via authenticated JSON-RPC.

---

## Architecture & Directory Structure

Organized following senior-level modular front-end architecture standards:

```text
src/
├── assets/                  # Static media and branding vectors
├── components/
│   ├── layout/              # Core application layout wrappers (Navbar, Sidebar)
│   └── ui/                  # Reusable primitive UI components (Badge, Modal, StatCard, EmptyState)
├── hooks/                   # Custom React hooks (useAuth, useSubscriptions, useInvoices)
├── services/
│   └── odooApi.ts           # Type-safe Odoo JSON-RPC API client & mock failover
├── types/                   # Domain TypeScript declarations partitioned by boundary
│   ├── auth.ts              # Authentication & user profile types
│   ├── billing.ts           # Invoicing, billing schedules, and accounting types
│   ├── sales.ts             # Quotations, catalog, and customer definitions
│   ├── subscription.ts      # Subscription state machines, plans, and add-on types
│   └── index.ts             # Unified barrel export
├── utils/                   # Shared utility helpers and application constants
│   ├── constants.ts         # Demo credentials, brand constants, and navigation models
│   ├── formatters.ts        # Currency, date, and state formatting utilities
│   └── index.ts             # Barrel export
├── views/                   # Feature views organized strictly by persona
│   ├── admin/               # Administrator management consoles & billing analytics
│   ├── auth/                # Sign-in and session onboarding view
│   ├── customer/            # Customer self-service portal & add-on management
│   └── staff/               # Staff operational workbench & quotations review
├── App.tsx                  # Root state orchestration & persona route dispatcher
├── index.css                # Global styles and Tailwind directives
└── main.tsx                 # React DOM mount point
```

---

## Role-Based Access Control (RBAC)

The UI dynamically configures navigation and operational actions based on user roles:

| Persona | Role Key | Permissions & Scope |
|---|---|---|
| **Administrator** | `admin` | Full control over subscriptions, plans, add-ons, quotations, customers, staff, and recurring billing |
| **Staff Operator** | `staff` | Scoped operational access to customer subscriptions, quotation reviews, and pause/resume lifecycle controls |
| **Customer** | `customer` | Self-service access restricted strictly to owned subscriptions, add-on requests, quotations, and invoice downloads |

---

## Integration with Odoo Backend

The frontend communicates with Odoo Community 19 using authenticated JSON-RPC:
- **Authentication**: `POST /web/session/authenticate`
- **Data Querying**: `POST /web/dataset/call_kw` (`search_read`, `read`, `write`, `create`)
- **Invoice Generation**: Remote execution of `subscribo.subscription.action_generate_invoice()`
- **PDF Invoice Export**: Direct stream download via `/report/pdf/account.report_invoice/<id>`

---

## Development & Build Commands

```bash
# Install dependencies
npm install

# Start local development server (http://localhost:5173)
npm run dev

# Run TypeScript compilation & production build
npm run build

# Code hygiene & linter validation
npm run lint

# Preview production build locally
npm run preview
```
