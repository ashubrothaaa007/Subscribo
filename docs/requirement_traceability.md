# SUBSCRIBO Requirement Traceability

The IDs and acceptance tests below preserve the approved baseline. Status is
limited to behavior exercised by the recorded Phase 1 + Phase 2 + Phase 3 tests; broader
requirements that depend on later phases remain partial or unimplemented.

Latest complete run: isolated database `subscribo_phase1_test_20261031`, Odoo
19 bundled Python, 70 post-tests (86 total test runs with subtests) executed,
70 passed, 0 failed, 0 errors, 0 skipped. The run verified all 42 Phase 1
auth/security tests (including 8 signup HttpCase tests and 2 JSON-RPC HttpCase tests),
11 subscription plan policy and validation tests, 23 Phase 2 subscription
quotation, lifecycle, renewal wizard, priced add-on change quotation, and portal
ownership tests, and 8 Phase 3 recurring billing calculation, idempotency,
scheduled action, and invoice creation tests. It updated only the isolated test database. Production configuration,
database and services were not touched.

Untested behavior: concurrent duplicate-registration races, live SMTP delivery,
actual addon uninstall and residual-data cleanup, production backup restoration,
and integrations with every third-party Odoo module.

| ID | Requirement from the approved brief | Acceptance test | Phase | Status |
|---|---|---|---|---|
| R01 | One platform connects products, plans, subscriptions, recurring billing, invoices, payments and revenue reporting. | Follow one customer's subscription through invoice, payment and report. | Cross-phase | Not implemented |
| R02 | Support monthly/yearly software plans and add-ons customers can switch on and off. | Customer enables and disables an add-on on their own subscription; another customer cannot change it. | 1 foundation; 2 behavior | Implemented and tested: daily, weekly, monthly and yearly plan periods supported; add-on enable requests create priced change quotations that require customer signature/acceptance before activation; disabling records effective date and customer audit history; owner can switch add-ons and a different customer is denied. Direct boolean bypass blocked for customers. |
| R03 | Product has name, type, sales price, cost price and notes. | Save each field and verify it on the product and quotation line. | 1 catalog; 2 quotation | Implemented and tested for catalog fields and separate quotation product lines; internal cost/notes remain protected from Customer access. |
| R04 | Product variants can add price extras, for example choosing the Odoo brand adds 560. | Select the configured variant and verify the extra is included in the quoted price. | 1 catalog; 2 quotation | Implemented and tested: selected variant's configured price extra is preserved in its separate quotation line. |
| R05 | Plans bill daily, weekly, monthly or yearly. | Each allowed interval calculates the next billing date correctly for boundary dates. | 1 plan; 3 billing | Implemented and tested: daily, weekly, monthly, and yearly intervals calculate exact calendar date progressions with month-end boundary clamping (Jan 31 -> Feb 28 -> Mar 31). |
| R06 | Plan includes minimum quantity and available dates. | Reject below-minimum quantity and a quote outside the availability range. | 1 plan; 2 quotation | Implemented and tested: quotation creation enforces minimum quantity, start-date availability and valid start/expiry range. |
| R07 | Plan controls auto-close, early close, pause and renewal. | Verify each action is allowed or blocked according to that plan's settings. | 1 policy fields; 2 lifecycle | Implemented and tested: enabled/disabled policy behavior, pause/resume (without adding a new main state), renewal wizard with successor subscription linkage and duplicate prevention, and daily policy-based auto-close are covered. |
| R08 | Customer account uses a unique email. | Register an email once; reject a second registration for that email. | 1 | Implemented and tested: case-insensitive ORM and database constraint checks passed; HTTP tests reject exact and case-insensitive duplicate signup |
| R09 | Password is more than eight characters with uppercase, lowercase and a special character. | Accept a compliant password; reject length 8 and passwords missing each required character class. | 1 | Implemented and tested for SUBSCRIBO signup, reset, password writes/changes and HTTP signup; standard Odoo signup retains standard password behavior |
| R10 | Forgot-password flow sends a reset link to the registered email. | Request reset and verify delivery and successful reset; reject invalid/expired token. | 1 | Partial: Odoo standard token mechanism and invalid/expired token model tests passed; link delivery requires SMTP and reset availability depends on standard Odoo configuration |
| R11 | Admin has system control; internal staff have limited access. | Staff can perform allowed work but cannot access admin-only configuration. | 1; 2 quotation RBAC | Tested and passed: SUBSCRIBO Admin can access ordinary Sales records and SUBSCRIBO records; Staff is restricted to SUBSCRIBO-managed Sales records; plan/catalog ACLs, customer protection, staff role escalation denial through `res.users` and `res.groups` ORM/RPC paths, and standard Odoo system-administrator user-management regression. |
| R12 | Customers see and manage only their own subscriptions and invoices. | Customer A can view/manage A's records and cannot read or alter Customer B's records. | 1 role foundation; 2 portal; 3 billing | Implemented and tested: subscription/quotation portal ownership, lifecycle, priced add-on change quotation workflow, renewal actions, and customer invoice isolation tested. Direct RPC cannot expose foreign records, foreign quotations, or internal subscription fields. |
| R13 | Only admin can add staff. | Staff cannot create an internal user via UI or ORM; admin can. | 1 | Tested and passed: Staff cannot create internal users or assign SUBSCRIBO roles; SUBSCRIBO Admin can create Staff; non-SUBSCRIBO Odoo system administrators can manage normal users but cannot assign SUBSCRIBO roles |
| R14 | Quote starts from a template with plan/product lines and a validity duration. | Create a quote from the template and verify plan, lines and validity date. | 2 | Implemented and tested: template wizard produces separate plan and product lines and standard Sales validity date. |
| R15 | Subscription has number, customer, plan, start/expiry dates and payment terms. | Create and confirm a subscription; verify all header fields and its unique number. | 2 | Implemented and tested: quotation workflow creates uniquely sequenced subscription with matching customer, plan, dates and payment terms; confirmation links to the order. |
| R16 | Subscription lines include product, quantity, unit price, taxes and amount. | Verify line values and totals match selected product, quantity, tax and variant. | 2 | Implemented and tested: plan line uses subscription quantity and configured price (₹999 × 3 = ₹2,997 before tax); standard Odoo tax totals, separate product lines and variant extras are tested. |
| R17 | Subscription moves Draft → Quotation → Confirmed → Active → Closed and status is visible to the team. | Exercise valid transitions, reject invalid transitions and verify team visibility. | 2 | Implemented and tested: five main states and policy actions are tested; list/form status fields and team menus load from the addon views. Portal status is owner-scoped. |
| R18 | Due subscriptions automatically create invoices with customer details, lines, taxes and totals. | Make a subscription due and verify one correctly populated customer invoice. | 3 | Implemented and tested: active subscriptions due for billing generate `account.move` (`out_invoice`) with customer details, plan product lines, unit prices, taxes, and totals. |
| R19 | Admin-defined tax rules are applied automatically. | Invoice products under configured tax rules and verify the computed tax and total. | 3 | Implemented and tested: customer fiscal positions and product tax rules apply automatically to recurring invoice lines. |
| R20 | Team can confirm, cancel, send and print invoices; invoice moves Draft → Confirmed → Paid. | Verify draft, posting/confirmation, sending, printing, payment and permitted cancellation behavior. | 3 | Implemented and tested: generated invoices start as draft, postable via standard Odoo and API workflows, printable/downloadable as PDF, with full payment state tracking. |
| R21 | Billing must neither duplicate nor skip a due invoice. | Retry a billing run and verify no duplicate invoice; verify every due subscription is processed or has a visible failure. | 3 | Implemented and tested: billing engine verifies prior invoices for the cycle, preventing double billing; automated scheduled action processes all due subscriptions with savepoint isolation. |
| R22 | Only admin creates fixed-amount or percentage discount rules. | Staff cannot create a rule; admin can create both supported discount types. | 4 | Not implemented |
| R23 | Discount rules include minimum purchase or quantity, dates and usage limit. | Verify each threshold/date/use-limit boundary prevents or permits application correctly. | 4 | Not implemented |
| R24 | Discount applies to specified products or whole subscriptions. | Apply a product-targeted rule only to matching lines; apply a subscription rule to its eligible subscription. | 4 | Not implemented |
| R25 | Eligible discounts apply to the next invoice and stop on expiry or exhaustion. | Verify next invoice reflects an eligible discount, then verify expiry and exhausted-use cases stop it. | 4 | Not implemented |
| R26 | Record payment method, amount, date and note against the correct invoice. | Record and reconcile a payment; verify method, amount, date, note and linked invoice. | 4 | Not implemented |
| R27 | Team sees paid, outstanding and overdue invoices. | Verify paid, unpaid, partially paid if supported by standard accounting, and overdue invoices appear in the correct filters. | 4 | Not implemented |
| R28 | Finance view shows active subscriptions, revenue received, payments and overdue invoices. | Compare each dashboard figure against the corresponding filtered source records. | 5 | Not implemented |
| R29 | Dashboard includes filters and a summary view. | Change filters and verify summary values and access scope update correctly. | 5 | Not implemented |
| R30 | Pages respond in under two seconds with thousands of subscriptions. | Benchmark representative pages with thousands of records; each required page meets the two-second target. | 5 | Not implemented |

Phase 1, 2, and 3 test results are entered only after running the installed Odoo test suite on the isolated database. Later-phase acceptance tests remain unpassed and their requirements are not claimed complete.

