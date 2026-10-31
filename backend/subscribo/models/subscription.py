from dateutil.relativedelta import relativedelta
from odoo import Command, SUPERUSER_ID, _, api, fields, models
from odoo.exceptions import AccessError, UserError, ValidationError


class Subscription(models.Model):
    _name = 'subscribo.subscription'
    _description = 'SUBSCRIBO Subscription'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _order = 'id desc'
    _check_company_auto = True

    _sale_order_unique = models.Constraint(
        'UNIQUE(sale_order_id)',
        'A sales quotation can only belong to one subscription.',
    )
    _number_unique = models.Constraint(
        'UNIQUE(name)',
        'Subscription numbers must be unique.',
    )
    _renewal_source_unique = models.Constraint(
        'UNIQUE(renewed_from_id)',
        'A subscription can only have one direct renewal successor.',
    )

    name = fields.Char(required=True, readonly=True, copy=False, default='New', index=True, tracking=True)
    sale_order_id = fields.Many2one(
        'sale.order', required=True, readonly=True, copy=False, ondelete='restrict',
        check_company=True, index=True, tracking=True,
        groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff',
    )
    company_id = fields.Many2one(
        'res.company', required=True, default=lambda self: self.env.company,
        index=True, tracking=True,
        groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff',
    )
    partner_id = fields.Many2one(
        'res.partner', required=True, readonly=True, ondelete='restrict',
        check_company=True, index=True, tracking=True,
        groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff',
    )
    plan_id = fields.Many2one(
        'subscribo.plan', required=True, readonly=True, ondelete='restrict',
        index=True, tracking=True,
        groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff',
    )
    quantity = fields.Float(required=True, readonly=True, digits='Product Unit of Measure', tracking=True)
    start_date = fields.Date(required=True, readonly=True, index=True, tracking=True)
    expiry_date = fields.Date(required=True, readonly=True, index=True, tracking=True)
    currency_id = fields.Many2one(related='sale_order_id.currency_id', store=True, readonly=True,
                                  groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff')
    payment_term_id = fields.Many2one(related='sale_order_id.payment_term_id', store=True, readonly=True,
                                      groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff')
    order_line_ids = fields.One2many(related='sale_order_id.order_line', readonly=True,
                                    groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff')
    amount_untaxed = fields.Monetary(related='sale_order_id.amount_untaxed', currency_field='currency_id', readonly=True,
                                     groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff')
    amount_tax = fields.Monetary(related='sale_order_id.amount_tax', currency_field='currency_id', readonly=True,
                                 groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff')
    amount_total = fields.Monetary(related='sale_order_id.amount_total', currency_field='currency_id', readonly=True,
                                   groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff')
    state = fields.Selection(
        [
            ('draft', 'Draft'),
            ('quotation', 'Quotation'),
            ('confirmed', 'Confirmed'),
            ('active', 'Active'),
            ('closed', 'Closed'),
        ], required=True, default='draft', index=True, tracking=True, copy=False,
    )
    is_paused = fields.Boolean(default=False, readonly=True, tracking=True)
    pause_started_at = fields.Datetime(readonly=True, copy=False)
    renewed_from_id = fields.Many2one('subscribo.subscription', readonly=True, copy=False, ondelete='restrict', index=True,
                                      groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff')
    renewal_ids = fields.One2many('subscribo.subscription', 'renewed_from_id', readonly=True,
                                  groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff')
    closed_at = fields.Datetime(readonly=True, copy=False)
    event_ids = fields.One2many('subscribo.subscription.event', 'subscription_id', readonly=True,
                                groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff')
    addon_ids = fields.One2many('subscribo.subscription.addon', 'subscription_id', readonly=True,
                                groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff')
    invoice_ids = fields.One2many(
        'account.move', 'subscribo_subscription_id', readonly=True,
        groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff',
    )
    invoice_count = fields.Integer(
        string='Invoices Count',
        compute='_compute_invoice_count',
        groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff',
    )
    last_invoice_date = fields.Date(readonly=True, copy=False)
    next_invoice_date = fields.Date(index=True, copy=False, tracking=True)
    billing_period_start = fields.Date(readonly=True, copy=False)
    billing_period_end = fields.Date(readonly=True, copy=False)
    billing_status = fields.Selection(
        [
            ('to_invoice', 'To Invoice'),
            ('invoiced', 'Invoiced'),
            ('paused', 'Paused'),
            ('closed', 'Closed'),
            ('expired', 'Expired'),
        ],
        string='Billing Status',
        compute='_compute_billing_status',
        store=True,
        index=True,
    )

    @api.depends('invoice_ids')
    def _compute_invoice_count(self):
        for sub in self:
            sub.invoice_count = len(sub.invoice_ids)

    @api.model
    def _calculate_billing_cycle(self, start_date, billing_period):
        """Calculate (period_start, period_end, next_billing_date) given a start date and billing period."""
        if not start_date or not billing_period:
            return None, None, None
        start_dt = fields.Date.to_date(start_date)
        if billing_period == 'daily':
            next_date = start_dt + relativedelta(days=1)
            period_end = start_dt
        elif billing_period == 'weekly':
            next_date = start_dt + relativedelta(weeks=1)
            period_end = next_date - relativedelta(days=1)
        elif billing_period == 'monthly':
            next_date = start_dt + relativedelta(months=1)
            period_end = next_date - relativedelta(days=1)
        elif billing_period == 'yearly':
            next_date = start_dt + relativedelta(years=1)
            period_end = next_date - relativedelta(days=1)
        else:
            next_date = start_dt + relativedelta(months=1)
            period_end = next_date - relativedelta(days=1)
        return start_dt, period_end, next_date

    @api.depends('state', 'is_paused', 'next_invoice_date', 'expiry_date')
    def _compute_billing_status(self):
        today = fields.Date.context_today(self)
        for sub in self:
            if sub.state == 'closed':
                sub.billing_status = 'closed'
            elif sub.is_paused:
                sub.billing_status = 'paused'
            elif sub.state != 'active':
                sub.billing_status = 'to_invoice' if sub.state in ('draft', 'quotation', 'confirmed') else 'closed'
            elif sub.expiry_date and sub.next_invoice_date and sub.next_invoice_date > sub.expiry_date:
                sub.billing_status = 'expired'
            elif sub.next_invoice_date and sub.next_invoice_date <= today:
                sub.billing_status = 'to_invoice'
            else:
                sub.billing_status = 'invoiced'

    @api.model_create_multi
    def create(self, vals_list):
        if not self.env.su:
            raise AccessError(_('Subscriptions can only be created by the validated quotation workflow.'))
        for values in vals_list:
            order = self.env['sale.order'].browse(values.get('sale_order_id')).exists()
            if not order or not order.subscribo_is_subscription:
                raise ValidationError(_('A subscription must be linked to a SUBSCRIBO quotation.'))
            if values.get('partner_id') != order.partner_id.id:
                raise ValidationError(_('The subscription customer must match the quotation customer.'))
            if values.get('plan_id') != order.subscribo_plan_id.id:
                raise ValidationError(_('The subscription plan must match the quotation plan.'))
            if values.get('quantity') != order.subscribo_quantity:
                raise ValidationError(_('Subscription quantity must match the quotation.'))
            if values.get('start_date') != order.subscribo_start_date or values.get('expiry_date') != order.subscribo_expiry_date:
                raise ValidationError(_('Subscription dates must match the quotation.'))
            p_start, p_end, n_date = self._calculate_billing_cycle(
                values.get('start_date'),
                order.subscribo_plan_id.billing_period if order.subscribo_plan_id else 'monthly'
            )
            if 'billing_period_start' not in values:
                values['billing_period_start'] = p_start
            if 'billing_period_end' not in values:
                values['billing_period_end'] = p_end
            if 'next_invoice_date' not in values:
                values['next_invoice_date'] = p_start
            if values.get('name', 'New') == 'New':
                values['name'] = self.env['ir.sequence'].next_by_code('subscribo.subscription') or 'New'
        records = super().create(vals_list)
        for subscription in records:
            actor_uid = self.env.context.get('_subscribo_actor_uid') or subscription.sale_order_id.create_uid.id
            subscription._log_event('created', actor_id=actor_uid)
            source = subscription.renewed_from_id
            if source:
                source._log_event('renewal_created', subscription.name, actor_id=actor_uid)
        return records

    def _subscribo_ensure_addons(self):
        for subscription in self.sudo():
            lines = subscription.sale_order_id.order_line.filtered(
                lambda line: line.product_id and not line.display_type and not line.subscribo_plan_line
            )
            existing_line_ids = set(subscription.addon_ids.mapped('sale_order_line_id').ids)
            new_lines = lines.filtered(lambda line: line.id not in existing_line_ids)
            if new_lines:
                self.env['subscribo.subscription.addon'].sudo().create([
                    {
                        'subscription_id': subscription.id,
                        'sale_order_line_id': line.id,
                        'enabled': not line.is_optional,
                    }
                    for line in new_lines
                ])

    def write(self, values):
        protected = {
            'name', 'sale_order_id', 'company_id', 'partner_id', 'plan_id', 'quantity',
            'start_date', 'expiry_date', 'state', 'is_paused', 'pause_started_at',
            'renewed_from_id', 'closed_at',
        }
        if protected.intersection(values) and not self.env.su:
            raise AccessError(_('Subscription fields can only be changed through validated workflow actions.'))
        return super().write(values)

    def unlink(self):
        raise UserError(_('Subscriptions are retained for audit and cannot be deleted.'))

    def _check_actor(self, allow_customer=False):
        if self.env.su:
            return 'internal'
        user = self.env.user
        if user.has_group('subscribo.group_subscribo_admin') or user.has_group('subscribo.group_subscribo_staff'):
            return 'internal'
        if allow_customer and user.has_group('subscribo.group_subscribo_customer'):
            for subscription in self:
                if subscription.sudo().partner_id.commercial_partner_id != user.partner_id.commercial_partner_id:
                    raise AccessError(_('You can only manage your own subscription.'))
            return 'customer'
        raise AccessError(_('You are not allowed to perform this subscription operation.'))

    def _subscribo_set_state(self, state, event_type):
        for subscription in self:
            allowed = {
                'draft': {'quotation'},
                'quotation': {'confirmed'},
                'confirmed': {'active', 'closed'},
                'active': {'closed'},
                'closed': set(),
            }
            if state not in allowed.get(subscription.state, set()):
                raise UserError(_('Invalid subscription lifecycle transition.'))
            subscription.sudo().write({'state': state})
            if state == 'closed':
                subscription.sudo().write({'closed_at': fields.Datetime.now()})
            subscription._log_event(event_type)

    def _log_event(self, event_type, details=None, actor_id=None):
        for subscription in self:
            self.env['subscribo.subscription.event'].sudo().create({
                'subscription_id': subscription.id,
                'event_type': event_type,
                'user_id': actor_id or self.env.context.get('_subscribo_actor_uid') or self.env.uid,
                'details': details or False,
            })

    def action_activate(self):
        self._check_actor()
        today = fields.Date.context_today(self)
        for subscription in self:
            if subscription.state != 'confirmed' or subscription.start_date > today:
                raise UserError(_('Only confirmed subscriptions whose start date has arrived can be activated.'))
            if not subscription.next_invoice_date:
                p_start, p_end, cycle_next = self._calculate_billing_cycle(
                    subscription.start_date,
                    subscription.plan_id.billing_period if subscription.plan_id else 'monthly'
                )
                subscription.sudo().write({
                    'billing_period_start': p_start,
                    'billing_period_end': p_end,
                    'next_invoice_date': p_start,
                })
        self._subscribo_set_state('active', 'activated')
        return True

    def action_close(self, reason=None):
        actor = self._check_actor(allow_customer=True)
        today = fields.Date.context_today(self)
        for subscription in self:
            if subscription.state not in ('confirmed', 'active'):
                raise UserError(_('Only confirmed or active subscriptions can be closed.'))
            if today <= subscription.expiry_date and not subscription.sudo().plan_id.allow_early_close:
                raise UserError(_('This plan does not allow early closure.'))
            if actor == 'customer' and not subscription.sudo().plan_id.allow_early_close and today <= subscription.expiry_date:
                raise AccessError(_('Your plan does not allow early closure.'))
        self._subscribo_set_state('closed', 'closed')
        if reason:
            self._log_event('closure_reason', reason)
        return True

    @api.model
    def _cron_close_expired_subscriptions(self):
        today = fields.Date.today()
        expired = self.sudo().search([
            ('state', 'in', ('confirmed', 'active')),
            ('expiry_date', '<', today),
            ('plan_id.auto_close_at_end', '=', True),
        ])
        for subscription in expired:
            subscription._subscribo_set_state('closed', 'auto_closed')
        return len(expired)

    def _generate_recurring_invoice(self):
        self.ensure_one()
        subscription = self.sudo()
        if subscription.state != 'active' or subscription.is_paused:
            return False
        if subscription.expiry_date and subscription.next_invoice_date and subscription.next_invoice_date > subscription.expiry_date:
            return False

        today = fields.Date.context_today(self)
        p_start = subscription.billing_period_start or subscription.start_date
        p_end = subscription.billing_period_end or subscription.expiry_date

        # Idempotency / Duplicate Prevention Check
        existing = self.env['account.move'].sudo().search([
            ('subscribo_subscription_id', '=', subscription.id),
            ('subscribo_billing_start', '=', p_start),
            ('state', '!=', 'cancel'),
        ], limit=1)
        if existing:
            # Cycle was already invoiced! Advance to next cycle without duplicating
            cycle_start, next_p_end, next_inv_date = self._calculate_billing_cycle(subscription.next_invoice_date or today, subscription.plan_id.billing_period)
            subscription.write({
                'last_invoice_date': today,
                'billing_period_start': subscription.next_invoice_date,
                'billing_period_end': next_p_end,
                'next_invoice_date': next_inv_date,
            })
            return existing

        # Prepare Invoice Lines
        invoice_lines = []

        # 1. Main Plan Service Line
        order = subscription.sale_order_id
        plan_product = subscription.plan_id.service_product_id
        if not plan_product and order:
            match_line = order.order_line.filtered(lambda l: l.price_unit == subscription.plan_id.price)
            if match_line:
                plan_product = match_line[0].product_id

        if not plan_product:
            plan_product = self.env['product.product'].search([('sale_ok', '=', True), ('type', '=', 'service')], limit=1)

        # Determine taxes for plan line
        order_plan_line = order.order_line.filtered(lambda l: l.product_id == plan_product) if order else False
        plan_taxes = order_plan_line[0].tax_ids if order_plan_line else plan_product.taxes_id

        plan_desc = f"{subscription.plan_id.name} ({p_start} to {p_end})"
        invoice_lines.append(Command.create({
            'product_id': plan_product.id,
            'name': plan_desc,
            'quantity': subscription.quantity,
            'price_unit': subscription.plan_id.price,
            'tax_ids': [Command.set(plan_taxes.ids)] if plan_taxes else False,
        }))

        # 2. Active Add-on Lines
        for addon in subscription.addon_ids.filtered('is_active'):
            addon_product = addon.product_id
            addon_desc = f"Add-on: {addon.name or addon_product.display_name} ({p_start} to {p_end})"
            addon_taxes = addon.sale_order_line_id.tax_ids if addon.sale_order_line_id and addon.sale_order_line_id.tax_ids else addon_product.taxes_id
            invoice_lines.append(Command.create({
                'product_id': addon_product.id,
                'name': addon_desc,
                'quantity': addon.quantity or 1.0,
                'price_unit': addon.price_unit or (addon.sale_order_line_id.price_unit if addon.sale_order_line_id else 0.0),
                'tax_ids': [Command.set(addon_taxes.ids)] if addon_taxes else False,
            }))

        # 3. Create Account Move (Customer Invoice)
        move_vals = {
            'move_type': 'out_invoice',
            'partner_id': subscription.partner_id.id,
            'currency_id': subscription.currency_id.id,
            'invoice_date': today,
            'invoice_payment_term_id': subscription.payment_term_id.id if subscription.payment_term_id else False,
            'subscribo_subscription_id': subscription.id,
            'subscribo_billing_start': p_start,
            'subscribo_billing_end': p_end,
            'subscribo_is_recurring': True,
            'invoice_origin': f"{subscription.name} - {subscription.plan_id.name}",
            'company_id': subscription.company_id.id,
            'invoice_line_ids': invoice_lines,
        }

        move = self.env['account.move'].sudo().create(move_vals)

        # 4. Advance Billing Dates
        cycle_start, next_p_end, next_inv_date = self._calculate_billing_cycle(subscription.next_invoice_date or today, subscription.plan_id.billing_period)
        subscription.write({
            'last_invoice_date': today,
            'billing_period_start': subscription.next_invoice_date,
            'billing_period_end': next_p_end,
            'next_invoice_date': next_inv_date,
        })

        # 5. Log Audit Event
        currency_sym = subscription.currency_id.symbol or subscription.currency_id.name or '₹'
        subscription._log_event(
            'invoice_generated',
            f"Generated recurring invoice {move.name or 'Draft'} for {p_start} to {p_end} ({currency_sym} {move.amount_total:.2f})"
        )

        return move

    def action_generate_invoice(self):
        self._check_actor()
        self.ensure_one()
        if self.state != 'active':
            raise UserError(_('Only active subscriptions can generate invoices.'))
        if self.is_paused:
            raise UserError(_('Cannot generate invoices for paused subscriptions.'))
        invoice = self._generate_recurring_invoice()
        if not invoice:
            raise UserError(_('No invoice was generated. Check subscription dates or existing invoices.'))
        return {
            'type': 'ir.actions.act_window',
            'name': _('Customer Invoice'),
            'res_model': 'account.move',
            'view_mode': 'form',
            'res_id': invoice.id,
            'target': 'current',
        }

    def action_view_invoices(self):
        self._check_actor()
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': _('Invoices'),
            'res_model': 'account.move',
            'view_mode': 'list,form',
            'domain': [('subscribo_subscription_id', '=', self.id)],
            'context': {'default_move_type': 'out_invoice', 'default_subscribo_subscription_id': self.id},
        }

    @api.model
    def _cron_recurring_invoicing(self):
        """Batch scheduled action to generate due recurring invoices for all active subscriptions."""
        today = fields.Date.context_today(self)
        due_subscriptions = self.sudo().search([
            ('state', '=', 'active'),
            ('is_paused', '=', False),
            ('next_invoice_date', '<=', today),
        ])
        created_invoices = self.env['account.move']
        for sub in due_subscriptions:
            if sub.expiry_date and sub.next_invoice_date and sub.next_invoice_date > sub.expiry_date:
                continue
            try:
                with self.env.cr.savepoint():
                    inv = sub._generate_recurring_invoice()
                    if inv:
                        created_invoices |= inv
            except Exception as e:
                sub._log_event('billing_failed', f"Error generating recurring invoice: {str(e)}")
        return len(created_invoices)

    def action_pause(self, reason=None):
        self._check_actor(allow_customer=True)
        for subscription in self:
            if subscription.state != 'active' or subscription.is_paused:
                raise UserError(_('Only an unpaused active subscription can be paused.'))
            if not subscription.sudo().plan_id.allow_pause:
                raise UserError(_('This plan does not allow pausing.'))
        for subscription in self:
            subscription.sudo().write({'is_paused': True, 'pause_started_at': fields.Datetime.now()})
            subscription._log_event('paused', reason)
        return True

    def action_resume(self, reason=None):
        self._check_actor(allow_customer=True)
        for subscription in self:
            if subscription.state != 'active' or not subscription.is_paused:
                raise UserError(_('Only a paused active subscription can be resumed.'))
        for subscription in self:
            subscription.sudo().write({'is_paused': False, 'pause_started_at': False})
            subscription._log_event('resumed', reason)
        return True

    def action_renew(self, start_date, expiry_date):
        actor = self._check_actor(allow_customer=True)
        self.ensure_one()
        subscription = self.sudo()
        try:
            start_date = fields.Date.to_date(start_date)
            expiry_date = fields.Date.to_date(expiry_date)
        except (TypeError, ValueError):
            raise ValidationError(_('Renewal dates must be valid dates.'))
        if not start_date or not expiry_date or expiry_date < start_date:
            raise ValidationError(_('Renewal requires valid start and expiry dates.'))
        if subscription.state not in ('active', 'closed') or subscription.is_paused:
            raise UserError(_('Only active or closed, unpaused subscriptions can be renewed.'))
        if not subscription.plan_id.allow_renewal:
            raise UserError(_('This plan does not allow renewal.'))
        if subscription.renewal_ids:
            raise UserError(_('A renewal quotation already exists for this subscription.'))
        if start_date <= subscription.expiry_date:
            raise ValidationError(_('A renewal must start after the current subscription expiry date.'))
        subscription.plan_id.validate_request(subscription.quantity, start_date)

        order_lines = []
        for addon in subscription.addon_ids.filtered('enabled'):
            line = addon.sale_order_line_id
            order_lines.append(Command.create({
                'product_id': line.product_id.id,
                'product_uom_qty': line.product_uom_qty,
                'product_uom_id': line.product_uom_id.id,
                'name': line.name,
            }))
        order = self.env['sale.order'].sudo().with_context(
            _subscribo_actor_uid=self.env.uid,
            _subscribo_renewal_workflow=True,
        ).create({
            'partner_id': subscription.partner_id.id,
            'company_id': subscription.company_id.id,
            'sale_order_template_id': subscription.sale_order_id.sale_order_template_id.id,
            'subscribo_is_subscription': True,
            'subscribo_plan_id': subscription.plan_id.id,
            'subscribo_quantity': subscription.quantity,
            'subscribo_start_date': start_date,
            'subscribo_expiry_date': expiry_date,
            'subscribo_renewed_from_id': subscription.id,
            'require_signature': True,
            'require_payment': False,
            'order_line': order_lines,
        })
        return {
            'type': 'ir.actions.act_window',
            'name': _('Renewal Quotation'),
            'res_model': 'sale.order',
            'view_mode': 'form',
            'res_id': order.id,
            'target': 'current' if actor == 'internal' else 'new',
        }

    def action_open_renewal_wizard(self):
        self.ensure_one()
        self._check_actor()
        if self.state not in ('active', 'closed') or self.is_paused:
            raise UserError(_('Only active or closed, unpaused subscriptions can be renewed.'))
        if not self.sudo().plan_id.allow_renewal:
            raise UserError(_('This plan does not allow renewal.'))
        view = self.env.ref('subscribo.view_subscribo_renewal_wizard_form', raise_if_not_found=False)
        return {
            'type': 'ir.actions.act_window',
            'name': _('Renew Subscription'),
            'res_model': 'subscribo.renewal.wizard',
            'view_mode': 'form',
            'view_id': view.id if view else False,
            'target': 'new',
            'context': {'default_subscription_id': self.id},
        }

    def action_open_quotation(self):
        self.ensure_one()
        self._check_actor()
        return {
            'type': 'ir.actions.act_window',
            'name': _('SUBSCRIBO Quotation'),
            'res_model': 'sale.order',
            'view_mode': 'form',
            'res_id': self.sale_order_id.id,
            'target': 'current',
        }

    def action_request_new_addon(self, product_id, quantity=1.0):
        self._check_actor(allow_customer=True)
        self.ensure_one()
        if self.state != 'active' or self.is_paused:
            raise UserError(_('Add-ons can only be requested on an unpaused active subscription.'))
        product = self.env['product.product'].browse(product_id).exists()
        if not product or not product.sale_ok or product == self.plan_id.service_product_id:
            raise ValidationError(_('Select a valid saleable add-on product.'))
        order = self.env['sale.order'].sudo().with_context(
            _subscribo_actor_uid=self.env.uid,
            _subscribo_change_quote=True,
        ).create({
            'partner_id': self.partner_id.id,
            'company_id': self.company_id.id,
            'subscribo_is_subscription': True,
            'subscribo_is_change_quote': True,
            'subscribo_subscription_id': self.id,
            'require_signature': True,
            'require_payment': False,
            'order_line': [Command.create({
                'product_id': product.id,
                'product_uom_qty': float(quantity) if float(quantity) > 0 else 1.0,
                'product_uom_id': product.uom_id.id,
                'name': product.display_name,
            })],
        })
        self._log_event('addon_quote_created', f"{product.display_name} ({order.name})")
        return order


class SubscriptionEvent(models.Model):
    _name = 'subscribo.subscription.event'
    _description = 'SUBSCRIBO Subscription Audit Event'
    _order = 'event_date desc, id desc'

    subscription_id = fields.Many2one('subscribo.subscription', required=True, ondelete='cascade', index=True)
    event_type = fields.Selection(
        [
            ('created', 'Created'),
            ('quotation_sent', 'Quotation Sent'),
            ('quotation_confirmed', 'Quotation Confirmed'),
            ('activated', 'Activated'),
            ('closed', 'Closed'),
            ('closure_reason', 'Closure Reason'),
            ('paused', 'Paused'),
            ('resumed', 'Resumed'),
            ('renewal_created', 'Renewal Created'),
            ('addon_quote_created', 'Add-on Change Quotation Created'),
            ('addon_enabled', 'Add-on Enabled'),
            ('addon_disabled', 'Add-on Disabled'),
            ('auto_closed', 'Automatically Closed'),
            ('invoice_generated', 'Invoice Generated'),
            ('billing_failed', 'Billing Failed'),
        ], required=True, index=True,
    )
    event_date = fields.Datetime(required=True, default=fields.Datetime.now, index=True)
    user_id = fields.Many2one('res.users', required=True, ondelete='restrict', default=lambda self: self.env.user)
    details = fields.Text()

    @api.model_create_multi
    def create(self, vals_list):
        if not self.env.su:
            raise AccessError(_('Subscription audit events can only be created by validated workflows.'))
        return super().create(vals_list)

    def write(self, values):
        raise AccessError(_('Subscription audit events are immutable.'))

    def unlink(self):
        raise AccessError(_('Subscription audit events are immutable.'))


class SubscriptionAddon(models.Model):
    _name = 'subscribo.subscription.addon'
    _description = 'SUBSCRIBO Subscription Add-on'
    _order = 'id'

    _sale_line_unique = models.Constraint(
        'UNIQUE(sale_order_line_id)',
        'A quotation line can only create one subscription add-on.',
    )

    subscription_id = fields.Many2one(
        'subscribo.subscription', required=True, readonly=True,
        ondelete='cascade', index=True,
    )
    sale_order_line_id = fields.Many2one(
        'sale.order.line', required=True, readonly=True,
        ondelete='restrict', index=True,
        groups='subscribo.group_subscribo_admin,subscribo.group_subscribo_staff',
    )
    product_id = fields.Many2one(
        related='sale_order_line_id.product_id', store=True, readonly=True,
    )
    name = fields.Char(related='product_id.name', string='Add-on Name', store=True, readonly=True)
    quantity = fields.Float(related='sale_order_line_id.product_uom_qty', store=True, readonly=True)
    price_unit = fields.Float(related='sale_order_line_id.price_unit', string='Unit Price', store=True, readonly=True)
    enabled = fields.Boolean(default=True, readonly=True, index=True)
    is_active = fields.Boolean(compute='_compute_is_active', store=True, index=True)
    enabled_at = fields.Datetime(readonly=True, copy=False)
    disabled_at = fields.Datetime(readonly=True, copy=False)
    pending_order_id = fields.Many2one(
        'sale.order', string='Pending Change Quotation', readonly=True, copy=False, ondelete='set null',
    )

    @api.depends('enabled', 'subscription_id.state', 'subscription_id.is_paused')
    def _compute_is_active(self):
        for addon in self:
            addon.is_active = bool(
                addon.enabled
                and addon.subscription_id.state == 'active'
                and not addon.subscription_id.is_paused
            )

    def _check_actor(self):
        return self.mapped('subscription_id')._check_actor(allow_customer=True)

    def write(self, values):
        if set(values) & {'subscription_id', 'sale_order_line_id', 'enabled', 'enabled_at', 'disabled_at', 'pending_order_id'} and not self.env.su:
            raise AccessError(_('Add-on selections can only be changed through validated actions.'))
        return super().write(values)

    def unlink(self):
        raise UserError(_('Subscription add-on history is retained and cannot be deleted.'))

    def action_request_enable(self):
        self._check_actor()
        self.ensure_one()
        subscription = self.subscription_id.sudo()
        if subscription.state != 'active' or subscription.is_paused:
            raise UserError(_('Add-ons can only be requested on an unpaused active subscription.'))
        if self.enabled:
            raise UserError(_('This add-on is already enabled.'))
        if self.sudo().pending_order_id and self.sudo().pending_order_id.state in ('draft', 'sent'):
            return self.sudo().pending_order_id

        order = self.env['sale.order'].sudo().with_context(
            _subscribo_actor_uid=self.env.uid,
            _subscribo_change_quote=True,
        ).create({
            'partner_id': subscription.partner_id.id,
            'company_id': subscription.company_id.id,
            'subscribo_is_subscription': True,
            'subscribo_is_change_quote': True,
            'subscribo_subscription_id': subscription.id,
            'subscribo_change_addon_id': self.id,
            'require_signature': True,
            'require_payment': False,
            'order_line': [Command.create({
                'product_id': self.sudo().product_id.id,
                'product_uom_qty': self.quantity or 1.0,
                'product_uom_id': self.sudo().product_id.uom_id.id,
                'name': self.sudo().product_id.display_name,
            })],
        })
        self.sudo().write({'pending_order_id': order.id})
        subscription._log_event('addon_quote_created', f"{self.sudo().product_id.display_name} ({order.name})")
        return order

    def action_enable(self, reason=None):
        actor = self._check_actor()
        if actor == 'customer':
            raise AccessError(_('Customers must request add-on activation through a change quotation.'))
        for addon in self:
            if addon.subscription_id.state != 'active' or addon.subscription_id.is_paused:
                raise UserError(_('Add-ons can only be enabled on an unpaused active subscription.'))
            if addon.enabled:
                raise UserError(_('This add-on is already enabled.'))
        for addon in self:
            addon.sudo().write({'enabled': True, 'enabled_at': fields.Datetime.now(), 'disabled_at': False, 'pending_order_id': False})
            addon.subscription_id._log_event('addon_enabled', addon.sudo().product_id.display_name)
        return True

    def action_disable(self, reason=None):
        self._check_actor()
        for addon in self:
            if addon.subscription_id.state != 'active' or addon.subscription_id.is_paused:
                raise UserError(_('Add-ons can only be disabled on an unpaused active subscription.'))
            if not addon.enabled:
                raise UserError(_('This add-on is already disabled.'))
        for addon in self:
            addon.sudo().write({'enabled': False, 'disabled_at': fields.Datetime.now(), 'pending_order_id': False})
            details = f"{addon.sudo().product_id.display_name} ({reason})" if reason else addon.sudo().product_id.display_name
            addon.subscription_id._log_event('addon_disabled', details)
        return True
