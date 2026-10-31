from dateutil.relativedelta import relativedelta

from odoo import fields
from odoo.exceptions import AccessError, UserError
from odoo.tests.common import TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestSubscriptionBilling(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.company = cls.env.company
        cls.currency_inr = cls.env.ref('base.INR')
        cls.company.currency_id = cls.currency_inr

        cls.partner_customer_a = cls.env['res.partner'].create({
            'name': 'Customer Alpha Corp',
            'is_company': True,
            'email': 'alpha@example.com',
        })
        cls.partner_customer_b = cls.env['res.partner'].create({
            'name': 'Customer Beta LLC',
            'is_company': True,
            'email': 'beta@example.com',
        })

        cls.service_product = cls.env['product.product'].create({
            'name': 'Cloud Core Service (Phase 3)',
            'type': 'service',
            'sale_ok': True,
            'list_price': 1000.0,
        })
        cls.addon_product = cls.env['product.product'].create({
            'name': '24/7 SLA Support Addon',
            'type': 'service',
            'sale_ok': True,
            'list_price': 200.0,
        })

        # Tax
        cls.tax_18 = cls.env['account.tax'].search([
            ('type_tax_use', '=', 'sale'),
            ('amount', '=', 18.0),
            ('company_id', '=', cls.company.id),
        ], limit=1)
        if not cls.tax_18:
            cls.tax_18 = cls.env['account.tax'].create({
                'name': 'GST 18% (Test)',
                'amount_type': 'percent',
                'amount': 18.0,
                'type_tax_use': 'sale',
                'company_id': cls.company.id,
            })
        cls.service_product.taxes_id = [(6, 0, cls.tax_18.ids)]
        cls.addon_product.taxes_id = False

        # Payment Term
        cls.payment_term_15 = cls.env['account.payment.term'].search([
            ('company_id', 'in', (False, cls.company.id)),
        ], limit=1)

        # Users
        cls.user_admin = cls.env.ref('base.user_admin')
        cls.group_staff = cls.env.ref('subscribo.group_subscribo_staff')
        cls.group_customer = cls.env.ref('subscribo.group_subscribo_customer')

        cls.user_staff = cls.env['res.users'].create({
            'name': 'Billing Staff Operator',
            'login': 'billing.staff@example.com',
            'email': 'billing.staff@example.com',
            'group_ids': [(6, 0, [cls.group_staff.id, cls.env.ref('base.group_user').id])],
        })
        cls.user_customer_a = cls.env['res.users'].create({
            'name': 'Customer User Alpha',
            'login': 'user.alpha@example.com',
            'email': 'user.alpha@example.com',
            'partner_id': cls.partner_customer_a.id,
            'group_ids': [(6, 0, [cls.group_customer.id, cls.env.ref('base.group_portal').id])],
        })
        cls.user_customer_b = cls.env['res.users'].create({
            'name': 'Customer User Beta',
            'login': 'user.beta@example.com',
            'email': 'user.beta@example.com',
            'partner_id': cls.partner_customer_b.id,
            'group_ids': [(6, 0, [cls.group_customer.id, cls.env.ref('base.group_portal').id])],
        })

        # Plans for all 4 frequencies
        cls.plan_monthly = cls.env['subscribo.plan'].create({
            'name': 'Cloud Monthly Plan',
            'billing_period': 'monthly',
            'price': 1000.0,
            'currency_id': cls.currency_inr.id,
            'service_product_id': cls.service_product.id,
            'minimum_quantity': 1.0,
            'allow_pause': True,
            'allow_early_close': True,
        })
        cls.plan_daily = cls.env['subscribo.plan'].create({
            'name': 'Cloud Daily Plan',
            'billing_period': 'daily',
            'price': 50.0,
            'currency_id': cls.currency_inr.id,
            'service_product_id': cls.service_product.id,
            'minimum_quantity': 1.0,
            'allow_pause': True,
        })
        cls.plan_weekly = cls.env['subscribo.plan'].create({
            'name': 'Cloud Weekly Plan',
            'billing_period': 'weekly',
            'price': 300.0,
            'currency_id': cls.currency_inr.id,
            'service_product_id': cls.service_product.id,
            'minimum_quantity': 1.0,
            'allow_pause': True,
        })
        cls.plan_yearly = cls.env['subscribo.plan'].create({
            'name': 'Cloud Yearly Plan',
            'billing_period': 'yearly',
            'price': 10000.0,
            'currency_id': cls.currency_inr.id,
            'service_product_id': cls.service_product.id,
            'minimum_quantity': 1.0,
            'allow_pause': True,
        })

    def _create_subscription(self, plan, partner=None, start_date=None, expiry_date=None, qty=1.0, addons=None):
        partner = partner or self.partner_customer_a
        start_date = start_date or fields.Date.today()
        expiry_date = expiry_date or (start_date + relativedelta(years=1))

        order_lines = []
        if addons:
            for addon_prod, addon_price, addon_qty in addons:
                order_lines.append((0, 0, {
                    'product_id': addon_prod.id,
                    'product_uom_qty': addon_qty,
                    'price_unit': addon_price,
                }))

        order = self.env['sale.order'].create({
            'partner_id': partner.id,
            'subscribo_is_subscription': True,
            'subscribo_plan_id': plan.id,
            'subscribo_quantity': qty,
            'subscribo_start_date': start_date,
            'subscribo_expiry_date': expiry_date,
            'payment_term_id': self.payment_term_15.id if self.payment_term_15 else False,
            'order_line': order_lines,
        })
        order.action_quotation_sent()
        order.sudo().action_subscribo_mark_customer_accepted()
        order.sudo().action_confirm()
        sub = self.env['subscribo.subscription'].search([('sale_order_id', '=', order.id)], limit=1)
        sub.with_user(self.user_admin).action_activate()
        return sub

    # 1. Date calculation tests for all four frequencies
    def test_01_billing_date_calculations_all_frequencies(self):
        """Verify date calculation for daily, weekly, monthly, and yearly intervals."""
        d = fields.Date.to_date('2026-01-15')
        sub_model = self.env['subscribo.subscription']

        # Daily
        p_start, p_end, n_date = sub_model._calculate_billing_cycle(d, 'daily')
        self.assertEqual(p_start, d)
        self.assertEqual(p_end, d)
        self.assertEqual(n_date, fields.Date.to_date('2026-01-16'))

        # Weekly
        p_start, p_end, n_date = sub_model._calculate_billing_cycle(d, 'weekly')
        self.assertEqual(p_start, d)
        self.assertEqual(p_end, fields.Date.to_date('2026-01-21'))
        self.assertEqual(n_date, fields.Date.to_date('2026-01-22'))

        # Monthly
        p_start, p_end, n_date = sub_model._calculate_billing_cycle(d, 'monthly')
        self.assertEqual(p_start, d)
        self.assertEqual(p_end, fields.Date.to_date('2026-02-14'))
        self.assertEqual(n_date, fields.Date.to_date('2026-02-15'))

        # Yearly
        p_start, p_end, n_date = sub_model._calculate_billing_cycle(d, 'yearly')
        self.assertEqual(p_start, d)
        self.assertEqual(p_end, fields.Date.to_date('2027-01-14'))
        self.assertEqual(n_date, fields.Date.to_date('2027-01-15'))

    def test_02_month_end_boundary_calculation(self):
        """Verify month-end date clamping (Jan 31 -> Feb 28)."""
        d = fields.Date.to_date('2026-01-31')
        sub_model = self.env['subscribo.subscription']
        p_start, p_end, n_date = sub_model._calculate_billing_cycle(d, 'monthly')
        self.assertEqual(p_start, d)
        self.assertEqual(n_date, fields.Date.to_date('2026-02-28'))
        self.assertEqual(p_end, fields.Date.to_date('2026-02-27'))

    # 2. Invoice Generation Integrity: lines, prices, taxes, payment terms
    def test_03_invoice_generation_values_and_taxes(self):
        """Verify invoice lines, plan price, quantities, taxes, and payment terms."""
        today = fields.Date.today()
        sub = self._create_subscription(
            self.plan_monthly,
            qty=2.0,
            addons=[(self.addon_product, 200.0, 1.0)],
        )

        inv = sub.with_user(self.user_staff).action_generate_invoice()
        move = self.env['account.move'].browse(inv['res_id'])

        # Header checks
        self.assertEqual(move.move_type, 'out_invoice')
        self.assertEqual(move.partner_id, self.partner_customer_a)
        self.assertEqual(move.subscribo_subscription_id, sub)
        self.assertEqual(move.currency_id, self.currency_inr)
        self.assertEqual(move.subscribo_is_recurring, True)
        if self.payment_term_15:
            self.assertEqual(move.invoice_payment_term_id, self.payment_term_15)

        # Lines check
        self.assertEqual(len(move.invoice_line_ids), 2)
        plan_line = move.invoice_line_ids.filtered(lambda l: l.product_id == self.service_product)
        self.assertTrue(plan_line)
        self.assertEqual(plan_line.quantity, 2.0)
        self.assertEqual(plan_line.price_unit, 1000.0)
        self.assertEqual(plan_line.price_subtotal, 2000.0)
        self.assertIn(self.tax_18, plan_line.tax_ids)

        addon_line = move.invoice_line_ids.filtered(lambda l: l.product_id == self.addon_product)
        self.assertTrue(addon_line)
        self.assertEqual(addon_line.quantity, 1.0)
        self.assertEqual(addon_line.price_unit, 200.0)

        # Untaxed = 2000 + 200 = 2200; Tax = 18% of 2000 = 360; Total = 2560
        self.assertEqual(move.amount_untaxed, 2200.0)
        self.assertEqual(move.amount_tax, 360.0)
        self.assertEqual(move.amount_total, 2560.0)

        # Subscription record state
        self.assertEqual(sub.last_invoice_date, today)
        self.assertIn(move, sub.invoice_ids)
        self.assertEqual(sub.invoice_count, 1)

        # Event logged
        event = sub.event_ids.filtered(lambda e: e.event_type == 'invoice_generated')
        self.assertTrue(event)

    # 3. Duplicate Prevention & Idempotency
    def test_04_duplicate_invoice_prevention(self):
        """Retrying invoice generation for the same cycle never duplicates invoices."""
        sub = self._create_subscription(self.plan_monthly)
        inv1 = sub._generate_recurring_invoice()
        self.assertTrue(inv1)
        self.assertEqual(len(sub.invoice_ids), 1)

        # Immediate retry on same cycle
        inv2 = sub._generate_recurring_invoice()
        # Should return the existing invoice and NOT create a new account.move
        self.assertEqual(inv1.id, inv2.id)
        self.assertEqual(len(sub.invoice_ids), 1)

    # 4. Automated Cron Execution
    def test_05_cron_execution_and_repeated_run(self):
        """Verify _cron_recurring_invoicing processes due subscriptions and is idempotent."""
        today = fields.Date.today()
        sub = self._create_subscription(self.plan_monthly)

        # Ensure due
        sub.write({'next_invoice_date': today})

        # Cron Run 1
        count1 = self.env['subscribo.subscription']._cron_recurring_invoicing()
        self.assertGreaterEqual(count1, 1)
        self.assertEqual(len(sub.invoice_ids), 1)

        # Cron Run 2 (repeated on same day)
        count2 = self.env['subscribo.subscription']._cron_recurring_invoicing()
        # No extra invoices generated for this subscription
        self.assertEqual(len(sub.invoice_ids), 1)

    # 5. Lifecycle Rules: Paused, Expired, Closed Subscriptions
    def test_06_paused_subscription_never_billed(self):
        """Paused subscriptions are excluded from billing."""
        sub = self._create_subscription(self.plan_monthly)
        sub.action_pause(reason='Maintenance pause')
        self.assertTrue(sub.is_paused)

        inv = sub._generate_recurring_invoice()
        self.assertFalse(inv)
        self.assertEqual(len(sub.invoice_ids), 0)

        # Manual trigger raises UserError
        with self.assertRaises(UserError):
            sub.with_user(self.user_staff).action_generate_invoice()

    def test_07_expired_and_closed_subscription_never_billed(self):
        """Expired or closed subscriptions do not generate invoices."""
        sub = self._create_subscription(self.plan_monthly)
        sub.action_close(reason='Contract ended')
        self.assertEqual(sub.state, 'closed')

        inv = sub._generate_recurring_invoice()
        self.assertFalse(inv)
        self.assertEqual(len(sub.invoice_ids), 0)

        with self.assertRaises(UserError):
            sub.with_user(self.user_staff).action_generate_invoice()

    # 6. Customer Multi-Tenant Ownership & Security
    def test_08_customer_invoice_security_isolation(self):
        """Customer A can read their own invoice, but is denied reading Customer B's invoice."""
        sub_a = self._create_subscription(self.plan_monthly, partner=self.partner_customer_a)
        inv_a = sub_a._generate_recurring_invoice()

        sub_b = self._create_subscription(self.plan_monthly, partner=self.partner_customer_b)
        inv_b = sub_b._generate_recurring_invoice()

        # Customer A can read inv_a
        move_a = self.env['account.move'].with_user(self.user_customer_a).browse(inv_a.id)
        self.assertEqual(move_a.name, inv_a.name)

        # Customer A CANNOT read inv_b (record rule raises AccessError)
        with self.assertRaises(AccessError):
            move_b = self.env['account.move'].with_user(self.user_customer_a).browse(inv_b.id)
            _ = move_b.amount_total
