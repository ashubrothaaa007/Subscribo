from odoo import Command, fields
from odoo.exceptions import AccessError, UserError, ValidationError
import re

from odoo.tests import HttpCase, TransactionCase, tagged


@tagged('post_install', '-at_install')
class TestSubscriptionQuotationModel(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.admin = cls.env.ref('base.user_admin')
        cls.company = cls.env.company
        cls.tax = cls.env['account.tax'].sudo().create({
            'name': 'SUBSCRIBO Test Sales Tax 18%',
            'amount': 18.0,
            'amount_type': 'percent',
            'type_tax_use': 'sale',
            'company_id': cls.company.id,
        })
        cls.service_template = cls.env['product.template'].sudo().create({
            'name': 'SUBSCRIBO Plan Service',
            'type': 'service',
            'sale_ok': True,
            'taxes_id': [Command.set([cls.tax.id])],
        })
        cls.service_product = cls.service_template.product_variant_id
        cls.plan = cls.env['subscribo.plan'].sudo().create({
            'name': 'SUBSCRIBO Monthly Plan',
            'billing_period': 'monthly',
            'price': 999.0,
            'currency_id': cls.company.currency_id.id,
            'service_product_id': cls.service_product.id,
            'minimum_quantity': 2.0,
            'allow_early_close': True,
            'allow_pause': True,
            'allow_renewal': True,
        })

    def _customer(self, email):
        return self.env['res.partner'].sudo().create({
            'name': email.split('@')[0],
            'email': email,
            'company_type': 'person',
        })

    def _order(self, partner=None, **overrides):
        values = {
            'partner_id': (partner or self._customer('quote.customer@example.com')).id,
            'company_id': self.company.id,
            'subscribo_is_subscription': True,
            'subscribo_plan_id': self.plan.id,
            'subscribo_quantity': 3.0,
            'subscribo_start_date': fields.Date.today(),
            'subscribo_expiry_date': fields.Date.add(fields.Date.today(), days=30),
            'order_line': [],
        }
        values.update(overrides)
        return self.env['sale.order'].with_user(self.admin).create(values)

    def test_plan_service_line_uses_plan_price_and_subscription_quantity(self):
        order = self._order()
        plan_line = order.order_line.filtered('subscribo_plan_line')
        self.assertEqual(len(plan_line), 1)
        self.assertEqual(plan_line.product_id, self.service_product)
        self.assertEqual(plan_line.product_uom_qty, 3.0)
        self.assertEqual(plan_line.price_unit, 999.0)
        self.assertEqual(plan_line.price_subtotal, 2997.0)
        self.assertEqual(order.amount_tax, 539.46)
        self.assertEqual(order.amount_total, 3536.46)
        self.assertTrue(order.subscribo_subscription_id)
        self.assertEqual(order.subscribo_subscription_id.sale_order_id, order)

    def test_currency_conversion_on_quotation_line(self):
        curr_code = 'SBX'
        currency = self.env['res.currency'].search([('name', '=', curr_code)], limit=1)
        if not currency:
            currency = self.env['res.currency'].create({
                'name': curr_code,
                'symbol': '§',
                'rounding': 0.01,
            })
        self.env['res.currency.rate'].create({
            'currency_id': currency.id,
            'rate': 2.0,
            'name': fields.Date.today(),
            'company_id': self.company.id,
        })
        plan_fx = self.env['subscribo.plan'].sudo().create({
            'name': 'FX Plan',
            'service_product_id': self.service_product.id,
            'price': 200.0,
            'currency_id': currency.id,
            'minimum_quantity': 1.0,
        })
        order = self._order(
            subscribo_plan_id=plan_fx.id,
            subscribo_quantity=1.0,
        )
        plan_line = order.order_line.filtered('subscribo_plan_line')
        expected_price = currency._convert(
            200.0, order.currency_id, order.company_id, order.subscribo_start_date
        )
        self.assertEqual(plan_line.price_unit, expected_price)

    def test_quote_creation_rejects_below_minimum_missing_service_and_bad_dates(self):
        with self.assertRaises(ValidationError):
            self._order(subscribo_quantity=1.0)
        with self.assertRaises(ValidationError):
            self._order(subscribo_expiry_date=fields.Date.subtract(fields.Date.today(), days=1))
        self.plan.available_from = fields.Date.add(fields.Date.today(), days=2)
        with self.assertRaises(ValidationError):
            self._order(
                subscribo_start_date=fields.Date.today(),
                subscribo_expiry_date=fields.Date.add(fields.Date.today(), days=30),
            )
        self.plan.available_from = False
        plan_without_service = self.env['subscribo.plan'].sudo().create({
            'name': 'Plan Without Service Product',
            'price': 10.0,
            'currency_id': self.company.currency_id.id,
        })
        with self.assertRaises(ValidationError):
            self._order(subscribo_plan_id=plan_without_service.id)

    def test_variant_price_extra_is_in_separate_quotation_line(self):
        attribute = self.env['product.attribute'].sudo().create({
            'name': 'SUBSCRIBO Brand', 'create_variant': 'always',
        })
        base_value = self.env['product.attribute.value'].sudo().create({
            'name': 'Basic', 'attribute_id': attribute.id,
        })
        premium_value = self.env['product.attribute.value'].sudo().create({
            'name': 'Premium', 'attribute_id': attribute.id, 'default_extra_price': 560.0,
        })
        template = self.env['product.template'].sudo().create({
            'name': 'Variant Product', 'type': 'service', 'sale_ok': True, 'list_price': 100.0,
            'attribute_line_ids': [Command.create({
                'attribute_id': attribute.id,
                'value_ids': [Command.set([base_value.id, premium_value.id])],
            })],
        })
        variant = template.product_variant_ids.filtered(
            lambda product: premium_value in product.product_template_attribute_value_ids.mapped('product_attribute_value_id')
        )
        self.assertEqual(len(variant), 1)
        order = self._order(order_line=[Command.create({
            'product_id': variant.id, 'product_uom_qty': 1.0,
        })])
        line = order.order_line.filtered(lambda row: row.product_id == variant)
        self.assertEqual(line.price_unit, 660.0)
        self.assertFalse(line.subscribo_plan_line)
        self.assertEqual(line.price_subtotal, 660.0)

    def test_customer_and_staff_cannot_create_subscription_records_directly(self):
        customer = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'SUBSCRIBO Customer',
            'login': 'sub.quote.customer@example.com',
            'email': 'sub.quote.customer@example.com',
            'group_ids': [Command.set([self.env.ref('subscribo.group_subscribo_customer').id])],
        })
        staff = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'SUBSCRIBO Staff',
            'login': 'sub.quote.staff@example.com',
            'email': 'sub.quote.staff@example.com',
            'group_ids': [Command.set([self.env.ref('subscribo.group_subscribo_staff').id])],
        })
        with self.assertRaises(AccessError):
            self.env['subscribo.subscription'].with_user(customer).create({})
        with self.assertRaises(AccessError):
            self.env['subscribo.subscription'].with_user(staff).create({})

    def test_staff_record_rule_excludes_unrelated_sales_orders(self):
        unrelated = self.env['sale.order'].with_user(self.admin).create({
            'partner_id': self._customer('unrelated.sales@example.com').id,
            'company_id': self.company.id,
        })
        sub_order = self._order(self._customer('staff.sub.order@example.com'))
        staff = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'SUBSCRIBO Scoped Staff',
            'login': 'scoped.staff@example.com',
            'email': 'scoped.staff@example.com',
            'group_ids': [Command.set([self.env.ref('subscribo.group_subscribo_staff').id])],
        })
        self.assertFalse(self.env['sale.order'].with_user(staff).search([('id', '=', unrelated.id)]))
        with self.assertRaises(AccessError):
            unrelated.with_user(staff).read(['name'])
        self.assertTrue(self.env['sale.order'].with_user(staff).search([('id', '=', sub_order.id)]))
        self.assertEqual(sub_order.with_user(staff).partner_id.name, 'staff.sub.order')

    def test_admin_can_access_ordinary_and_subscribo_sales_orders(self):
        admin_user = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'SUBSCRIBO App Admin User',
            'login': 'subscribo.app.admin@example.com',
            'email': 'subscribo.app.admin@example.com',
            'group_ids': [Command.set([self.env.ref('subscribo.group_subscribo_admin').id])],
        })
        ordinary_order = self.env['sale.order'].with_user(self.admin).create({
            'partner_id': self._customer('ordinary.sales@example.com').id,
            'company_id': self.company.id,
        })
        subscription_order = self._order(self._customer('sub.order@example.com'))
        admin_orders = self.env['sale.order'].with_user(admin_user).search([
            ('id', 'in', (ordinary_order.id, subscription_order.id))
        ])
        self.assertIn(ordinary_order, admin_orders)
        self.assertIn(subscription_order, admin_orders)
        self.assertEqual(ordinary_order.with_user(admin_user).partner_id.name, 'ordinary.sales')
        self.assertEqual(subscription_order.with_user(admin_user).partner_id.name, 'sub.order')

    def test_subscription_lifecycle_pause_resume_close_and_audit(self):
        order = self._order()
        subscription = order.subscribo_subscription_id
        with self.assertRaises(UserError):
            subscription.action_activate()
        order.action_quotation_sent()
        self.assertEqual(subscription.state, 'quotation')
        with self.assertRaises(AccessError):
            order.action_confirm()
        order.sudo().action_subscribo_mark_customer_accepted()
        order.sudo().action_confirm()
        self.assertEqual(subscription.state, 'confirmed')
        subscription.action_activate()
        self.assertEqual(subscription.state, 'active')
        subscription.action_pause('customer request')
        self.assertTrue(subscription.is_paused)
        self.assertEqual(subscription.state, 'active')
        subscription.action_resume('resumed')
        self.assertFalse(subscription.is_paused)
        subscription.action_close('completed')
        self.assertEqual(subscription.state, 'closed')
        self.assertTrue(subscription.closed_at)
        self.assertTrue(subscription.event_ids.filtered(lambda event: event.event_type == 'paused'))
        self.assertTrue(subscription.event_ids.filtered(lambda event: event.event_type == 'resumed'))

    def test_subscription_state_and_audit_history_cannot_be_written_directly(self):
        subscription = self._order().subscribo_subscription_id
        with self.assertRaises(AccessError):
            subscription.write({'state': 'active'})
        event = subscription.event_ids[:1]
        with self.assertRaises(AccessError):
            event.write({'details': 'tampered'})

    def test_template_wizard_creates_separate_plan_and_product_lines(self):
        addon_template = self.env['product.template'].sudo().create({
            'name': 'SUBSCRIBO Quoted Add-on',
            'type': 'service',
            'sale_ok': True,
            'list_price': 250.0,
            'taxes_id': [Command.set([self.tax.id])],
        })
        addon = addon_template.product_variant_id
        template = self.env['sale.order.template'].with_user(self.admin).create({
            'name': 'SUBSCRIBO Standard Offer',
            'company_id': self.company.id,
            'number_of_days': 14,
            'subscribo_plan_id': self.plan.id,
            'sale_order_template_line_ids': [Command.create({
                'product_id': addon.id,
                'product_uom_qty': 2.0,
            })],
        })
        customer = self._customer('template.customer@example.com')
        wizard = self.env['subscribo.quote.wizard'].with_user(self.admin).create({
            'partner_id': customer.id,
            'plan_id': self.plan.id,
            'quantity': 3.0,
            'template_id': template.id,
            'company_id': self.company.id,
            'start_date': fields.Date.today(),
            'expiry_date': fields.Date.add(fields.Date.today(), days=365),
        })
        action = wizard.action_create_quotation()
        order = self.env['sale.order'].browse(action['res_id'])
        plan_line = order.order_line.filtered('subscribo_plan_line')
        addon_line = order.order_line.filtered(lambda line: line.product_id == addon)
        self.assertEqual(len(plan_line), 1)
        self.assertEqual((plan_line.product_uom_qty, plan_line.price_unit, plan_line.price_subtotal), (3.0, 999.0, 2997.0))
        self.assertEqual(len(addon_line), 1)
        self.assertEqual(addon_line.product_uom_qty, 2.0)
        self.assertEqual(order.validity_date, fields.Date.add(fields.Date.today(), days=14))
        self.assertTrue(order.require_signature)
        self.assertFalse(order.require_payment)
        self.assertEqual(order.subscribo_subscription_id.partner_id, customer)

    def _confirmed_order(self, partner=None, **overrides):
        order = self._order(partner=partner, **overrides)
        order.action_quotation_sent()
        order.sudo().action_subscribo_mark_customer_accepted()
        order.sudo().action_confirm()
        return order

    def test_auto_close_cron_respects_plan_policy_and_preserves_main_states(self):
        self.plan.auto_close_at_end = True
        order = self._confirmed_order(
            subscribo_start_date=fields.Date.subtract(fields.Date.today(), days=31),
            subscribo_expiry_date=fields.Date.subtract(fields.Date.today(), days=1),
        )
        subscription = order.subscribo_subscription_id
        self.assertEqual(subscription.state, 'confirmed')
        self.env['subscribo.subscription']._cron_close_expired_subscriptions()
        self.assertEqual(subscription.state, 'closed')
        self.assertEqual(subscription._fields['state'].selection, [
            ('draft', 'Draft'), ('quotation', 'Quotation'), ('confirmed', 'Confirmed'),
            ('active', 'Active'), ('closed', 'Closed'),
        ])
        self.assertTrue(subscription.event_ids.filtered(lambda event: event.event_type == 'auto_closed'))

    def test_disabled_plan_policies_block_actions_and_auto_close(self):
        self.plan.allow_early_close = False
        self.plan.allow_pause = False
        self.plan.allow_renewal = False
        self.plan.auto_close_at_end = False
        active_order = self._confirmed_order()
        active_subscription = active_order.subscribo_subscription_id
        active_subscription.action_activate()
        with self.assertRaises(UserError):
            active_subscription.action_close('too early')
        with self.assertRaises(UserError):
            active_subscription.action_pause()
        with self.assertRaises(UserError):
            active_subscription.action_renew(
                fields.Date.add(active_subscription.expiry_date, days=1),
                fields.Date.add(active_subscription.expiry_date, days=30),
            )
        expired_order = self._confirmed_order(
            subscribo_start_date=fields.Date.subtract(fields.Date.today(), days=31),
            subscribo_expiry_date=fields.Date.subtract(fields.Date.today(), days=1),
        )
        self.env['subscribo.subscription']._cron_close_expired_subscriptions()
        self.assertEqual(expired_order.subscribo_subscription_id.state, 'confirmed')

    def test_renewal_workflow_eligibility_and_successor_audit(self):
        self.plan.allow_renewal = True
        addon = self.env['product.template'].sudo().create({
            'name': 'Renewal Included Add-on', 'type': 'service', 'sale_ok': True,
        }).product_variant_id
        order = self._confirmed_order(order_line=[Command.create({
            'product_id': addon.id, 'product_uom_qty': 1.0,
        })])
        subscription = order.subscribo_subscription_id
        subscription.action_activate()
        new_start = fields.Date.add(subscription.expiry_date, days=1)
        new_expiry = fields.Date.add(new_start, days=30)
        action = subscription.action_renew(new_start, new_expiry)
        renewal_order = self.env['sale.order'].browse(action['res_id'])
        renewal = renewal_order.subscribo_subscription_id
        self.assertEqual(renewal.renewed_from_id, subscription)
        self.assertEqual(renewal_order.subscribo_plan_id, self.plan)
        self.assertEqual(renewal_order.subscribo_quantity, subscription.quantity)
        self.assertEqual(renewal_order.subscribo_start_date, new_start)
        self.assertTrue(renewal_order.order_line.filtered(lambda line: line.product_id == addon))
        self.assertTrue(subscription.event_ids.filtered(lambda event: event.event_type == 'renewal_created'))
        self.assertNotEqual(subscription.name, 'New')
        self.assertNotEqual(renewal.name, subscription.name)
        self.assertEqual(subscription.payment_term_id, order.payment_term_id)
        with self.assertRaises(UserError):
            subscription.action_renew(new_start, new_expiry)
        with self.assertRaises(AccessError):
            self._order(subscribo_renewed_from_id=subscription.id)

    def test_renewal_wizard_workflow_and_security(self):
        self.plan.allow_renewal = True
        order = self._confirmed_order()
        subscription = order.subscribo_subscription_id
        with self.assertRaises(UserError):
            subscription.action_open_renewal_wizard()
        subscription.action_activate()
        subscription.action_pause()
        with self.assertRaises(UserError):
            subscription.action_open_renewal_wizard()
        subscription.action_resume()
        action = subscription.with_user(self.admin).action_open_renewal_wizard()
        self.assertEqual(action['res_model'], 'subscribo.renewal.wizard')
        self.assertEqual(action['target'], 'new')
        self.assertTrue(action['view_id'])
        wizard = self.env['subscribo.renewal.wizard'].with_user(self.admin).with_context(
            action['context']
        ).create({
            'expiry_date': fields.Date.add(subscription.expiry_date, days=365),
        })
        self.assertEqual(wizard.subscription_id, subscription)
        self.assertEqual(wizard.start_date, fields.Date.add(subscription.expiry_date, days=1))
        renewal_action = wizard.action_create_renewal()
        renewal_order = self.env['sale.order'].browse(renewal_action['res_id'])
        self.assertEqual(renewal_order.subscribo_subscription_id.renewed_from_id, subscription)
        customer_user = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'Renewal Wizard Customer',
            'login': 'wizard.cust@example.com',
            'email': 'wizard.cust@example.com',
            'group_ids': [Command.set([self.env.ref('subscribo.group_subscribo_customer').id])],
        })
        with self.assertRaises(UserError):
            wizard.with_user(customer_user).action_create_renewal()

    def test_addons_are_created_from_final_quotation_lines_and_switch_with_audit(self):
        addon = self.env['product.template'].sudo().create({
            'name': 'SUBSCRIBO Optional Add-on', 'type': 'service', 'sale_ok': True,
            'taxes_id': [Command.set([self.tax.id])],
        }).product_variant_id
        partner = self._customer('addon.owner@example.com')
        order = self._confirmed_order(partner, order_line=[Command.create({
            'product_id': addon.id,
            'product_uom_qty': 2.0,
        })])
        subscription = order.subscribo_subscription_id
        subscription.action_activate()
        addon_record = subscription.addon_ids.filtered(lambda row: row.product_id == addon)
        self.assertEqual(len(addon_record), 1)
        addon_record.action_disable('customer request')
        self.assertFalse(addon_record.enabled)
        self.assertFalse(addon_record.is_active)
        addon_record.action_enable('reactivated')
        self.assertTrue(addon_record.enabled)
        self.assertTrue(addon_record.is_active)
        self.assertEqual(len(subscription.event_ids.filtered(lambda event: event.event_type == 'addon_disabled')), 1)
        self.assertEqual(len(subscription.event_ids.filtered(lambda event: event.event_type == 'addon_enabled')), 1)

    def test_addon_change_quotation_workflow_and_security(self):
        addon = self.env['product.template'].sudo().create({
            'name': 'SUBSCRIBO Pro Feature', 'type': 'service', 'sale_ok': True,
            'list_price': 150.0,
            'taxes_id': [Command.set([self.tax.id])],
        }).product_variant_id
        partner = self._customer('change.quote.owner@example.com')
        customer_user = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'Change Quote Owner',
            'login': 'change.quote.owner@example.com',
            'email': 'change.quote.owner@example.com',
            'partner_id': partner.id,
            'group_ids': [Command.set([self.env.ref('base.group_portal').id, self.env.ref('subscribo.group_subscribo_customer').id])],
        })
        order = self._confirmed_order(partner, order_line=[Command.create({
            'product_id': addon.id,
            'product_uom_qty': 1.0,
        })])
        subscription = order.subscribo_subscription_id
        subscription.action_activate()
        addon_record = subscription.addon_ids.filtered(lambda row: row.product_id == addon)
        self.assertEqual(len(addon_record), 1)
        self.assertTrue(addon_record.enabled)
        self.assertTrue(addon_record.is_active)

        # 1. Customer disables add-on
        addon_record.with_user(customer_user).action_disable('Temporarily not needed')
        self.assertFalse(addon_record.enabled)
        self.assertFalse(addon_record.is_active)
        self.assertTrue(addon_record.disabled_at)
        self.assertTrue(subscription.event_ids.filtered(lambda e: e.event_type == 'addon_disabled'))

        # 2. Customer cannot bypass quote to enable directly
        with self.assertRaises(AccessError):
            addon_record.with_user(customer_user).action_enable()

        # 3. Customer requests enable -> creates change quotation
        change_order = addon_record.with_user(customer_user).action_request_enable()
        self.assertTrue(change_order)
        self.assertTrue(change_order.subscribo_is_change_quote)
        self.assertEqual(addon_record.pending_order_id, change_order)
        self.assertFalse(addon_record.enabled)
        self.assertEqual(len(subscription.event_ids.filtered(lambda e: e.event_type == 'addon_quote_created')), 1)

        # 4. Duplicate request returns same order
        dup_order = addon_record.with_user(customer_user).action_request_enable()
        self.assertEqual(dup_order, change_order)

        # 5. Non-owner customer cannot request or accept
        other_partner = self._customer('other.change@example.com')
        other_user = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': 'Other Change Customer',
            'login': 'other.change@example.com',
            'email': 'other.change@example.com',
            'partner_id': other_partner.id,
            'group_ids': [Command.set([self.env.ref('base.group_portal').id, self.env.ref('subscribo.group_subscribo_customer').id])],
        })
        with self.assertRaises(AccessError):
            addon_record.with_user(other_user).action_request_enable()

        # 6. Customer accepts change quotation with signature
        change_order.sudo().action_subscribo_mark_customer_accepted()
        change_order.sudo().action_confirm()

        # 7. Add-on is now enabled and active; pending order cleared; event recorded
        self.assertTrue(addon_record.enabled)
        self.assertTrue(addon_record.is_active)
        self.assertTrue(addon_record.enabled_at)
        self.assertFalse(addon_record.pending_order_id)
        self.assertTrue(subscription.event_ids.filtered(lambda e: e.event_type == 'addon_enabled'))


@tagged('post_install', '-at_install')
class TestSubscriboPortalOwnership(HttpCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.company = cls.env.company
        cls.admin = cls.env.ref('base.user_admin')
        cls.plan_product = cls.env['product.template'].sudo().create({
            'name': 'Portal Plan Service', 'type': 'service', 'sale_ok': True,
        }).product_variant_id
        cls.addon_product = cls.env['product.template'].sudo().create({
            'name': 'Portal Add-on', 'type': 'service', 'sale_ok': True,
        }).product_variant_id
        cls.plan = cls.env['subscribo.plan'].sudo().create({
            'name': 'Portal Monthly Plan', 'price': 500, 'currency_id': cls.company.currency_id.id,
            'service_product_id': cls.plan_product.id, 'allow_early_close': True,
            'allow_pause': True, 'allow_renewal': True,
        })

    def _customer(self, email):
        partner = self.env['res.partner'].sudo().create({
            'name': email, 'email': email, 'company_type': 'person',
        })
        user = self.env['res.users'].sudo().with_context(no_reset_password=True).create({
            'name': email, 'login': email, 'email': email, 'partner_id': partner.id,
            'password': 'ValidPassword1!',
            'group_ids': [Command.set([self.env.ref('subscribo.group_subscribo_customer').id])],
        })
        return partner, user

    def _order(self, partner, with_addon=False):
        lines = [Command.create({'product_id': self.addon_product.id, 'product_uom_qty': 1})] if with_addon else []
        order = self.env['sale.order'].with_user(self.admin).create({
            'partner_id': partner.id,
            'company_id': self.company.id,
            'subscribo_is_subscription': True,
            'subscribo_plan_id': self.plan.id,
            'subscribo_quantity': 1,
            'subscribo_start_date': fields.Date.today(),
            'subscribo_expiry_date': fields.Date.add(fields.Date.today(), days=30),
            'order_line': lines,
        })
        return order

    def test_customer_portal_lists_and_opens_only_owned_subscriptions(self):
        owner_partner, owner = self._customer('portal.owner@example.com')
        other_partner, _other = self._customer('portal.other@example.com')
        own = self._order(owner_partner)
        foreign = self._order(other_partner)
        self.authenticate(owner.login, 'ValidPassword1!')
        response = self.url_open('/my/subscriptions')
        self.assertEqual(response.status_code, 200)
        self.assertIn(own.subscribo_subscription_id.name, response.text)
        self.assertNotIn(foreign.subscribo_subscription_id.name, response.text)
        own_response = self.url_open(f'/my/subscriptions/{own.subscribo_subscription_id.id}')
        self.assertEqual(own_response.status_code, 200)
        for model, record_ids, fields_to_read in (
            ('sale.order', [foreign.id], ['name']),
            ('sale.order.line', foreign.order_line.ids, ['product_id', 'price_unit']),
            ('subscribo.subscription', [own.subscribo_subscription_id.id], ['plan_id', 'amount_total']),
        ):
            result = self.url_open('/web/dataset/call_kw', json={
                'jsonrpc': '2.0', 'method': 'call', 'params': {
                    'model': model, 'method': 'read',
                    'args': [record_ids], 'kwargs': {'fields': fields_to_read},
                }, 'id': 1,
            }).json()
            self.assertIn('error', result, result)
        foreign_response = self.url_open(f'/my/subscriptions/{foreign.subscribo_subscription_id.id}')
        self.assertTrue(foreign_response.history)
        self.assertNotIn(foreign.subscribo_subscription_id.name, foreign_response.text)

    def test_customer_can_switch_owned_addon_through_csrf_protected_http_post(self):
        partner, user = self._customer('portal.addon@example.com')
        other_partner, other_user = self._customer('portal.addon.other@example.com')
        order = self._order(partner, with_addon=True)
        order.action_quotation_sent()
        order.sudo().action_subscribo_mark_customer_accepted()
        order.sudo().action_confirm()
        subscription = order.subscribo_subscription_id
        subscription.action_activate()
        addon = subscription.addon_ids.filtered(lambda row: row.product_id == self.addon_product)
        self.assertTrue(addon.enabled)
        other_order = self._order(other_partner)
        other_order.action_quotation_sent()
        other_order.sudo().action_subscribo_mark_customer_accepted()
        other_order.sudo().action_confirm()
        other_subscription = other_order.subscribo_subscription_id
        other_subscription.action_activate()
        self.authenticate(other_user.login, 'ValidPassword1!')
        other_page = self.url_open(f'/my/subscriptions/{other_subscription.id}')
        self.assertEqual(other_page.status_code, 200)
        other_token = re.search(r'name="csrf_token"\s+value="([^"]+)"', other_page.text)
        self.assertTrue(other_token)
        denied = self.url_open(
            f'/my/subscriptions/{other_subscription.id}/action/addon_disable',
            data={'csrf_token': other_token.group(1), 'addon_id': addon.id},
            cookies={'session_id': self.session.sid},
        )
        self.assertEqual(denied.status_code, 200)
        self.assertTrue(addon.enabled)
        denied_subscription_action = self.url_open(
            f'/my/subscriptions/{subscription.id}/action/pause',
            data={'csrf_token': other_token.group(1)},
            cookies={'session_id': self.session.sid},
        )
        self.assertEqual(denied_subscription_action.status_code, 200)
        self.assertFalse(subscription.is_paused)
        self.authenticate(user.login, 'ValidPassword1!')
        page = self.url_open(f'/my/subscriptions/{subscription.id}')
        self.assertEqual(page.status_code, 200, page.text[-800:])
        token = re.search(r'name="csrf_token"\s+value="([^"]+)"', page.text)
        self.assertTrue(token, 'Portal action must include a CSRF token.')
        response = self.url_open(
            f'/my/subscriptions/{subscription.id}/action/addon_disable',
            data={'csrf_token': token.group(1), 'addon_id': addon.id},
            cookies={'session_id': self.session.sid},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(addon.enabled)
        self.assertTrue(subscription.event_ids.filtered(lambda event: event.event_type == 'addon_disabled'))
        enable_response = self.url_open(
            f'/my/subscriptions/{subscription.id}/action/addon_enable',
            data={'csrf_token': token.group(1), 'addon_id': addon.id},
            cookies={'session_id': self.session.sid},
        )
        self.assertEqual(enable_response.status_code, 200)
        self.assertTrue(addon.pending_order_id)
        self.assertFalse(addon.enabled)
        self.assertTrue(subscription.event_ids.filtered(lambda event: event.event_type == 'addon_quote_created'))
        change_order = addon.pending_order_id
        change_order.sudo().action_subscribo_mark_customer_accepted()
        change_order.sudo().action_confirm()
        self.assertTrue(addon.enabled)
        self.assertTrue(addon.is_active)
        self.assertTrue(subscription.event_ids.filtered(lambda event: event.event_type == 'addon_enabled'))
        refreshed_page = self.url_open(f'/my/subscriptions/{subscription.id}')
        pause_token = re.search(r'name="csrf_token"\s+value="([^"]+)"', refreshed_page.text)
        self.assertTrue(pause_token)
        self.url_open(
            f'/my/subscriptions/{subscription.id}/action/pause',
            data={'csrf_token': pause_token.group(1)},
            cookies={'session_id': self.session.sid},
        )
        self.assertTrue(subscription.is_paused)
        paused_page = self.url_open(f'/my/subscriptions/{subscription.id}')
        resume_token = re.search(r'name="csrf_token"\s+value="([^"]+)"', paused_page.text)
        self.assertTrue(resume_token)
        self.url_open(
            f'/my/subscriptions/{subscription.id}/action/resume',
            data={'csrf_token': resume_token.group(1)},
            cookies={'session_id': self.session.sid},
        )
        self.assertFalse(subscription.is_paused)

    def test_customer_quote_acceptance_requires_owner_and_confirms_subscription(self):
        owner_partner, owner = self._customer('portal.quote.owner@example.com')
        other_partner, other = self._customer('portal.quote.other@example.com')
        order = self._order(owner_partner)
        token = order.sudo()._portal_ensure_token()
        self.authenticate(other.login, 'ValidPassword1!')
        denied = self.url_open(f'/my/orders/{order.id}/accept', json={
            'jsonrpc': '2.0', 'method': 'call', 'params': {
                'order_id': order.id, 'access_token': token, 'name': 'Other User',
                'signature': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p8sAAAAASUVORK5CYII=',
            }, 'id': 1,
        })
        self.assertIn('error', denied.json().get('result', {}))
        self.authenticate(owner.login, 'ValidPassword1!')
        accepted = self.url_open(f'/my/orders/{order.id}/accept', json={
            'jsonrpc': '2.0', 'method': 'call', 'params': {
                'order_id': order.id, 'access_token': token, 'name': 'Quote Owner',
                'signature': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p8sAAAAASUVORK5CYII=',
            }, 'id': 2,
        })
        self.assertNotIn('error', accepted.json())
        self.assertTrue(order.subscribo_customer_accepted)
        self.assertEqual(order.state, 'sale')
        self.assertEqual(order.subscribo_subscription_id.state, 'confirmed')

    def test_customer_can_request_only_an_eligible_own_renewal(self):
        partner, user = self._customer('portal.renewal@example.com')
        order = self._order(partner, with_addon=True)
        order.action_quotation_sent()
        order.sudo().action_subscribo_mark_customer_accepted()
        order.sudo().action_confirm()
        subscription = order.subscribo_subscription_id
        subscription.action_activate()
        self.authenticate(user.login, 'ValidPassword1!')
        page = self.url_open(f'/my/subscriptions/{subscription.id}')
        self.assertEqual(page.status_code, 200)
        token = re.search(r'name="csrf_token"\s+value="([^"]+)"', page.text)
        self.assertTrue(token)
        start = fields.Date.add(subscription.expiry_date, days=1)
        expiry = fields.Date.add(start, days=30)
        response = self.url_open(
            f'/my/subscriptions/{subscription.id}/action/renew',
            data={
                'csrf_token': token.group(1),
                'start_date': fields.Date.to_string(start),
                'expiry_date': fields.Date.to_string(expiry),
            },
            cookies={'session_id': self.session.sid},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('/my/orders/', response.url)
        renewal = subscription.renewal_ids
        self.assertEqual(len(renewal), 1)
        self.assertEqual(renewal.sale_order_id.subscribo_start_date, start)
        self.assertTrue(renewal.sale_order_id.order_line.filtered(
            lambda line: line.product_id == self.addon_product
        ))

