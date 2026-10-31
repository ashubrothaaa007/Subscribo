import math

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class SubscriptionPlan(models.Model):
    _name = 'subscribo.plan'
    _description = 'SUBSCRIBO Subscription Plan'
    _order = 'name, id'

    name = fields.Char(required=True, index=True)
    active = fields.Boolean(default=True)
    company_id = fields.Many2one(
        'res.company',
        required=True,
        default=lambda self: self.env.company,
        index=True,
        ondelete='restrict',
    )
    billing_period = fields.Selection(
        [
            ('daily', 'Daily'),
            ('weekly', 'Weekly'),
            ('monthly', 'Monthly'),
            ('yearly', 'Yearly'),
        ],
        required=True,
        default='monthly',
        index=True,
    )
    currency_id = fields.Many2one(
        'res.currency',
        required=True,
        default=lambda self: self.env.company.currency_id,
        ondelete='restrict',
    )
    price = fields.Monetary(required=True, currency_field='currency_id', default=0.0)
    service_product_id = fields.Many2one(
        'product.product',
        string='Plan Service Product',
        ondelete='restrict',
        check_company=True,
        domain=[('sale_ok', '=', True), ('type', '=', 'service')],
        help='Service product used for the separately priced plan line on quotations.',
    )
    minimum_quantity = fields.Float(
        string='Minimum Quantity',
        required=True,
        default=1.0,
        digits='Product Unit of Measure',
    )
    available_from = fields.Date(string='Available From', index=True)
    available_until = fields.Date(string='Available Until', index=True)

    auto_close_at_end = fields.Boolean(string='Automatically Close at End')
    allow_early_close = fields.Boolean(string='Allow Early Close')
    allow_pause = fields.Boolean(string='Allow Pause')
    allow_renewal = fields.Boolean(string='Allow Renewal')

    def validate_request(self, quantity, requested_date=None):
        """Validate a requested plan quantity and date against plan rules.

        Quotation and subscription entry points in later phases will call this
        shared server-side check; inclusive date boundaries are considered
        available.
        """
        self.ensure_one()
        if not self.active:
            raise ValidationError(_('This plan is not available.'))
        if isinstance(quantity, bool):
            raise ValidationError(_('Quantity must be a valid number.'))
        try:
            numeric_quantity = float(quantity)
        except (TypeError, ValueError):
            raise ValidationError(_('Quantity must be a valid number.'))
        if not math.isfinite(numeric_quantity):
            raise ValidationError(_('Quantity must be a finite number.'))
        if numeric_quantity <= 0:
            raise ValidationError(_('Quantity must be greater than zero.'))
        try:
            requested_date = fields.Date.to_date(requested_date) if requested_date else fields.Date.context_today(self)
        except (TypeError, ValueError):
            raise ValidationError(_('Requested date must be a valid date.'))
        if requested_date is None:
            raise ValidationError(_('Requested date must be a valid date.'))
        if self.available_from and self.available_until and self.available_until < self.available_from:
            raise ValidationError(_('This plan has an invalid availability date range.'))
        if not math.isfinite(self.minimum_quantity) or self.minimum_quantity <= 0:
            raise ValidationError(_('This plan has an invalid minimum quantity.'))
        if numeric_quantity < self.minimum_quantity:
            raise ValidationError(_('Quantity must be at least %(minimum)s for this plan.', minimum=self.minimum_quantity))
        if self.available_from and requested_date < self.available_from:
            raise ValidationError(_('This plan is not available yet.'))
        if self.available_until and requested_date > self.available_until:
            raise ValidationError(_('This plan is no longer available.'))
        return True

    @api.constrains('minimum_quantity')
    def _check_minimum_quantity(self):
        for plan in self:
            if not math.isfinite(plan.minimum_quantity) or plan.minimum_quantity <= 0:
                raise ValidationError(_('Minimum quantity must be a finite number greater than zero.'))

    @api.constrains('available_from', 'available_until')
    def _check_availability_dates(self):
        for plan in self:
            if plan.available_from and plan.available_until and plan.available_until < plan.available_from:
                raise ValidationError(_('Available Until must be on or after Available From.'))

    @api.constrains('service_product_id')
    def _check_service_product(self):
        for plan in self.filtered('service_product_id'):
            product = plan.service_product_id
            if not product.sale_ok or product.type != 'service':
                raise ValidationError(_('A plan service product must be a saleable service product.'))
