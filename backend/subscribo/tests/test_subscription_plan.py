from odoo import Command
from odoo.exceptions import AccessError, ValidationError
from odoo.tests import TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestSubscriptionPlan(TransactionCase):

    def _values(self, **overrides):
        values = {
            'name': 'SUBSCRIBO Test Plan',
            'billing_period': 'monthly',
            'price': 100.0,
            'minimum_quantity': 1.0,
            'currency_id': self.env.company.currency_id.id,
        }
        values.update(overrides)
        return values

    def test_all_required_billing_periods_are_supported(self):
        for period in ('daily', 'weekly', 'monthly', 'yearly'):
            with self.subTest(period=period):
                plan = self.env['subscribo.plan'].create(self._values(
                    name='SUBSCRIBO %s Plan' % period.title(),
                    billing_period=period,
                ))
                self.assertEqual(plan.billing_period, period)

    def test_minimum_quantity_must_be_positive(self):
        for quantity in (0, -1):
            with self.subTest(quantity=quantity), self.assertRaises(ValidationError):
                self.env['subscribo.plan'].create(self._values(minimum_quantity=quantity))

    def test_availability_end_cannot_precede_start(self):
        with self.assertRaises(ValidationError):
            self.env['subscribo.plan'].create(self._values(
                available_from='2026-11-02',
                available_until='2026-11-01',
            ))

    def test_equal_availability_dates_are_valid(self):
        plan = self.env['subscribo.plan'].create(self._values(
            available_from='2026-11-01',
            available_until='2026-11-01',
        ))
        self.assertEqual(plan.available_from, plan.available_until)

    def test_request_validation_enforces_minimum_quantity_and_availability(self):
        plan = self.env['subscribo.plan'].create(self._values(
            minimum_quantity=3,
            available_from='2026-11-01',
            available_until='2026-11-30',
        ))

        self.assertTrue(plan.validate_request(3, '2026-11-01'))
        self.assertTrue(plan.validate_request(4, '2026-11-30'))
        with self.assertRaises(ValidationError):
            plan.validate_request(2, '2026-11-15')
        with self.assertRaises(ValidationError):
            plan.validate_request(3, '2026-10-31')
        with self.assertRaises(ValidationError):
            plan.validate_request(3, '2026-12-01')

    def test_request_validation_rejects_invalid_numeric_and_date_values(self):
        plan = self.env['subscribo.plan'].create(self._values(minimum_quantity=2))
        for quantity in ('not a number', None, True, 0, -1, float('nan'), float('inf'), -float('inf')):
            with self.subTest(quantity=quantity), self.assertRaises(ValidationError):
                plan.validate_request(quantity, '2026-11-15')
        with self.assertRaises(ValidationError):
            plan.validate_request(2, 'not-a-date')

    def test_archived_plan_cannot_be_requested(self):
        plan = self.env['subscribo.plan'].create(self._values(active=False))
        with self.assertRaises(ValidationError):
            plan.validate_request(1, '2026-11-15')

    def test_plan_policies_are_stored_per_plan(self):
        plan = self.env['subscribo.plan'].create(self._values(
            auto_close_at_end=True,
            allow_early_close=True,
            allow_pause=False,
            allow_renewal=True,
        ))
        self.assertTrue(plan.auto_close_at_end)
        self.assertTrue(plan.allow_early_close)
        self.assertFalse(plan.allow_pause)
        self.assertTrue(plan.allow_renewal)

    def test_staff_can_read_but_not_modify_plans(self):
        plan = self.env['subscribo.plan'].create(self._values())
        staff = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'SUBSCRIBO Plan Staff',
            'login': 'subscribo.plan.staff@example.com',
            'email': 'subscribo.plan.staff@example.com',
            'group_ids': [Command.set([
                self.env.ref('subscribo.group_subscribo_staff').id,
            ])],
        })
        plan_as_staff = plan.with_user(staff)
        self.assertEqual(plan_as_staff.name, plan.name)
        with self.assertRaises(AccessError):
            plan_as_staff.write({'price': 200.0})
        with self.assertRaises(AccessError):
            self.env['subscribo.plan'].with_user(staff).create(self._values(
                name='Unauthorized Plan',
            ))

    def test_admin_can_create_and_update_plan(self):
        admin = self.env.ref('base.user_admin')
        plan = self.env['subscribo.plan'].with_user(admin).create(self._values())
        plan.with_user(admin).write({'allow_pause': True})
        self.assertTrue(plan.allow_pause)
