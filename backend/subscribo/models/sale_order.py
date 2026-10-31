from odoo import Command, _, api, fields, models
from odoo.exceptions import AccessError, UserError, ValidationError


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    subscribo_is_subscription = fields.Boolean(
        string='SUBSCRIBO Subscription Quote',
        default=False,
        copy=False,
        index=True,
    )
    subscribo_plan_id = fields.Many2one(
        'subscribo.plan',
        string='Subscription Plan',
        ondelete='restrict',
        check_company=True,
        copy=False,
        domain=[('active', '=', True)],
    )
    subscribo_quantity = fields.Float(
        string='Subscription Quantity',
        digits='Product Unit of Measure',
        default=1.0,
        copy=False,
    )
    subscribo_start_date = fields.Date(string='Subscription Start Date', copy=False)
    subscribo_expiry_date = fields.Date(string='Subscription Expiry Date', copy=False)
    subscribo_subscription_id = fields.Many2one(
        'subscribo.subscription',
        string='Subscription',
        readonly=True,
        copy=False,
        ondelete='restrict',
        index=True,
    )
    subscribo_customer_accepted = fields.Boolean(
        string='Customer Accepted SUBSCRIBO Quote',
        readonly=True,
        copy=False,
        groups='base.group_system',
    )
    subscribo_renewed_from_id = fields.Many2one(
        'subscribo.subscription', string='Renewed From', readonly=True,
        copy=False, ondelete='restrict', check_company=True, index=True,
    )
    subscribo_is_change_quote = fields.Boolean(
        string='SUBSCRIBO Change Quote',
        default=False,
        copy=False,
        index=True,
    )
    subscribo_change_addon_id = fields.Many2one(
        'subscribo.subscription.addon', string='Target Add-on',
        copy=False, ondelete='set null',
        groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff',
    )

    @api.onchange('sale_order_template_id')
    def _onchange_sale_order_template_id(self):
        result = super()._onchange_sale_order_template_id()
        for order in self:
            if order.sale_order_template_id.subscribo_plan_id:
                order.subscribo_plan_id = order.sale_order_template_id.subscribo_plan_id
                order.subscribo_is_subscription = True
        return result

    @api.onchange('subscribo_plan_id')
    def _onchange_subscribo_plan_id(self):
        for order in self:
            order.subscribo_is_subscription = bool(order.subscribo_plan_id)

    @api.model_create_multi
    def create(self, vals_list):
        for values in vals_list:
            if values.get('subscribo_is_subscription'):
                # Phase 2 accepts a quotation by customer signature, without an
                # online-payment prerequisite (payment handling is a later phase).
                values['require_signature'] = True
                values['require_payment'] = False
                if values.get('subscribo_is_change_quote'):
                    sub_id = values.get('subscribo_subscription_id')
                    if not sub_id:
                        raise ValidationError(_('A change quotation must be linked to a subscription.'))
                    subscription = self.env['subscribo.subscription'].sudo().browse(sub_id).exists()
                    if not subscription or subscription.state != 'active' or subscription.is_paused:
                        raise ValidationError(_('Change quotations can only be created for unpaused active subscriptions.'))
                    values.setdefault('subscribo_plan_id', subscription.plan_id.id)
                    values.setdefault('partner_id', subscription.partner_id.id)
                    values.setdefault('company_id', subscription.company_id.id)
                    values['subscribo_quantity'] = subscription.quantity
                    values['subscribo_start_date'] = fields.Date.today()
                    values['subscribo_expiry_date'] = subscription.expiry_date
                else:
                    if not values.get('subscribo_plan_id'):
                        raise ValidationError(_('Select a subscription plan for a SUBSCRIBO quotation.'))
                    plan = self.env['subscribo.plan'].browse(values['subscribo_plan_id']).exists()
                    if not plan or not plan.service_product_id:
                        raise ValidationError(_('The selected plan must have a plan service product.'))
                    if values.get('subscribo_renewed_from_id'):
                        if not self.env.context.get('_subscribo_renewal_workflow'):
                            raise AccessError(_('Renewal quotations must use the validated renewal workflow.'))
                        source = self.env['subscribo.subscription'].sudo().browse(
                            values['subscribo_renewed_from_id']
                        ).exists()
                        partner = self.env['res.partner'].browse(values.get('partner_id'))
                        if (
                            not source
                            or not source.plan_id.allow_renewal
                            or source.state not in ('active', 'closed')
                            or source.is_paused
                            or source.renewal_ids
                            or source.partner_id.commercial_partner_id != partner.commercial_partner_id
                            or values.get('subscribo_plan_id') != source.plan_id.id
                            or values.get('subscribo_quantity', 1.0) != source.quantity
                            or not values.get('subscribo_start_date')
                            or values['subscribo_start_date'] <= source.expiry_date
                        ):
                            raise ValidationError(_('The source subscription does not satisfy renewal eligibility rules.'))
                    plan.validate_request(
                        values.get('subscribo_quantity', 1.0),
                        values.get('subscribo_start_date'),
                    )
                    self._subscribo_validate_dates(values)
            elif values.get('subscribo_plan_id'):
                raise ValidationError(_('A SUBSCRIBO plan requires a SUBSCRIBO quotation.'))

        orders = super().create(vals_list)
        for order in orders.filtered('subscribo_is_subscription'):
            if order.subscribo_is_change_quote:
                continue
            if not order.subscribo_start_date or not order.subscribo_expiry_date:
                raise ValidationError(_('Set both subscription start and expiry dates.'))
            plan_product = order.subscribo_plan_id.service_product_id
            if order.order_line.filtered(lambda line: line.product_id == plan_product):
                raise ValidationError(_('The plan service product is generated automatically and cannot be duplicated.'))
            plan_unit_price = order.subscribo_plan_id.currency_id._convert(
                order.subscribo_plan_id.price,
                order.currency_id,
                order.company_id,
                order.subscribo_start_date,
            )
            if any(tax.price_include for tax in plan_product.taxes_id.filtered(lambda tax: tax.company_id == order.company_id)):
                raise ValidationError(_('The plan service product must use tax-exclusive sales taxes.'))
            self.env['sale.order.line'].sudo().create({
                'order_id': order.id,
                'sequence': 1,
                'product_id': plan_product.id,
                'name': order.subscribo_plan_id.name,
                'product_uom_qty': order.subscribo_quantity,
                'product_uom_id': plan_product.uom_id.id,
                'price_unit': plan_unit_price,
                'subscribo_plan_line': True,
            })
            subscription = self.env['subscribo.subscription'].sudo().with_context(
                _subscribo_actor_uid=self.env.context.get('_subscribo_actor_uid') or self.env.uid
            ).create({
                'sale_order_id': order.id,
                'partner_id': order.partner_id.id,
                'plan_id': order.subscribo_plan_id.id,
                'quantity': order.subscribo_quantity,
                'start_date': order.subscribo_start_date,
                'expiry_date': order.subscribo_expiry_date,
                'company_id': order.company_id.id,
                'renewed_from_id': order.subscribo_renewed_from_id.id,
            })
            order.sudo().write({'subscribo_subscription_id': subscription.id})
        return orders

    @staticmethod
    def _subscribo_validate_dates(values):
        start = values.get('subscribo_start_date')
        expiry = values.get('subscribo_expiry_date')
        if start and expiry and expiry < start:
            raise ValidationError(_('Subscription expiry date must be on or after its start date.'))

    def write(self, values):
        values = dict(values)
        protected_fields = {
            'subscribo_subscription_id',
            'subscribo_customer_accepted',
            'subscribo_renewed_from_id',
        }
        if protected_fields.intersection(values) and not self.env.su:
            raise AccessError(_('These SUBSCRIBO quotation fields can only be changed by the system workflow.'))

        if not self.env.su and self.filtered('subscribo_is_subscription'):
            if values.get('require_payment'):
                raise ValidationError(_('Online payment is not enabled for Phase 2 SUBSCRIBO quotations.'))
            if 'require_signature' in values and not values['require_signature']:
                raise ValidationError(_('Customer signature is required to accept a SUBSCRIBO quotation.'))

        subscribo_orders = self.filtered('subscribo_is_subscription')
        if subscribo_orders and not self.env.su:
            relevant_values = {
                key: value for key, value in values.items()
                if key in {
                    'partner_id', 'subscribo_plan_id', 'subscribo_quantity',
                    'subscribo_start_date', 'subscribo_expiry_date', 'sale_order_template_id',
                }
            }
            for order in subscribo_orders:
                if order.state != 'draft' and any(key in values for key in {
                    'partner_id', 'subscribo_plan_id', 'subscribo_quantity',
                    'subscribo_start_date', 'subscribo_expiry_date', 'sale_order_template_id',
                }):
                    raise UserError(_('Subscription quotation details cannot be changed after it is sent.'))
                candidate = {
                    'subscribo_start_date': values.get('subscribo_start_date', order.subscribo_start_date),
                    'subscribo_expiry_date': values.get('subscribo_expiry_date', order.subscribo_expiry_date),
                }
                self._subscribo_validate_dates(candidate)
                plan = self.env['subscribo.plan'].browse(
                    values.get('subscribo_plan_id', order.subscribo_plan_id.id)
                ).exists()
                if relevant_values and plan:
                    plan.validate_request(
                        values.get('subscribo_quantity', order.subscribo_quantity),
                        values.get('subscribo_start_date', order.subscribo_start_date),
                    )
        result = super().write(values)
        for order in subscribo_orders:
            if order.require_payment or not order.require_signature:
                order.sudo().write({'require_payment': False, 'require_signature': True})
            if order.subscribo_is_change_quote:
                continue
            plan_line = order.order_line.filtered('subscribo_plan_line')
            if plan_line:
                plan = order.subscribo_plan_id
                unit_price = plan.currency_id._convert(
                    plan.price, order.currency_id, order.company_id, order.subscribo_start_date
                )
                plan_line.sudo().write({
                    'product_id': plan.service_product_id.id,
                    'name': plan.name,
                    'product_uom_id': plan.service_product_id.uom_id.id,
                    'product_uom_qty': order.subscribo_quantity,
                    'price_unit': unit_price,
                })
                order.subscribo_subscription_id.sudo().write({
                    'partner_id': order.partner_id.id,
                    'plan_id': plan.id,
                    'quantity': order.subscribo_quantity,
                    'start_date': order.subscribo_start_date,
                    'expiry_date': order.subscribo_expiry_date,
                    'company_id': order.company_id.id,
                })
        return result

    def action_quotation_sent(self):
        result = super().action_quotation_sent()
        self.filtered(lambda o: not o.subscribo_is_change_quote).mapped(
            'subscribo_subscription_id'
        )._subscribo_set_state('quotation', 'quotation_sent')
        return result

    def action_confirm(self):
        subscribo_orders = self.filtered('subscribo_is_subscription')
        for order in subscribo_orders:
            if not order.subscribo_is_change_quote:
                order.subscribo_plan_id.validate_request(
                    order.subscribo_quantity, order.subscribo_start_date
                )
            if not order.subscribo_customer_accepted:
                raise AccessError(_('Customer acceptance is required before confirming this quotation.'))
        result = super().action_confirm()
        main_orders = subscribo_orders.filtered(lambda o: not o.subscribo_is_change_quote)
        main_orders.mapped('subscribo_subscription_id')._subscribo_set_state(
            'confirmed', 'quotation_confirmed'
        )
        main_orders.mapped('subscribo_subscription_id')._subscribo_ensure_addons()
        for change_order in subscribo_orders.filtered('subscribo_is_change_quote'):
            change_order._apply_change_quotation_acceptance()
        return result

    def _validate_order(self):
        subscribo_orders = self.filtered('subscribo_is_subscription')
        for order in subscribo_orders:
            if not order.signature or not order.signed_by:
                raise AccessError(_('A recorded customer signature is required to accept this quotation.'))
            order.sudo().write({'subscribo_customer_accepted': True})
        return super()._validate_order()

    def _apply_change_quotation_acceptance(self):
        self.ensure_one()
        subscription = self.subscribo_subscription_id
        if not subscription:
            return
        if self.subscribo_change_addon_id:
            addon = self.subscribo_change_addon_id
            addon.sudo().write({
                'enabled': True,
                'enabled_at': fields.Datetime.now(),
                'disabled_at': False,
                'pending_order_id': False,
            })
            subscription._log_event(
                'addon_enabled',
                _('%(product)s enabled via accepted change quote %(quote)s',
                  product=addon.sudo().product_id.display_name,
                  quote=self.name)
            )
        else:
            for line in self.order_line.filtered(lambda l: l.product_id and not l.display_type):
                addon = subscription.addon_ids.filtered(lambda a: a.product_id == line.product_id)
                if addon:
                    addon.sudo().write({
                        'enabled': True,
                        'enabled_at': fields.Datetime.now(),
                        'disabled_at': False,
                        'pending_order_id': False,
                    })
                else:
                    self.env['subscribo.subscription.addon'].sudo().create({
                        'subscription_id': subscription.id,
                        'sale_order_line_id': line.id,
                        'enabled': True,
                        'enabled_at': fields.Datetime.now(),
                    })
                subscription._log_event(
                    'addon_enabled',
                    _('%(product)s enabled via accepted change quote %(quote)s',
                      product=line.product_id.display_name,
                      quote=self.name)
                )

    def action_subscribo_mark_customer_accepted(self):
        """Internal server hook used only after portal ownership/signature checks."""
        if not self.env.su:
            raise AccessError(_('Only the verified customer acceptance workflow can mark a quote accepted.'))
        self.filtered('subscribo_is_subscription').write({'subscribo_customer_accepted': True})

    def action_open_subscribo_subscription(self):
        self.ensure_one()
        if not (
            self.env.user.has_group('subscribo.group_subscribo_admin')
            or self.env.user.has_group('subscribo.group_subscribo_staff')
        ):
            raise AccessError(_('Only SUBSCRIBO Admin or Staff can open internal subscription records.'))
        if not self.subscribo_subscription_id:
            raise UserError(_('This quotation is not linked to a subscription.'))
        return {
            'type': 'ir.actions.act_window',
            'name': _('Subscription'),
            'res_model': 'subscribo.subscription',
            'view_mode': 'form',
            'res_id': self.subscribo_subscription_id.id,
            'target': 'current',
        }


class SaleOrderLine(models.Model):
    _inherit = 'sale.order.line'

    subscribo_plan_line = fields.Boolean(readonly=True, copy=False, index=True)

    @api.model_create_multi
    def create(self, vals_list):
        if not self.env.su:
            for values in vals_list:
                order = self.env['sale.order'].browse(values.get('order_id')).exists()
                if values.get('subscribo_plan_line'):
                    raise AccessError(_('The plan line is generated by the SUBSCRIBO quote workflow.'))
                if order and order.subscribo_is_subscription and values.get('product_id') == order.subscribo_plan_id.service_product_id.id:
                    raise ValidationError(_('The plan service product cannot be duplicated as an additional line.'))
        return super().create(vals_list)

    def write(self, values):
        if not self.env.su and 'subscribo_plan_line' in values:
            raise AccessError(_('The plan line is generated by the SUBSCRIBO quote workflow.'))
        if not self.env.su and 'product_id' in values:
            plan_lines = self.filtered('subscribo_plan_line')
            if plan_lines:
                raise AccessError(_('The plan service product line cannot be replaced manually.'))
        return super().write(values)

