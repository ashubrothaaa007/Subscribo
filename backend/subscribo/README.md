# SUBSCRIBO

This is the single installable SUBSCRIBO addon. It contains the completed
Phase 1 foundation and the approved Phase 2 quotation and subscription
management workflows. Invoicing, recurring billing, discounts, payments and
financial dashboards remain later-phase work in the requirement matrix.

## Phase 1 behavior

- `SUBSCRIBO Administrator` can configure the catalog and plans and manage
  staff users. The existing Odoo administrator is assigned this group when the
  addon is installed. This group includes Odoo's system-administrator and
  product-manager permissions.
- `SUBSCRIBO Staff` has internal-user access, can read products and plans, and
  cannot create or change user roles, product records, or plans.
- `SUBSCRIBO Customer` is assigned to self-registered customer accounts and
  implies the standard Odoo Portal role. The portal exposes only that
  customer's subscriptions, subscription quotations and approved lifecycle
  operations.
- Standard Odoo user creation and editing continue to use Odoo's existing ACLs.
  Only operations that add, remove or replace a SUBSCRIBO role are restricted
  to a SUBSCRIBO Administrator. Staff and Customers cannot create internal
  users or assign SUBSCRIBO roles through ORM/RPC calls. The same restriction
  covers alternate `res.groups.user_ids` and role-inheritance operations.
- Product variants and their price extras use Odoo's standard product
  attributes. The SUBSCRIBO Notes field is internal.
- Plans support daily, weekly, monthly, and yearly periods; a price/currency;
  minimum quantity; availability dates; and the four plan-policy flags.
- `subscribo.plan.validate_request()` rejects invalid, non-finite, non-positive
  and below-minimum quantities and invalid/out-of-range dates.
- Customer registration is exposed at `/subscribo/signup`. It enables public
  signup only in its request context and assigns the SUBSCRIBO Customer role.
  Standard `/web/signup` retains Odoo's signup flow and does not assign any
  SUBSCRIBO role. Neither route changes `auth_signup.invitation_scope`.
- The SUBSCRIBO password policy applies to SUBSCRIBO signup, reset and account
  password changes. Standard Odoo signup and non-SUBSCRIBO account password
  operations retain Odoo's standard password behavior. Standard Odoo password
  reset remains available only when `auth_signup.reset_password` is enabled;
  SUBSCRIBO does not change that setting. SMTP delivery depends on external
  configuration.
- Emails use Odoo `email_normalize` plus Unicode casefolding and a stored
  canonical key with a PostgreSQL unique constraint. That constraint protects
  concurrent account creation and updates in addition to ORM duplicate checks.
- Partner email updates normalize the value and validate linked accounts. A
  multi-record write affects only selected records; updates assigning one
  email to multiple account partners are rejected.

## Phase 2 behavior

- Quotation creation uses standard Odoo Sales orders, quotation templates,
  product variants, pricelists, order lines and taxes. The plan is a separate
  saleable service-product line. Its quantity equals the selected subscription
  quantity and its unit price is the configured plan price (currency-converted
  at the subscription start date when required). For example, ₹999 × 3 yields
  ₹2,997 before tax. Additional products and variants remain separate lines.
- The `subscribo.quote.wizard` creates a SUBSCRIBO quotation from a customer,
  plan, quantity, quotation template and subscription dates. The normal Sales
  quote validity date comes from the selected template. Customer acceptance
  requires a recorded Odoo signature and is restricted to the logged-in
  SUBSCRIBO Customer who owns the quotation.
- `subscribo.subscription` is created by the validated quotation workflow,
  has a sequenced unique number, and retains customer, plan, dates, payment
  terms, quotation totals, add-ons and immutable audit events. Its only main
  states are Draft → Quotation → Confirmed → Active → Closed.
- Pause and resume are operations while Active, not additional states. Early
  close, pause, renewal and automatic close follow each plan's policy flags.
  A daily scheduled action closes expired subscriptions only when the plan
  enables automatic close. Renewal creates a successor quotation, carries
  forward currently enabled add-ons, and is limited to one direct successor.
- Customers can switch quoted add-ons on or off, pause/resume, request eligible
  renewal quotations and close subscriptions from the portal. Every operation
  checks ownership server-side and writes an audit event. Add-on switches
  update subscription selection state; invoice proration and recurring billing
  are not part of Phase 2.
- SUBSCRIBO Staff can work with SUBSCRIBO quotations and subscriptions in
  allowed companies. Sales order and line record rules exclude unrelated
  Odoo sales records. Customers use portal views and do not receive internal
  plan, cost, notes or quotation-management privileges.

## Phase 3 behavior

- **Recurring Invoicing Engine**: Automatic generation of customer invoices (`account.move`, type `out_invoice`) directly from active subscriptions. Supports `daily`, `weekly`, `monthly`, and `yearly` billing frequencies with precise end-of-month rollover arithmetic.
- **Product, Tax, and Currency Integrity**: Accurately replicates configured plan service product quantities, unit prices, and active subscription add-ons. Applies customer fiscal position and sales taxes (e.g., GST 18%).
- **Idempotency & Duplicate Prevention**: Validates existing period coverage to ensure duplicate invoices cannot be generated for the same subscription cycle.
- **Billing Automation Cron**: Scheduled action (`ir_cron_subscribo_recurring_invoicing`) processes overdue subscription billings with per-record savepoints for fault isolation.
- **Security & Access Boundaries**: Admin has unrestricted billing permissions; Staff is restricted strictly to subscription-associated invoices (`subscribo_is_recurring = True`); Customers access only their own invoices and PDF downloads.

The addon itself does not change signup/reset settings. If `auth_signup` is not
already installed, installing this addon installs it as a dependency; that
standard module initializes its own defaults. Existing values are preserved
when `auth_signup` is already installed. Review effective values in multi-app
databases. The addon assigns SUBSCRIBO Admin to `base.user_admin` as the initial
app administrator.

The canonical email constraint is created during installation/upgrade. Before
production installation, run a read-only duplicate preflight using Odoo's
normalization policy. Existing duplicate account addresses require manual
business resolution before the constraint can be installed; the addon does
not merge or silently change accounts.

## Verification status

The latest complete Phase 1 + Phase 2 test results and exact acceptance-test
coverage are recorded in [`docs/requirement_traceability.md`](docs/requirement_traceability.md).
The test runner must use Odoo 19's bundled Python, target only the named
isolated test database and use a temporary HTTP port that is not occupied by
an existing Odoo service. No production database, configuration or service is
a test target.

Not tested: live SMTP delivery, production backup restoration, production
installation/uninstallation, high-volume performance with thousands of
subscriptions, or integrations with every third-party Odoo module. Add-on
selection does not yet drive invoices or recurring charges.

## Installation

The addon must be discoverable through an Odoo addons path. The existing
`odoo.conf` is not modified by this addon. Install **SUBSCRIBO Subscription
Management** only into the intended database after reviewing the `auth_signup`
settings and duplicate-email preflight. Back up and verify restoration of both
the database and matching filestore before a controlled installation; the
addon does not provide an automated backup or restore procedure.

For automated tests, use the installed Odoo Python interpreter, pass the Odoo
core and custom addon paths explicitly, and use a separate disposable database.
Test results are recorded in
[`docs/requirement_traceability.md`](docs/requirement_traceability.md) only
after an actual run. The production database `subscribo` is not a test target.
